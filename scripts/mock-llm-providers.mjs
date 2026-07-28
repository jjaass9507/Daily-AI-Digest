// Mock LLM provider server for testing src/llm-providers.js without real API
// keys. Reproduces the SSE wire formats of Anthropic, OpenAI, and Gemini
// (including an event deliberately split across two separate `res.write()`
// calls, to exercise the cross-chunk buffering in llm-providers.js's SSE
// parser), plus vendor-shaped error bodies.
//
// Usable two ways:
//   - `import { startMockServer } from "./mock-llm-providers.mjs"` from a
//     test script (see scripts/test-llm-providers.mjs).
//   - `node scripts/mock-llm-providers.mjs` to run standalone (e.g. to point
//     the browser UI's provider Base URL at it during manual testing).
//
// Trigger a special response by ending the request's last user message with
// one of these markers:
//   __trigger_error__  → vendor-shaped error response, HTTP 400
//   __trigger_split__  → happy-path stream, but with one SSE event's `data:`
//                        line deliberately split across two writes

import { createServer } from "node:http";

function corsHeaders(req) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS, GET",
    "access-control-allow-headers": req.headers["access-control-request-headers"] || "*",
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function sseEvent(event, dataObjOrStr) {
  const data = typeof dataObjOrStr === "string" ? dataObjOrStr : JSON.stringify(dataObjOrStr);
  return (event ? `event: ${event}\n` : "") + `data: ${data}\n\n`;
}

function lastUserText(body) {
  try {
    const parsed = JSON.parse(body);
    // Anthropic / OpenAI shape: messages: [{role, content}]
    if (Array.isArray(parsed.messages) && parsed.messages.length) {
      const last = parsed.messages[parsed.messages.length - 1];
      return typeof last?.content === "string" ? last.content : "";
    }
    // Gemini shape: contents: [{role, parts: [{text}]}]
    if (Array.isArray(parsed.contents) && parsed.contents.length) {
      const last = parsed.contents[parsed.contents.length - 1];
      return last?.parts?.[0]?.text || "";
    }
  } catch {
    // fall through
  }
  return "";
}

// Writes `fullText` to `res` in two pieces with a short delay between them,
// splitting mid-line inside an SSE event (not on the blank-line boundary) so
// a parser that only buffers on '\n' would misparse it — only one that
// buffers until it sees the blank-line event terminator handles this.
async function writeSplitAcrossChunks(res, fullText) {
  const marker = '"text_delta","text":"';
  const markerIndex = fullText.indexOf(marker);
  const splitIndex = markerIndex >= 0 ? markerIndex + Math.floor(marker.length / 2) : Math.floor(fullText.length / 2);
  res.write(fullText.slice(0, splitIndex));
  await new Promise((resolve) => setTimeout(resolve, 15));
  res.write(fullText.slice(splitIndex));
}

// Writes each event separately with a delay in between — used to give an
// AbortController time to actually cancel mid-stream (and to demonstrate
// genuine incremental streaming rather than one buffered write).
async function writeSlowly(res, events, delayMs = 150) {
  for (const event of events) {
    res.write(event);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

async function respondStream(req, res, events, { split, slow } = {}) {
  res.writeHead(200, {
    ...corsHeaders(req),
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  if (split) {
    await writeSplitAcrossChunks(res, events.join(""));
  } else if (slow) {
    try {
      await writeSlowly(res, events);
    } catch {
      // client aborted mid-stream — nothing left to do
    }
  } else {
    res.write(events.join(""));
  }
  res.end();
}

function respondError(req, res, bodyObj) {
  res.writeHead(400, { ...corsHeaders(req), "content-type": "application/json" });
  res.end(JSON.stringify(bodyObj));
}

function anthropicSseEvents() {
  return [
    sseEvent("message_start", { type: "message_start", message: { id: "msg_mock1", model: "claude-sonnet-5", usage: { input_tokens: 10 } } }),
    sseEvent("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }),
    sseEvent("ping", { type: "ping" }),
    sseEvent("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Hello" } }),
    sseEvent("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: " world" } }),
    sseEvent("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "!" } }),
    sseEvent("content_block_stop", { type: "content_block_stop", index: 0 }),
    sseEvent("message_delta", { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 3 } }),
    sseEvent("message_stop", { type: "message_stop" }),
  ];
}

function openaiSseEvents() {
  return [
    sseEvent(null, { id: "chatcmpl-mock1", object: "chat.completion.chunk", choices: [{ index: 0, delta: { role: "assistant" } }] }),
    sseEvent(null, { id: "chatcmpl-mock1", choices: [{ index: 0, delta: { content: "Hello" } }] }),
    sseEvent(null, { id: "chatcmpl-mock1", choices: [{ index: 0, delta: { content: " world" } }] }),
    sseEvent(null, { id: "chatcmpl-mock1", choices: [{ index: 0, delta: { content: "!" } }] }),
    sseEvent(null, { id: "chatcmpl-mock1", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }),
    sseEvent(null, "[DONE]"),
  ];
}

function geminiSseEvents() {
  return [
    sseEvent(null, { candidates: [{ content: { role: "model", parts: [{ text: "Hello" }] }, index: 0 }] }),
    sseEvent(null, { candidates: [{ content: { role: "model", parts: [{ text: " world" }] }, index: 0 }] }),
    sseEvent(null, { candidates: [{ content: { role: "model", parts: [{ text: "!" }] }, finishReason: "STOP", index: 0 }] }),
  ];
}

export function startMockServer({ port = 0 } = {}) {
  const lastRequests = {};

  const server = createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders(req));
      res.end();
      return;
    }

    const url = new URL(req.url, "http://localhost");

    // Debug-only introspection endpoint (GET /__debug/last/<provider>) — lets
    // an out-of-process caller (e.g. a browser-driven UI test) see the last
    // request a given route received, since it can't reach `lastRequests`
    // directly the way an in-process test script can.
    if (req.method === "GET" && url.pathname.startsWith("/__debug/last/")) {
      const key = url.pathname.slice("/__debug/last/".length);
      res.writeHead(200, { ...corsHeaders(req), "content-type": "application/json" });
      res.end(JSON.stringify(lastRequests[key] || null));
      return;
    }
    const body = req.method === "POST" ? await readBody(req) : "";
    const marker = lastUserText(body);

    const streamOpts = { split: marker === "__trigger_split__", slow: marker === "__trigger_slow__" };

    if (url.pathname === "/anthropic/v1/messages") {
      lastRequests.anthropic = { headers: req.headers, url: req.url, body };
      if (marker === "__trigger_error__") {
        respondError(req, res, { type: "error", error: { type: "invalid_request_error", message: "mock anthropic error" } });
        return;
      }
      await respondStream(req, res, anthropicSseEvents(), streamOpts);
      return;
    }

    if (url.pathname === "/openai/v1/chat/completions") {
      lastRequests.openai = { headers: req.headers, url: req.url, body };
      if (marker === "__trigger_error__") {
        respondError(req, res, { error: { message: "mock openai error", type: "invalid_request_error", code: null } });
        return;
      }
      await respondStream(req, res, openaiSseEvents(), streamOpts);
      return;
    }

    if (url.pathname === "/openai-compat/chat/completions") {
      lastRequests.openaiCompat = { headers: req.headers, url: req.url, body };
      if (marker === "__trigger_error__") {
        respondError(req, res, { error: { message: "mock custom endpoint error", type: "invalid_request_error", code: null } });
        return;
      }
      await respondStream(req, res, openaiSseEvents(), streamOpts);
      return;
    }

    const geminiMatch = url.pathname.match(/^\/v1beta\/models\/([^/]+):streamGenerateContent$/);
    if (geminiMatch) {
      lastRequests.gemini = { headers: req.headers, url: req.url, body, model: geminiMatch[1], key: url.searchParams.get("key") };
      if (marker === "__trigger_error__") {
        respondError(req, res, { error: { code: 400, message: "mock gemini error", status: "INVALID_ARGUMENT" } });
        return;
      }
      await respondStream(req, res, geminiSseEvents(), streamOpts);
      return;
    }

    res.writeHead(404, corsHeaders(req));
    res.end("not found");
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        port: address.port,
        baseUrl: `http://127.0.0.1:${address.port}`,
        lastRequests,
        close: () => new Promise((res2) => server.close(() => res2())),
      });
    });
  });
}

// Standalone mode: `node scripts/mock-llm-providers.mjs [port]`
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2]) || 8791;
  startMockServer({ port }).then((mock) => {
    console.log(`Mock LLM provider server listening on ${mock.baseUrl}`);
    console.log("Routes: /anthropic/v1/messages, /openai/v1/chat/completions, /openai-compat/chat/completions, /v1beta/models/:model:streamGenerateContent");
  });
}
