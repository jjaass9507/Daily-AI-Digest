import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";
import pg from "pg";

const { Pool } = pg;

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL || "";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";
const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || "";
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "";
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || "";
const DEFAULT_RECIPIENTS = process.env.EMAIL_TO || GMAIL_USER;
const ROOT = process.cwd();

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
    })
  : null;

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jsx": "text/babel; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

const EDITION_START = new Date("2026-05-21T00:00:00+08:00");

function editionFromDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00+08:00`);
  return `第 ${Math.max(1, Math.floor((d - EDITION_START) / 86400e3) + 1)} 期`;
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function handleEditions(req, res) {
  if (!pool) {
    sendJson(res, 503, { error: "DATABASE_URL is not configured" });
    return;
  }
  const { rows } = await pool.query(
    `select digest_date::text, curated_count,
            payload->>'dateLabel' as date_label
     from digest_editions
     order by digest_date desc
     limit 90`,
  );
  sendJson(res, 200, rows.map((r) => ({ ...r, edition: editionFromDate(r.digest_date) })));
}

async function handleDigest(req, res) {
  if (!pool) {
    sendJson(res, 503, { error: "DATABASE_URL is not configured" });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const date = url.pathname === "/api/digest/today"
    ? null
    : url.pathname.replace("/api/digest/", "");

  const query = date
    ? "select digest_date::text, payload from digest_editions where digest_date = $1 limit 1"
    : "select digest_date::text, payload from digest_editions order by digest_date desc limit 1";
  const params = date ? [date] : [];
  const { rows } = await pool.query(query, params);
  if (!rows.length) {
    sendJson(res, 404, { error: "digest_not_found" });
    return;
  }
  const payload = { ...rows[0].payload, edition: editionFromDate(rows[0].digest_date) };
  sendJson(res, 200, payload);
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleInternalDigestUpdate(req, res) {
  if (!INTERNAL_API_KEY) {
    sendJson(res, 503, { error: "INTERNAL_API_KEY not configured" });
    return;
  }
  const auth = req.headers["authorization"] || "";
  if (auth !== `Bearer ${INTERNAL_API_KEY}`) {
    sendJson(res, 401, { error: "unauthorized" });
    return;
  }
  if (!pool) {
    sendJson(res, 503, { error: "DATABASE_URL is not configured" });
    return;
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    sendJson(res, 400, { error: "invalid_json" });
    return;
  }

  const { repos, digest } = body;
  if (!Array.isArray(repos) || !digest?.date || !Array.isArray(digest.picks)) {
    sendJson(res, 400, { error: "missing repos or digest fields" });
    return;
  }

  const reposById = new Map(repos.map((r) => [r.id, r]));
  const client = await pool.connect();
  try {
    await client.query("begin");

    for (const item of digest.picks) {
      const repo = reposById.get(Number(item.id));
      if (!repo) continue;

      await client.query(
        `insert into repos (id, full_name, name, owner, html_url, description, language, topics, license, created_at, updated_at, last_seen_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
         on conflict (id) do update set
           full_name=excluded.full_name, name=excluded.name, owner=excluded.owner,
           html_url=excluded.html_url, description=excluded.description, language=excluded.language,
           topics=excluded.topics, license=excluded.license, created_at=excluded.created_at,
           updated_at=excluded.updated_at, last_seen_at=now()`,
        [repo.id, repo.full_name, repo.name, repo.owner.login, repo.html_url,
         repo.description, repo.language, repo.topics || [], repo.license?.spdx_id || null,
         repo.created_at, repo.updated_at],
      );

      await client.query(
        `insert into repo_snapshots (repo_id, snapshot_date, stars, forks, pushed_at)
         values ($1,$2,$3,$4,$5)
         on conflict (repo_id, snapshot_date) do update set
           stars=excluded.stars, forks=excluded.forks, pushed_at=excluded.pushed_at`,
        [repo.id, digest.date, repo.stargazers_count, repo.forks_count, repo.pushed_at],
      );

      await client.query(
        `insert into repo_summaries (repo_id, readme_sha, readme_excerpt, summary_zh, why_zh, quick_start_zh, difficulty, eta, generated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,now())
         on conflict (repo_id) do update set
           readme_sha=excluded.readme_sha, readme_excerpt=excluded.readme_excerpt,
           summary_zh=excluded.summary_zh, why_zh=excluded.why_zh,
           quick_start_zh=excluded.quick_start_zh, difficulty=excluded.difficulty,
           eta=excluded.eta, generated_at=now()`,
        [repo.id, item.readmeSha, item.summary?.slice(0, 500),
         item.summary, item.whyValuable, JSON.stringify(item.steps),
         item.difficulty, item.eta],
      );
    }

    await client.query(
      `insert into digest_editions (digest_date, edition, theme, total_scanned, curated_count, payload, generated_at)
       values ($1,$2,$3,$4,$5,$6,now())
       on conflict (digest_date) do update set
         edition=excluded.edition, theme=excluded.theme, total_scanned=excluded.total_scanned,
         curated_count=excluded.curated_count, payload=excluded.payload, generated_at=now()`,
      [digest.date, digest.edition, digest.theme, digest.totalScanned, digest.curated, JSON.stringify(digest)],
    );

    await client.query("delete from digest_items where digest_date = $1", [digest.date]);
    for (const item of digest.picks) {
      await client.query(
        `insert into digest_items (digest_date, repo_id, rank, score, models, item_type, payload)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [digest.date, Number(item.id), item.rank, item.score, item.models, item.type, JSON.stringify(item)],
      );
    }

    await client.query("commit");
    sendJson(res, 200, { ok: true, date: digest.date, saved: digest.picks.length });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function getGmailAccessToken() {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`gmail_token_error: ${data.error}`);
  return data.access_token;
}

async function handleInternalSendEmail(req, res) {
  if (!INTERNAL_API_KEY) { sendJson(res, 503, { error: "INTERNAL_API_KEY not configured" }); return; }
  const auth = req.headers["authorization"] || "";
  if (auth !== `Bearer ${INTERNAL_API_KEY}`) { sendJson(res, 401, { error: "unauthorized" }); return; }
  if (!GMAIL_USER || !GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    sendJson(res, 503, { error: "Gmail OAuth2 env vars not configured" });
    return;
  }

  let body;
  try { body = JSON.parse(await readBody(req)); }
  catch { sendJson(res, 400, { error: "invalid_json" }); return; }

  const { subject, html, to } = body;
  if (!subject || !html) { sendJson(res, 400, { error: "subject and html are required" }); return; }

  const toAddresses = (to || DEFAULT_RECIPIENTS)
    .split(",").map(e => e.trim()).filter(Boolean).join(", ");

  const mime = [
    `From: "Daily AI Digest 電子報" <${GMAIL_USER}>`,
    `To: ${toAddresses}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(html).toString("base64"),
  ].join("\r\n");

  const raw = Buffer.from(mime).toString("base64url");

  let accessToken;
  try { accessToken = await getGmailAccessToken(); }
  catch (err) { sendJson(res, 502, { error: err.message }); return; }

  const r = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  const result = await r.json();
  if (!r.ok) {
    sendJson(res, 502, { error: "gmail_send_error", detail: result.error?.message });
    return;
  }

  sendJson(res, 200, { ok: true, messageId: result.id });
}

async function handleInternalScreenshot(req, res) {
  if (!INTERNAL_API_KEY) { sendJson(res, 503, { error: "INTERNAL_API_KEY not configured" }); return; }
  const auth = req.headers["authorization"] || "";
  if (auth !== `Bearer ${INTERNAL_API_KEY}`) { sendJson(res, 401, { error: "unauthorized" }); return; }

  let body;
  try { body = JSON.parse(await readBody(req)); }
  catch { sendJson(res, 400, { error: "invalid_json" }); return; }

  const { screenshot } = body;
  if (!screenshot) { sendJson(res, 400, { error: "screenshot (base64) required" }); return; }

  await writeFile(join(ROOT, "screenshot-today.jpg"), Buffer.from(screenshot, "base64"));
  const url = `${process.env.RENDER_URL || ""}/screenshot-today.jpg`;
  sendJson(res, 200, { ok: true, url });
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = normalize(join(ROOT, requested));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    await readFile(filePath);
    res.writeHead(200, {
      "content-type": types[extname(filePath)] || "application/octet-stream",
    });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.url === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }
    if (req.method === "POST" && req.url === "/internal/digest/update") {
      await handleInternalDigestUpdate(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/internal/send-email") {
      await handleInternalSendEmail(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/internal/screenshot") {
      await handleInternalScreenshot(req, res);
      return;
    }
    if (req.url === "/api/digest/editions") {
      await handleEditions(req, res);
      return;
    }
    if (req.url?.startsWith("/api/digest/")) {
      await handleDigest(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "internal_error" });
  }
});

server.listen(PORT, () => {
  console.log(`Daily AI Digest listening on ${PORT}`);
});
