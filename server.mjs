import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";
import pg from "pg";

const { Pool } = pg;

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL || "";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
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

// The daily payload is agent-generated, so list fields can arrive as a plain
// string. Coerce them here so every consumer (web app, email) sees arrays.
function toList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return value.split(/\s*[/,、]\s*/).filter(Boolean);
  return [];
}

function normalizePicks(payload) {
  if (!Array.isArray(payload.picks)) return payload;
  return {
    ...payload,
    picks: payload.picks.map((pick) => ({
      ...pick,
      models: toList(pick.models),
      stack: toList(pick.stack),
      steps: toList(pick.steps),
    })),
  };
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
     limit 365`,
  );
  sendJson(res, 200, rows.map((r) => ({ ...r, edition: editionFromDate(r.digest_date) })));
}

const SEARCH_LIMIT_MAX = 100;

// ILIKE reads % and _ as wildcards, so a query containing them would silently
// match far more than the user typed. Escape them before wrapping in %...%.
function likePattern(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  return `%${trimmed.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

// Cross-edition repo search. Rows are grouped per repo, so a project featured
// in several editions comes back once with its full appearance range.
async function handleRepoSearch(req, res) {
  if (!pool) {
    sendJson(res, 503, { error: "DATABASE_URL is not configured" });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const q = likePattern(url.searchParams.get("q"));
  const model = (url.searchParams.get("model") || "").trim() || null;
  const type = (url.searchParams.get("type") || "").trim() || null;
  const limit = clampInt(url.searchParams.get("limit"), 30, 1, SEARCH_LIMIT_MAX);
  const offset = clampInt(url.searchParams.get("offset"), 0, 0, 10000);

  const { rows } = await pool.query(
    `select r.id::text as id, r.full_name, r.name, r.owner, r.html_url,
            r.description, r.language, r.topics,
            s.summary_zh, s.difficulty,
            min(d.digest_date)::text as first_seen,
            max(d.digest_date)::text as last_seen,
            count(*)::int as appearances,
            count(*) over ()::int as total,
            (select array_agg(distinct m)
               from digest_items di, unnest(di.models) m
              where di.repo_id = r.id) as models,
            (select array_agg(distinct di.item_type)
               from digest_items di
              where di.repo_id = r.id) as types,
            (select rs.stars from repo_snapshots rs
              where rs.repo_id = r.id
              order by rs.snapshot_date desc
              limit 1) as stars
       from digest_items d
       join repos r on r.id = d.repo_id
       left join repo_summaries s on s.repo_id = d.repo_id
      where ($1::text is null or r.full_name ilike $1 or r.description ilike $1
             or s.summary_zh ilike $1 or s.why_zh ilike $1)
        and ($2::text is null or $2 = any(d.models))
        and ($3::text is null or d.item_type = $3)
      group by r.id, r.full_name, r.name, r.owner, r.html_url,
               r.description, r.language, r.topics,
               s.summary_zh, s.difficulty
      order by max(d.digest_date) desc, max(d.score) desc
      limit $4 offset $5`,
    [q, model, type, limit, offset],
  );

  sendJson(res, 200, {
    total: rows.length ? rows[0].total : 0,
    limit,
    offset,
    results: rows.map((row) => ({
      id: row.id,
      name: row.name,
      author: row.owner,
      fullName: row.full_name,
      githubUrl: row.html_url,
      description: row.description,
      language: row.language,
      topics: row.topics || [],
      summary: row.summary_zh || row.description || "",
      difficulty: row.difficulty,
      models: row.models || [],
      types: row.types || [],
      stars: row.stars || 0,
      appearances: row.appearances,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
      lastEdition: editionFromDate(row.last_seen),
    })),
  });
}

// ---------------------------------------------------------------------------
// Repo deep-context assembler (P1). Combines the free DB data we already have
// with a best-effort GitHub fetch, cached for 24h so repeat requests (and the
// three depth tiers) don't re-hit GitHub. Any single GitHub call may fail —
// that's normal (rate limits, missing files) — so failures are recorded in
// `missing` instead of failing the whole request.
// ---------------------------------------------------------------------------

const GITHUB_API = "https://api.github.com";
const GITHUB_TIMEOUT_MS = 9000;
const CONTEXT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CONTEXT_DEPTHS = new Set(["light", "standard", "deep"]);

const MANIFEST_FILES = ["package.json", "pyproject.toml", "requirements.txt", "go.mod", "Cargo.toml"];
const EXCLUDE_PATH_RE = /(^|\/)(node_modules|\.git|dist|build|vendor|target|__pycache__|\.venv|venv)(\/|$)/;
const LOCK_FILE_NAMES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb",
  "Cargo.lock", "poetry.lock", "Gemfile.lock", "composer.lock", "go.sum",
]);
const BINARY_EXT_RE = /\.(png|jpe?g|gif|ico|svg|webp|pdf|zip|gz|tar|whl|so|dll|dylib|woff2?|ttf|eot|mp4|mp3|wasm|bin|exe|jar|class)$/i;

const ENTRY_PATTERNS = {
  // Real-world packages are frequently not `src/main.<ext>` — e.g. a Python
  // package's entry point is its `src/<pkg>/__init__.py`, and Go binaries
  // often live under `cmd/<name>/main.go` or a top-level `pkg/`.
  TypeScript: [/^src\/index\.tsx?$/, /^src\/main\.tsx?$/, /^index\.tsx?$/, /^lib\/index\.tsx?$/],
  JavaScript: [/^src\/index\.jsx?$/, /^src\/main\.jsx?$/, /^index\.jsx?$/, /^lib\/index\.jsx?$/],
  Python: [/^src\/[^/]+\/__init__\.py$/, /^src\/main\.py$/, /^main\.py$/, /^app\.py$/, /^src\/app\.py$/],
  Go: [/^main\.go$/, /^cmd\/[^/]+\/main\.go$/, /^pkg\/[^/]+\/[^/]+\.go$/],
  Rust: [/^src\/lib\.rs$/, /^src\/main\.rs$/],
};
const GENERIC_ENTRY_CANDIDATES = [
  "src/index.ts", "src/index.js", "src/main.py", "main.go", "src/lib.rs", "app.py", "main.py", "index.js", "index.ts",
];
// Extensions checked by the last-resort fallback below, keyed by GitHub's
// reported primary language.
const LANGUAGE_EXTENSIONS = {
  TypeScript: [".ts", ".tsx"],
  JavaScript: [".js", ".jsx", ".mjs", ".cjs"],
  Python: [".py"],
  Go: [".go"],
  Rust: [".rs"],
};
// Fallback-only exclusions (on top of filterTreePaths' generic ones): paths
// that are clearly not core library code — tests, examples, docs, CI tooling.
const FALLBACK_EXCLUDE_RE = /(^|\/)(test|tests|__tests__|spec|specs|example|examples|doc|docs|benchmark|benchmarks|fixtures?|\.github)(\/|$)/i;
const FALLBACK_EXCLUDE_BASENAME_RE = /^\.|\.test\.|\.spec\.|config|ignore|\.d\.ts$|\.rc\./i;

function ghHeaders() {
  const headers = { Accept: "application/vnd.github.v3+json", "User-Agent": "daily-ai-digest-context" };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}

// Fetches a GitHub API path with a timeout. Distinguishes "not found" (404 —
// expected for e.g. an absent manifest file) from other failures (network,
// rate limit, timeout), since only the latter should surface as `missing`.
async function ghGet(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GITHUB_TIMEOUT_MS);
  try {
    const res = await fetch(`${GITHUB_API}${path}`, { headers: ghHeaders(), signal: controller.signal });
    if (res.status === 404) return { ok: false, notFound: true, data: null };
    if (!res.ok) return { ok: false, notFound: false, data: null };
    return { ok: true, notFound: false, data: await res.json() };
  } catch {
    return { ok: false, notFound: false, data: null };
  } finally {
    clearTimeout(timer);
  }
}

function decodeContent(data) {
  if (!data?.content) return null;
  try {
    return Buffer.from(data.content, data.encoding || "base64").toString("utf8");
  } catch {
    return null;
  }
}

function contentsUrlPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function filterTreePaths(tree) {
  return (tree || [])
    .filter((entry) => entry.type === "blob" && typeof entry.path === "string")
    .map((entry) => entry.path)
    .filter((path) => !EXCLUDE_PATH_RE.test(path))
    .filter((path) => !LOCK_FILE_NAMES.has(path.split("/").pop()))
    .filter((path) => !BINARY_EXT_RE.test(path))
    .slice(0, 300);
}

function guessEntryPoints(language, treePaths) {
  const matches = [];
  for (const pattern of ENTRY_PATTERNS[language] || []) {
    const hit = treePaths.find((path) => pattern.test(path) && !matches.includes(path));
    if (hit) matches.push(hit);
  }
  // Generic candidates must actually exist in the fetched tree — requesting
  // a file GitHub doesn't have just wastes a request and returns nothing.
  for (const candidate of GENERIC_ENTRY_CANDIDATES) {
    if (matches.length >= 3) break;
    if (treePaths.includes(candidate) && !matches.includes(candidate)) matches.push(candidate);
  }
  // Still short of 3: fall back to whatever source files the tree actually
  // has for this language, preferring shallow paths under src/ or lib/ over
  // root-level tooling/config scripts.
  if (matches.length < 3) {
    const exts = LANGUAGE_EXTENSIONS[language] || [];
    if (exts.length) {
      const eligible = treePaths
        .filter((path) => exts.some((ext) => path.endsWith(ext)))
        .filter((path) => !FALLBACK_EXCLUDE_RE.test(path))
        .filter((path) => !FALLBACK_EXCLUDE_BASENAME_RE.test(path.split("/").pop()))
        .filter((path) => !matches.includes(path));
      const bySourceDir = eligible.filter((path) => /(^|\/)(src|lib)\//.test(path));
      const pool = bySourceDir.length ? bySourceDir : eligible;
      pool
        .sort((a, b) => {
          const depthDiff = a.split("/").length - b.split("/").length;
          return depthDiff !== 0 ? depthDiff : a.localeCompare(b);
        })
        .forEach((path) => {
          if (matches.length < 3) matches.push(path);
        });
    }
  }
  return matches.slice(0, 3);
}

// Always fetches the fullest possible set of data (deep tier) so a repo only
// needs one cache row; depth trimming happens on the way out in trimForDepth.
async function buildGithubContext(fullName, language) {
  const missing = [];

  const [repoInfoR, readmeR, commitsR, releasesR, issuesR] = await Promise.all([
    ghGet(`/repos/${fullName}`),
    ghGet(`/repos/${fullName}/readme`),
    ghGet(`/repos/${fullName}/commits?per_page=30`),
    ghGet(`/repos/${fullName}/releases?per_page=1`),
    ghGet(`/repos/${fullName}/issues?state=open&per_page=15`),
  ]);
  if (!repoInfoR.ok) missing.push("repoInfo");
  if (!readmeR.ok) missing.push("readme");
  if (!commitsR.ok) missing.push("commits");
  if (!releasesR.ok) missing.push("releases");
  if (!issuesR.ok) missing.push("issues");

  const defaultBranch = repoInfoR.data?.default_branch || "main";
  const treeR = await ghGet(`/repos/${fullName}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`);
  if (!treeR.ok) missing.push("fileTree");

  const readme = decodeContent(readmeR.data);
  const fileTree = treeR.ok ? filterTreePaths(treeR.data?.tree) : [];

  const commits = commitsR.ok
    ? (commitsR.data || []).map((c) => ({
        message: (c.commit?.message || "").split("\n")[0],
        date: c.commit?.author?.date || null,
      }))
    : [];

  const latestRelease = releasesR.ok && releasesR.data?.[0]
    ? { tag: releasesR.data[0].tag_name, body: (releasesR.data[0].body || "").slice(0, 4000) }
    : null;

  // The issues endpoint also returns pull requests; filter those out.
  const openIssues = issuesR.ok
    ? (issuesR.data || []).filter((issue) => !issue.pull_request).map((issue) => issue.title)
    : [];

  const manifestResults = await Promise.all(
    MANIFEST_FILES.map(async (name) => ({ name, r: await ghGet(`/repos/${fullName}/contents/${name}`) })),
  );
  const manifests = {};
  for (const { name, r } of manifestResults) {
    if (r.ok) {
      const content = decodeContent(r.data);
      if (content) manifests[name] = content;
    } else if (!r.notFound) {
      missing.push(`manifest:${name}`);
    }
  }

  const entryCandidates = guessEntryPoints(language, fileTree);
  const sourceResults = await Promise.all(
    entryCandidates.map(async (path) => ({ path, r: await ghGet(`/repos/${fullName}/contents/${contentsUrlPath(path)}`) })),
  );
  const sourceFiles = {};
  for (const { path, r } of sourceResults) {
    if (r.ok) {
      const content = decodeContent(r.data);
      if (content) sourceFiles[path] = content.slice(0, 8000);
    } else if (!r.notFound) {
      missing.push(`sourceFile:${path}`);
    }
  }

  return { missing, data: { readme, fileTree, manifests, commits, latestRelease, openIssues, sourceFiles } };
}

function estimateTokens(value) {
  return Math.round(JSON.stringify(value).length / 3);
}

// Depth only trims the already-cached payload on the way out, so a repo only
// ever needs one GitHub fetch regardless of how many depths get requested.
function trimForDepth(payload, depth) {
  const github = payload.github || {};
  let githubOut;

  if (depth === "light") {
    githubOut = { readme: github.readme ? github.readme.slice(0, 4000) : null };
  } else if (depth === "standard") {
    githubOut = {
      readme: github.readme || null,
      fileTree: github.fileTree || [],
      manifests: github.manifests || {},
      commits: github.commits || [],
      latestRelease: github.latestRelease || null,
      openIssues: github.openIssues || [],
    };
  } else {
    githubOut = {
      readme: github.readme || null,
      fileTree: github.fileTree || [],
      manifests: github.manifests || {},
      commits: github.commits || [],
      latestRelease: github.latestRelease || null,
      openIssues: github.openIssues || [],
      sourceFiles: github.sourceFiles || {},
    };
  }

  const result = {
    repoId: payload.db.metadata.id,
    fullName: payload.db.metadata.fullName,
    depth,
    cachedAt: payload.cachedAt,
    db: payload.db,
    github: githubOut,
    missing: payload.missing || [],
  };

  result.tokenEstimate = estimateTokens(result);
  result.tokenEstimateNote = "粗略估計值（回應 JSON 字元數 / 3），中英文與程式碼混合，非精確 tokenizer 計算";
  return result;
}

async function handleRepoContext(req, res, repoIdParam) {
  if (!pool) {
    sendJson(res, 503, { error: "DATABASE_URL is not configured" });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const depthParam = (url.searchParams.get("depth") || "standard").trim();
  const depth = CONTEXT_DEPTHS.has(depthParam) ? depthParam : "standard";

  const { rows: repoRows } = await pool.query(
    `select r.id::text as id, r.full_name, r.name, r.owner, r.html_url, r.description,
            r.language, r.topics, r.license, r.created_at, r.updated_at, r.last_seen_at,
            s.summary_zh, s.why_zh, s.quick_start_zh, s.difficulty, s.eta
       from repos r
       left join repo_summaries s on s.repo_id = r.id
      where r.id = $1::bigint`,
    [repoIdParam],
  );
  if (!repoRows.length) {
    sendJson(res, 404, { error: "repo_not_found" });
    return;
  }
  const repoRow = repoRows[0];

  const { rows: cacheRows } = await pool.query(
    `select payload, fetched_at from repo_context where repo_id = $1::bigint`,
    [repoIdParam],
  );
  const cached = cacheRows[0];
  const fresh = cached && Date.now() - new Date(cached.fetched_at).getTime() < CONTEXT_CACHE_TTL_MS;

  let payload;
  if (fresh) {
    payload = cached.payload;
  } else {
    const [{ rows: starRows }, { rows: appearanceRows }] = await Promise.all([
      pool.query(
        `select snapshot_date::text, stars, forks from repo_snapshots where repo_id=$1::bigint order by snapshot_date`,
        [repoIdParam],
      ),
      pool.query(
        `select digest_date::text, rank, score from digest_items where repo_id=$1::bigint order by digest_date`,
        [repoIdParam],
      ),
    ]);

    const { missing, data: github } = await buildGithubContext(repoRow.full_name, repoRow.language);

    payload = {
      cachedAt: new Date().toISOString(),
      db: {
        metadata: {
          id: repoRow.id,
          fullName: repoRow.full_name,
          name: repoRow.name,
          owner: repoRow.owner,
          githubUrl: repoRow.html_url,
          description: repoRow.description,
          language: repoRow.language,
          topics: repoRow.topics || [],
          license: repoRow.license,
          createdAt: repoRow.created_at,
          updatedAt: repoRow.updated_at,
          lastSeenAt: repoRow.last_seen_at,
        },
        summary: repoRow.summary_zh
          ? {
              summary: repoRow.summary_zh,
              why: repoRow.why_zh,
              quickStart: repoRow.quick_start_zh,
              difficulty: repoRow.difficulty,
              eta: repoRow.eta,
            }
          : null,
        starHistory: starRows,
        digestAppearances: appearanceRows,
      },
      github,
      missing,
    };

    await pool.query(
      `insert into repo_context (repo_id, payload, token_estimate, fetched_at)
       values ($1::bigint,$2,$3,now())
       on conflict (repo_id) do update set
         payload=excluded.payload, token_estimate=excluded.token_estimate, fetched_at=now()`,
      [repoIdParam, JSON.stringify(payload), estimateTokens(payload)],
    );
  }

  sendJson(res, 200, trimForDepth(payload, depth));
}

// ---------------------------------------------------------------------------
// On-demand file fetch (P3, two-stage "deep read" Q&A). Lets the browser ask
// for the specific files an LLM decided it needs to read for one question,
// without re-fetching the whole deep context. Paths are user/LLM-supplied,
// so they're validated as relative paths within the repo before ever
// reaching the GitHub API — no `..`, no absolute paths.
// ---------------------------------------------------------------------------

const MAX_REQUESTED_FILES = 5;
const REQUESTED_FILE_TRUNCATE = 8000;

function isSafeRelativePath(path) {
  if (typeof path !== "string" || !path.trim()) return false;
  if (path.startsWith("/")) return false;
  return !path.split("/").some((segment) => segment === "..");
}

async function handleRepoFiles(req, res, repoIdParam) {
  if (!pool) {
    sendJson(res, 503, { error: "DATABASE_URL is not configured" });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const paths = (url.searchParams.get("paths") || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (!paths.length) {
    sendJson(res, 400, { error: "paths_required" });
    return;
  }
  if (paths.length > MAX_REQUESTED_FILES) {
    sendJson(res, 400, { error: "too_many_paths", max: MAX_REQUESTED_FILES });
    return;
  }
  if (paths.some((p) => !isSafeRelativePath(p))) {
    sendJson(res, 400, { error: "invalid_path" });
    return;
  }

  const { rows } = await pool.query(`select full_name from repos where id = $1::bigint`, [repoIdParam]);
  if (!rows.length) {
    sendJson(res, 404, { error: "repo_not_found" });
    return;
  }
  const fullName = rows[0].full_name;

  const results = await Promise.all(
    paths.map(async (path) => ({ path, r: await ghGet(`/repos/${fullName}/contents/${contentsUrlPath(path)}`) })),
  );

  const files = {};
  const missing = [];
  for (const { path, r } of results) {
    const content = r.ok ? decodeContent(r.data) : null;
    if (content) files[path] = content.slice(0, REQUESTED_FILE_TRUNCATE);
    else missing.push(path);
  }

  sendJson(res, 200, { files, missing });
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
  const payload = normalizePicks({ ...rows[0].payload, edition: editionFromDate(rows[0].digest_date) });
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
    `From: =?UTF-8?B?${Buffer.from("Daily AI Digest 電子報").toString("base64")}?= <${GMAIL_USER}>`,
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
    if (req.url?.startsWith("/api/repos/search")) {
      await handleRepoSearch(req, res);
      return;
    }
    const contextMatch = req.url?.match(/^\/api\/repos\/(\d+)\/context(?:\?.*)?$/);
    if (contextMatch) {
      await handleRepoContext(req, res, contextMatch[1]);
      return;
    }
    const filesMatch = req.url?.match(/^\/api\/repos\/(\d+)\/files(?:\?.*)?$/);
    if (filesMatch) {
      await handleRepoFiles(req, res, filesMatch[1]);
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
