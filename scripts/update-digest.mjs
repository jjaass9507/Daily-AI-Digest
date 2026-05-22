import { existsSync, readFileSync } from "node:fs";
import pg from "pg";

const { Pool } = pg;

loadLocalEnv();

const GITHUB_API = "https://api.github.com";
const DATABASE_URL = process.env.DATABASE_URL;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const DIGEST_SIZE = Number(process.env.DIGEST_SIZE || 15);
const TIME_ZONE = "Asia/Taipei";

if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL. Set it in Render or your local .env.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "daily-ai-digest",
};
if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

function loadLocalEnv() {
  if (!existsSync(".env")) return;
  const lines = readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function taipeiDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateLabel(date = new Date()) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function dayOfYear(date = new Date()) {
  const taipei = new Date(`${taipeiDate(date)}T00:00:00+08:00`);
  const start = new Date("2026-05-21T00:00:00+08:00");
  return Math.max(1, Math.floor((taipei - start) / 86400e3) + 1);
}

function detectModels(repo, readme = "") {
  const text = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")} ${readme.slice(0, 2000)}`.toLowerCase();
  const models = [];
  if (text.includes("claude") || text.includes("anthropic")) models.push("Claude");
  if (text.includes("gemini") || text.includes("google-ai") || text.includes("googleai")) models.push("Gemini");
  if (text.includes("chatgpt") || text.includes("openai") || /gpt[-]?[45]/.test(text)) models.push("ChatGPT");
  return models.length ? models : ["Claude"];
}

function detectType(repo, readme = "") {
  const text = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")} ${readme.slice(0, 3000)}`.toLowerCase();
  if (/\bagent|autonomous|agentic|multi-agent|workflow\b/.test(text)) return "Agent";
  if (/\brag\b|retrieval|embedding|\bvector\b|qdrant|chroma|faiss/.test(text)) return "RAG";
  if (/\btool\b|plugin|extension|\bmcp\b|server|api/.test(text)) return "Tool";
  return "Demo";
}

function detectStack(repo) {
  const known = ["TypeScript", "JavaScript", "Python", "Go", "Rust", "Java", "Ruby", "Swift", "Kotlin", "C++", "C#"];
  const stack = repo.language && known.includes(repo.language) ? [repo.language] : [];
  const techTopics = (repo.topics || []).filter((topic) =>
    ["react", "next.js", "nextjs", "vue", "svelte", "langchain", "langgraph", "fastapi", "flask", "express", "bun", "deno", "docker", "pytorch", "tensorflow", "mcp"].includes(topic.toLowerCase()),
  );
  return [...new Set([...stack, ...techTopics])].slice(0, 4);
}

function estimateDifficulty(repo, readme = "") {
  const text = `${repo.description || ""} ${(repo.topics || []).join(" ")} ${readme.slice(0, 2500)}`.toLowerCase();
  if (/demo|example|starter|tutorial|template|quickstart/.test(text) || repo.stargazers_count < 200) {
    return { label: "入門", level: 1, eta: "15 分鐘" };
  }
  if (/production|enterprise|kubernetes|distributed|self-host|deployment/.test(text) || repo.forks_count > 300) {
    return { label: "進階", level: 3, eta: "2 小時" };
  }
  return { label: "中階", level: 2, eta: "45 分鐘" };
}

function cleanReadme(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+]\([^)]+\)/g, (match) => match.match(/\[([^\]]+)]/)?.[1] || " ")
    .replace(/[#>*_`~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentence(text, max = 180) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.length > max ? `${cleaned.slice(0, max).trim()}...` : cleaned;
}

function pickReadmeSignal(repo, readme) {
  const cleaned = cleanReadme(readme);
  if (cleaned.length > 120) return sentence(cleaned, 220);
  return repo.description || `${repo.owner.login} 維護的 ${repo.name} 專案`;
}

function makeSummary(repo, models, type, readme) {
  const language = repo.language || "未標示語言";
  const signal = pickReadmeSignal(repo, readme);
  return `這是一個由 ${repo.owner.login} 維護的 ${type} 類 AI 專案，主要與 ${models.join("、")} 生態相關。${signal} 目前以 ${language} 為主要技術，GitHub 上已有 ${repo.stargazers_count.toLocaleString()} 顆星。`;
}

function makeWhy(repo, models, readme) {
  const hasDocs = /docs|documentation|guide|quickstart|getting started/i.test(readme);
  const hasDemo = /demo|example|playground|sample/i.test(readme);
  const extras = [];
  if (hasDocs) extras.push("README 具備文件或上手指引");
  if (hasDemo) extras.push("提供 demo 或範例可快速驗證");
  const extraText = extras.length ? `，而且${extras.join("、")}` : "";
  return `它值得收錄是因為近期仍有更新，且已有 ${repo.stargazers_count.toLocaleString()} 顆星與 ${repo.forks_count.toLocaleString()} 次 fork，可作為評估 ${models.join("、")} 工作流、工具整合或產品原型的參考${extraText}。`;
}

function makeSteps(repo, type, readme) {
  const base = [
    `打開 github.com/${repo.full_name}，先閱讀 README 的安裝方式與限制。`,
    `git clone https://github.com/${repo.full_name}`,
  ];
  const hasEnv = /\.env|api key|token|OPENAI|ANTHROPIC|GEMINI/i.test(readme);
  const install =
    repo.language === "Python" ? "安裝 Python 依賴，通常是 pip install -r requirements.txt。" :
    repo.language === "Go" ? "下載 Go module，並依照 README 執行啟動指令。" :
    repo.language === "Rust" ? "先執行 cargo build，再依 README 啟動範例。" :
    "安裝 Node 依賴，通常是 npm install 或 pnpm install。";

  if (type === "RAG") return [...base, install, "準備測試資料、embedding model 與向量資料庫設定，再執行 ingest 流程。"];
  if (type === "Agent") return [...base, hasEnv ? "複製 .env.example 並填入必要模型 API key。" : "確認 README 是否需要模型 API key。", install, "先跑官方範例任務，觀察 Agent 的決策與工具呼叫流程。"];
  if (type === "Tool") return [...base, install, "確認 tool/plugin 的設定方式，先用最小範例測試是否能被模型或應用程式呼叫。"];
  return [...base, install, "啟動 demo，觀察它解決的使用情境與可延伸方向。"];
}

function makeCodePreview(repo) {
  const install =
    repo.language === "Python" ? "$ pip install -r requirements.txt" :
    repo.language === "TypeScript" || repo.language === "JavaScript" ? "$ npm install" :
    repo.language === "Go" ? "$ go mod download" :
    repo.language === "Rust" ? "$ cargo build" : "";
  return [
    `# ${repo.full_name}`,
    `$ git clone https://github.com/${repo.full_name}`,
    `$ cd ${repo.name}`,
    install,
  ].filter(Boolean).join("\n");
}

function scoreRepo(repo) {
  const pushedAt = new Date(repo.pushed_at || repo.updated_at || repo.created_at).getTime();
  const recencyDays = Math.max(1, (Date.now() - pushedAt) / 86400e3);
  const starScore = Math.log10(Math.max(10, repo.stargazers_count)) * 18;
  const forkScore = Math.log10(Math.max(5, repo.forks_count + 1)) * 8;
  const recencyScore = Math.max(0, 18 - recencyDays);
  const topicScore = (repo.topics || []).length * 1.5;
  return Number((starScore + forkScore + recencyScore + topicScore).toFixed(2));
}

async function githubJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${url}`);
  return res.json();
}

async function searchRepos(query, perPage = 12) {
  return githubJson(`${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`);
}

async function fetchReadme(repo) {
  const url = `${GITHUB_API}/repos/${repo.full_name}/readme`;
  const res = await fetch(url, { headers });
  if (!res.ok) return { text: "", sha: null };
  const json = await res.json();
  if (!json.content) return { text: "", sha: json.sha || null };
  return {
    text: Buffer.from(json.content, "base64").toString("utf8"),
    sha: json.sha || null,
  };
}

function toDigestItem(repo, rank, readmeText, readmeSha, previousStars = 0) {
  const models = detectModels(repo, readmeText);
  const type = detectType(repo, readmeText);
  const difficulty = estimateDifficulty(repo, readmeText);
  const summary = makeSummary(repo, models, type, readmeText);
  const why = makeWhy(repo, models, readmeText);
  const quickStart = makeSteps(repo, type, readmeText);
  const starsToday = Math.max(0, repo.stargazers_count - previousStars);

  return {
    id: String(repo.id),
    rank,
    name: repo.name,
    author: repo.owner.login,
    fullName: repo.full_name,
    githubUrl: repo.html_url,
    models,
    type,
    stars: repo.stargazers_count,
    starsToday,
    forks: repo.forks_count,
    difficulty: difficulty.label,
    difficultyLevel: difficulty.level,
    eta: difficulty.eta,
    stack: detectStack(repo),
    tagline: repo.description || repo.name,
    summary,
    whyValuable: why,
    steps: quickStart,
    codePreview: makeCodePreview(repo),
    topics: repo.topics || [],
    license: repo.license?.spdx_id || "N/A",
    updatedAt: repo.updated_at,
    readmeSha,
    score: scoreRepo(repo),
  };
}

async function previousStars(client, repoId, digestDate) {
  const { rows } = await client.query(
    `select stars from repo_snapshots
     where repo_id = $1 and snapshot_date < $2
     order by snapshot_date desc
     limit 1`,
    [repoId, digestDate],
  );
  return rows[0]?.stars || 0;
}

async function upsertRepo(client, repo) {
  await client.query(
    `insert into repos (id, full_name, name, owner, html_url, description, language, topics, license, created_at, updated_at, last_seen_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
     on conflict (id) do update set
       full_name = excluded.full_name,
       name = excluded.name,
       owner = excluded.owner,
       html_url = excluded.html_url,
       description = excluded.description,
       language = excluded.language,
       topics = excluded.topics,
       license = excluded.license,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       last_seen_at = now()`,
    [
      repo.id,
      repo.full_name,
      repo.name,
      repo.owner.login,
      repo.html_url,
      repo.description,
      repo.language,
      repo.topics || [],
      repo.license?.spdx_id || null,
      repo.created_at,
      repo.updated_at,
    ],
  );
}

async function saveDigest(client, digestDate, data, reposById) {
  await client.query("begin");
  try {
    for (const item of data.picks) {
      const repo = reposById.get(Number(item.id));
      await upsertRepo(client, repo);
      await client.query(
        `insert into repo_snapshots (repo_id, snapshot_date, stars, forks, pushed_at)
         values ($1,$2,$3,$4,$5)
         on conflict (repo_id, snapshot_date) do update set
           stars = excluded.stars,
           forks = excluded.forks,
           pushed_at = excluded.pushed_at`,
        [repo.id, digestDate, repo.stargazers_count, repo.forks_count, repo.pushed_at],
      );
      await client.query(
        `insert into repo_summaries (repo_id, readme_sha, readme_excerpt, summary_zh, why_zh, quick_start_zh, difficulty, eta, generated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,now())
         on conflict (repo_id) do update set
           readme_sha = excluded.readme_sha,
           readme_excerpt = excluded.readme_excerpt,
           summary_zh = excluded.summary_zh,
           why_zh = excluded.why_zh,
           quick_start_zh = excluded.quick_start_zh,
           difficulty = excluded.difficulty,
           eta = excluded.eta,
           generated_at = now()`,
        [
          repo.id,
          item.readmeSha,
          pickReadmeSignal(repo, item.summary).slice(0, 500),
          item.summary,
          item.whyValuable,
          JSON.stringify(item.steps),
          item.difficulty,
          item.eta,
        ],
      );
    }

    await client.query(
      `insert into digest_editions (digest_date, edition, theme, total_scanned, curated_count, payload, generated_at)
       values ($1,$2,$3,$4,$5,$6,now())
       on conflict (digest_date) do update set
         edition = excluded.edition,
         theme = excluded.theme,
         total_scanned = excluded.total_scanned,
         curated_count = excluded.curated_count,
         payload = excluded.payload,
         generated_at = now()`,
      [digestDate, data.edition, data.theme, data.totalScanned, data.curated, JSON.stringify(data)],
    );

    await client.query("delete from digest_items where digest_date = $1", [digestDate]);
    for (const item of data.picks) {
      await client.query(
        `insert into digest_items (digest_date, repo_id, rank, score, models, item_type, payload)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [digestDate, Number(item.id), item.rank, item.score, item.models, item.type, JSON.stringify(item)],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function main() {
  const digestDate = taipeiDate();
  const since = taipeiDate(new Date(Date.now() - 14 * 86400e3));
  const queries = [
    `claude anthropic in:name,description,topics pushed:>${since}`,
    `gemini google-ai in:name,description,topics pushed:>${since}`,
    `chatgpt openai in:name,description,topics pushed:>${since}`,
    `ai agent mcp in:name,description,topics pushed:>${since}`,
    `rag embedding vector in:name,description,topics pushed:>${since}`,
  ];

  const results = await Promise.allSettled(queries.map((query) => searchRepos(query)));
  const reposById = new Map();
  let totalScanned = 0;
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    totalScanned += result.value.total_count || 0;
    for (const repo of result.value.items || []) {
      if (!repo.fork) reposById.set(repo.id, repo);
    }
  }

  const candidates = [...reposById.values()].sort((a, b) => scoreRepo(b) - scoreRepo(a)).slice(0, DIGEST_SIZE);
  if (!candidates.length) throw new Error("No GitHub candidates were found.");

  const client = await pool.connect();
  try {
    const items = [];
    for (const repo of candidates) {
      const { text, sha } = await fetchReadme(repo);
      const previous = await previousStars(client, repo.id, digestDate);
      items.push(toDigestItem(repo, items.length + 1, text, sha, previous));
    }

    const data = {
      date: digestDate,
      dateLabel: dateLabel(),
      edition: `第 ${dayOfYear()} 期`,
      theme: "今日值得關注的 AI 開源專案",
      totalScanned,
      curated: items.length,
      picks: items,
      newlyReleased: items.filter((item) => {
        const repo = reposById.get(Number(item.id));
        return Date.now() - new Date(repo.created_at).getTime() < 14 * 86400e3;
      }).slice(0, 4),
      trending: items.slice(0, 7).map((item) => ({ name: item.name, delta: `+${item.starsToday || 0}`, pct: "0%" })),
      modelCounts: { Claude: 0, Gemini: 0, ChatGPT: 0 },
      typeCounts: { Agent: 0, RAG: 0, Tool: 0, Demo: 0 },
    };

    for (const item of items) {
      item.models.forEach((model) => { if (data.modelCounts[model] !== undefined) data.modelCounts[model] += 1; });
      if (data.typeCounts[item.type] !== undefined) data.typeCounts[item.type] += 1;
    }

    await saveDigest(client, digestDate, data, reposById);
    console.log(`Saved ${items.length} digest items for ${digestDate}.`);
    console.log(`Top repos: ${items.slice(0, 3).map((item) => item.fullName).join(", ")}`);
    console.log(`Total scanned: ${totalScanned}.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
