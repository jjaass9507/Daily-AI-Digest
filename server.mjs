import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";
import pg from "pg";
import nodemailer from "nodemailer";

const { Pool } = pg;

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL || "";
const ROOT = process.cwd();
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";
const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";
const EMAIL_TO = process.env.EMAIL_TO || "jjaass9507@gmail.com";

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
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
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
    ? "select payload from digest_editions where digest_date = $1 limit 1"
    : "select payload from digest_editions order by digest_date desc limit 1";
  const params = date ? [date] : [];
  const { rows } = await pool.query(query, params);
  if (!rows.length) {
    sendJson(res, 404, { error: "digest_not_found" });
    return;
  }
  sendJson(res, 200, rows[0].payload);
}

async function handleSendEmail(req, res) {
  const auth = req.headers["authorization"] || "";
  if (!INTERNAL_API_KEY || auth !== `Bearer ${INTERNAL_API_KEY}`) {
    sendJson(res, 401, { error: "unauthorized" });
    return;
  }
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    sendJson(res, 500, { error: "GMAIL_USER or GMAIL_APP_PASSWORD not configured" });
    return;
  }

  let body = "";
  for await (const chunk of req) body += chunk;
  const { subject, html } = JSON.parse(body);
  if (!subject || !html) {
    sendJson(res, 400, { error: "subject and html are required" });
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: `"Daily AI Digest" <${GMAIL_USER}>`,
    to: EMAIL_TO,
    subject,
    html,
  });

  sendJson(res, 200, { ok: true });
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
    if (req.url?.startsWith("/api/digest/")) {
      await handleDigest(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/internal/send-email") {
      await handleSendEmail(req, res);
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
