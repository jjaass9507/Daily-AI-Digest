// Browser-side streaming adapters for user-supplied LLM API keys (P2).
//
// Design constraints (verified against real vendor behavior):
// - All calls go straight from the browser to the vendor's API. No server
//   proxy — the key never leaves the user's machine except to the vendor.
// - Anthropic and OpenAI accept the key as a request header. Gemini's CORS
//   preflight only allows the `content-type` header, so its key must travel
//   as a URL query parameter instead.
// - All three vendors report request errors as JSON with an `error.message`
//   field (though the wrapping shape differs slightly), so a single
//   `readErrorMessage()` helper covers all of them.
//
// Loaded as a plain classic <script> (no bundler, no <script type="module">),
// matching src/github-api.js: no `export`, attach the public surface to
// `window` (browser) or `globalThis` (Node, for scripts/test-llm-providers.mjs).

const LLM_PROVIDERS = {
  anthropic: {
    label: "Anthropic（Claude）",
    defaultModel: "claude-sonnet-5",
  },
  openai: {
    label: "OpenAI（ChatGPT）",
    defaultModel: "gpt-4o-mini",
  },
  gemini: {
    label: "Google（Gemini）",
    defaultModel: "gemini-2.0-flash",
  },
  "openai-compat": {
    label: "OpenAI 相容端點（自訂 Base URL）",
    defaultModel: "",
  },
};

// Parses a Server-Sent Events byte stream into `{event, data}` records.
// Chunk boundaries from `fetch`/`ReadableStream` do not line up with SSE
// event boundaries (a "\n\n" separator, or even a single "data:" line, can
// arrive split across two reads) — so incomplete tail bytes are buffered
// between calls to `push()` rather than parsed immediately.
function makeSseParser(onEvent) {
  let buffer = "";

  function emit(rawEvent) {
    if (!rawEvent.trim()) return;
    let eventName = "message";
    const dataLines = [];
    for (const line of rawEvent.split(/\r\n|\n/)) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
    }
    if (dataLines.length) onEvent(eventName, dataLines.join("\n"));
  }

  return {
    push(chunkText) {
      buffer += chunkText;
      // SSE events are separated by a blank line (\n\n or \r\n\r\n). Split on
      // that boundary and keep whatever trails the last boundary — it may be
      // an incomplete event that finishes in a later chunk.
      const parts = buffer.split(/\r\n\r\n|\n\n/);
      buffer = parts.pop() ?? "";
      for (const part of parts) emit(part);
    },
    flush() {
      if (buffer.trim()) emit(buffer);
      buffer = "";
    },
  };
}

async function readSseStream(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const parser = makeSseParser(onEvent);
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.push(decoder.decode(value, { stream: true }));
  }
  parser.push(decoder.decode());
  parser.flush();
}

// All three vendors return a JSON body with an `error.message` field on
// non-2xx responses. Falls back to the raw body / HTTP status when the body
// isn't JSON (proxies, gateways, etc. can return plain text).
async function readErrorMessage(response) {
  let text = "";
  try {
    text = await response.text();
  } catch {
    return `HTTP ${response.status}`;
  }
  try {
    const json = JSON.parse(text);
    return json?.error?.message || text || `HTTP ${response.status}`;
  } catch {
    return text || `HTTP ${response.status}`;
  }
}

async function streamAnthropic({ apiKey, model, system, messages, signal, onToken, maxTokens }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // Required for direct browser calls — without it Anthropic rejects the
      // CORS preflight for this endpoint.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens || 4096,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    }),
    signal,
  });

  if (!res.ok) throw new Error(await readErrorMessage(res));

  await readSseStream(res, (event, data) => {
    if (event !== "content_block_delta") return;
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (parsed?.delta?.type === "text_delta" && typeof parsed.delta.text === "string") {
      onToken(parsed.delta.text);
    }
  });
}

// Shared by OpenAI itself and any OpenAI-compatible custom endpoint — both
// speak the same `/chat/completions` SSE shape.
async function streamOpenAiCompatible(url, { apiKey, model, system, messages, signal, onToken }) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      stream: true,
    }),
    signal,
  });

  if (!res.ok) throw new Error(await readErrorMessage(res));

  await readSseStream(res, (event, data) => {
    if (data === "[DONE]") return;
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    const delta = parsed?.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta) onToken(delta);
  });
}

// Gemini's CORS preflight only allows the `content-type` request header —
// `x-goog-api-key` (or any Authorization header) fails the preflight from a
// browser. The key has to travel as a `key=` query parameter instead.
async function streamGemini({ apiKey, model, system, messages, signal, onToken, baseUrl }) {
  const base = baseUrl || "https://generativelanguage.googleapis.com";
  const url = `${base}/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    }),
    signal,
  });

  if (!res.ok) throw new Error(await readErrorMessage(res));

  await readSseStream(res, (event, data) => {
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    const parts = parsed?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (typeof part.text === "string" && part.text) onToken(part.text);
    }
  });
}

// Streams a chat completion from the given provider, invoking `onToken` once
// per text fragment as it arrives.
//
// options:
//   provider  — "anthropic" | "openai" | "gemini" | "openai-compat"
//   apiKey    — the user's own key, sent straight to the vendor
//   model     — model name string
//   baseUrl   — required only for "openai-compat" (and honored by "gemini"
//               for pointing at a mock/proxy during testing)
//   system    — system prompt (string)
//   messages  — [{role: "user"|"assistant", content: string}, ...]
//   signal    — optional AbortSignal to cancel mid-stream
//   onToken   — required callback, called with each text fragment
//   maxTokens — optional, Anthropic only (default 4096)
async function streamLLM(options) {
  const { provider, onToken } = options || {};
  if (typeof onToken !== "function") {
    throw new Error("streamLLM 需要提供 onToken callback");
  }

  if (provider === "anthropic") return streamAnthropic(options);
  if (provider === "openai") return streamOpenAiCompatible("https://api.openai.com/v1/chat/completions", options);
  if (provider === "gemini") return streamGemini(options);
  if (provider === "openai-compat") {
    const base = (options.baseUrl || "").replace(/\/+$/, "");
    if (!base) throw new Error("尚未設定 Base URL");
    return streamOpenAiCompatible(`${base}/chat/completions`, options);
  }
  throw new Error(`未知的供應商：${provider}`);
}

if (typeof window !== "undefined") {
  window.LLM_PROVIDERS = LLM_PROVIDERS;
  window.streamLLM = streamLLM;
} else if (typeof globalThis !== "undefined") {
  // Node — used by scripts/test-llm-providers.mjs, which imports this file
  // purely for its side effect of populating these globals (no bundler, same
  // file that ships to the browser).
  globalThis.LLM_PROVIDERS = LLM_PROVIDERS;
  globalThis.streamLLM = streamLLM;
}
