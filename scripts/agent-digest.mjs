// Agent-side digest runner. No DB dependency.
// Fetches GitHub repos, builds digest payload, POSTs to Render.
// Required env vars: RENDER_URL, INTERNAL_API_KEY
// Optional env vars: GITHUB_TOKEN, DIGEST_SIZE

const GITHUB_API = "https://api.github.com";
const RENDER_URL = (process.env.RENDER_URL || "").replace(/\/$/, "");
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const DIGEST_SIZE = Number(process.env.DIGEST_SIZE || 15);

if (!RENDER_URL) { console.error("Missing RENDER_URL"); process.exit(1); }
if (!INTERNAL_API_KEY) { console.error("Missing INTERNAL_API_KEY"); process.exit(1); }

const githubHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "daily-ai-digest",
};
if (GITHUB_TOKEN) githubHeaders.Authorization = `Bearer ${GITHUB_TOKEN}`;

function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function detectModels(repo) {
  const text = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
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
  const topics = (repo.topics || []).filter((t) =>
    ["react", "next.js", "nextjs", "vue", "svelte", "langchain", "langgraph", "fastapi", "flask", "express", "bun", "deno", "docker", "pytorch", "tensorflow", "mcp"].includes(t.toLowerCase()),
  );
  return [...new Set([...stack, ...topics])].slice(0, 4);
}

function estimateDifficulty(repo, readme = "") {
  const text = `${repo.description || ""} ${(repo.topics || []).join(" ")} ${readme.slice(0, 2500)}`.toLowerCase();
  if (/demo|example|starter|tutorial|template|quickstart/.test(text) || repo.stargazers_count < 200) {
    return { label: "簡單", level: 1, eta: "15 分鐘" };
  }
  if (/production|enterprise|kubernetes|distributed|self-host|deployment/.test(text) || repo.forks_count > 300) {
    return { label: "進階", level: 3, eta: "2 小時" };
  }
  return { label: "中等", level: 2, eta: "45 分鐘" };
}

function cleanReadme(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+]\([^)]+\)/g, (m) => m.match(/\[([^\]]+)]/)?.[1] || " ")
    .replace(/[#>*_`~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickReadmeSignal(repo, readme) {
  const cleaned = cleanReadme(readme);
  if (cleaned.length > 120) return cleaned.slice(0, 260);
  return repo.description || `${repo.owner.login} 維護的 ${repo.name} 專案`;
}

function makeSummary(repo, models, type, readme) {
  const language = repo.language || "未標示語言";
  const signal = pickReadmeSignal(repo, readme);
  return `這是一個由 ${repo.owner.login} 維護的 ${type} 類型專案，和 ${models.join("、")} 生態相關。${signal}。主要使用 ${language} 開發，目前在 GitHub 上有 ${repo.stargazers_count.toLocaleString()} 顆星。`;
}

function makeWhy(repo, models, readme) {
  const hasDocs = /docs|documentation|guide|quickstart|getting started/i.test(readme);
  const hasDemo = /demo|example|playground|sample/i.test(readme);
  const extras = [];
  if (hasDocs) extras.push("README 或文件訊號完整");
  if (hasDemo) extras.push("具備 demo 或範例入口");
  const extraText = extras.length ? `，而且${extras.join("、")}` : "";
  return `這個專案有明確的公開關注度：${repo.stargazers_count.toLocaleString()} 顆星、${repo.forks_count.toLocaleString()} 次 fork，近期也和 ${models.join("、")} 生態相關${extraText}。`;
}

function makeSteps(repo, type, readme) {
  const base = [
    `打開 github.com/${repo.full_name}，先快速讀 README 了解專案定位。`,
    `git clone https://github.com/${repo.full_name}`,
  ];
  const hasEnv = /\.env|api key|token|OPENAI|ANTHROPIC|GEMINI/i.test(readme);
  const install =
    repo.language === "Python" ? "安裝 Python 依賴，通常是 pip install -r requirements.txt。" :
    repo.language === "Go" ? "下載 Go module 並執行 README 內的啟動指令。" :
    repo.language === "Rust" ? "先執行 cargo build，再依 README 啟動範例。" :
    "安裝 Node 依賴，通常是 npm install 或 pnpm install。";
  if (type === "RAG") return [...base, install, "確認向量資料庫、embedding model 或資料 ingest 設定。"];
  if (type === "Agent") return [...base, hasEnv ? "複製 .env.example 並填入模型 API key。" : "確認 README 是否需要模型 API key。", install, "跑一次範例任務，觀察 Agent 的工具調用流程。"];
  if (type === "Tool") return [...base, install, "檢查 tool/plugin 設定方式，再接到你的工作流測試。"];
  return [...base, install, "啟動 demo，觀察它解決的使用情境。"];
}

function makeCodePreview(repo) {
  const install =
    repo.language === "Python" ? "$ pip install -r requirements.txt" :
    repo.language === "TypeScript" || repo.language === "JavaScript" ? "$ npm install" :
    repo.language === "Go" ? "$ go mod download" :
    repo.language === "Rust" ? "$ cargo build" : "";
  return [`# ${repo.full_name}`, `$ git clone https://github.com/${repo.full_name}`, `$ cd ${repo.name}`, install].filter(Boolean).join("\n");
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
  const res = await fetch(url, { headers: githubHeaders });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${url}`);
  return res.json();
}

async function searchRepos(query, perPage = 12) {
  return githubJson(`${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`);
}

async function fetchReadme(repo) {
  const res = await fetch(`${GITHUB_API}/repos/${repo.full_name}/readme`, { headers: githubHeaders });
  if (!res.ok) return { text: "", sha: null };
  const json = await res.json();
  if (!json.content) return { text: "", sha: json.sha || null };
  return { text: Buffer.from(json.content, "base64").toString("utf8"), sha: json.sha || null };
}

function toDigestItem(repo, rank, readmeText, readmeSha) {
  const models = detectModels(repo);
  const type = detectType(repo, readmeText);
  const difficulty = estimateDifficulty(repo, readmeText);
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
    starsToday: 0,
    forks: repo.forks_count,
    difficulty: difficulty.label,
    difficultyLevel: difficulty.level,
    eta: difficulty.eta,
    stack: detectStack(repo),
    tagline: repo.name,
    summary: makeSummary(repo, models, type, readmeText),
    whyValuable: makeWhy(repo, models, readmeText),
    steps: makeSteps(repo, type, readmeText),
    codePreview: makeCodePreview(repo),
    topics: repo.topics || [],
    license: repo.license?.spdx_id || "N/A",
    updatedAt: repo.updated_at,
    readmeSha,
    score: scoreRepo(repo),
  };
}

async function main() {
  const digestDate = isoDate();
  const since = new Date(Date.now() - 14 * 86400e3).toISOString().slice(0, 10);
  const queries = [
    `claude anthropic in:name,description,topics pushed:>${since}`,
    `gemini google-ai in:name,description,topics pushed:>${since}`,
    `chatgpt openai in:name,description,topics pushed:>${since}`,
    `ai agent mcp in:name,description,topics pushed:>${since}`,
    `rag embedding vector in:name,description,topics pushed:>${since}`,
  ];

  console.log(`Searching GitHub for repos since ${since}...`);
  const results = await Promise.allSettled(queries.map((q) => searchRepos(q)));
  const reposById = new Map();
  let totalScanned = 0;
  for (const result of results) {
    if (result.status !== "fulfilled") { console.warn("Query failed:", result.reason?.message); continue; }
    totalScanned += result.value.total_count || 0;
    for (const repo of result.value.items || []) {
      if (!repo.fork) reposById.set(repo.id, repo);
    }
  }
  console.log(`Found ${reposById.size} unique repos (total_count ~${totalScanned})`);

  const candidates = [...reposById.values()].sort((a, b) => scoreRepo(b) - scoreRepo(a)).slice(0, DIGEST_SIZE);
  const items = [];
  for (const repo of candidates) {
    const { text, sha } = await fetchReadme(repo);
    items.push(toDigestItem(repo, items.length + 1, text, sha));
    console.log(`  [${items.length}] ${repo.full_name} (★${repo.stargazers_count})`);
  }

  const now = new Date();
  const digest = {
    date: digestDate,
    dateLabel: now.toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "short" }),
    edition: `第 ${Math.max(1, Math.floor((now - new Date("2026-05-21T00:00:00+08:00")) / 86400e3) + 1)} 期`,
    theme: "今日值得追蹤的 AI 開源專案",
    totalScanned,
    curated: items.length,
    picks: items,
    newlyReleased: items.filter((item) => {
      const repo = reposById.get(Number(item.id));
      return repo && Date.now() - new Date(repo.created_at).getTime() < 14 * 86400e3;
    }).slice(0, 4),
    trending: items.slice(0, 7).map((item) => ({ name: item.name, delta: `+${item.starsToday}`, pct: "0%" })),
    modelCounts: { Claude: 0, Gemini: 0, ChatGPT: 0 },
    typeCounts: { Agent: 0, RAG: 0, Tool: 0, Demo: 0 },
  };
  for (const item of items) {
    item.models.forEach((m) => { if (m in digest.modelCounts) digest.modelCounts[m] += 1; });
    if (item.type in digest.typeCounts) digest.typeCounts[item.type] += 1;
  }

  console.log(`Posting digest for ${digestDate} to Render...`);
  const res = await fetch(`${RENDER_URL}/internal/digest/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${INTERNAL_API_KEY}`,
    },
    body: JSON.stringify({ repos: [...reposById.values()], digest }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Render endpoint returned ${res.status}: ${text}`);
    process.exit(1);
  }

  const result = await res.json();
  console.log(`Done: saved ${result.saved} items for ${result.date}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
