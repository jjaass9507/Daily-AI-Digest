// GitHub API integration for Daily AI Digest
// Uses GitHub Search API — no backend needed, runs in the browser.
//
// Rate limits:
//   Unauthenticated : 10 search requests / hour
//   Authenticated   : 30 search requests / hour
//
// Data is cached in localStorage for 30 minutes to stay within limits.

const GITHUB_API = "https://api.github.com";
const CACHE_KEY   = "daily-digest-data-v1";
const STARS_KEY   = "daily-digest-stars-v1";
const CACHE_TTL   = 30 * 60 * 1000; // 30 minutes

// ─── Classification helpers ──────────────────────────────────────────────────

function detectModels(repo) {
  const t = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
  const models = [];
  if (t.includes("claude") || t.includes("anthropic"))                                   models.push("Claude");
  if (t.includes("gemini") || t.includes("google-ai") || t.includes("googleai"))         models.push("Gemini");
  if (t.includes("chatgpt") || t.includes("openai") || /gpt[-]?[45]/.test(t))           models.push("ChatGPT");
  return models.length ? models : ["Claude"];
}

function detectType(repo) {
  const t = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
  if (/\bagent|autonomous|agentic\b/.test(t))                           return "Agent";
  if (/\brag\b|retrieval|embedding|\bvector\b/.test(t))                 return "RAG";
  if (/\btool\b|plugin|extension|\bmcp\b|server/.test(t))               return "Tool";
  return "Demo";
}

function detectStack(repo) {
  const known = ["TypeScript","JavaScript","Python","Go","Rust","Java","Ruby","Swift","Kotlin","C++","C#"];
  const stack = repo.language && known.includes(repo.language) ? [repo.language] : [];
  const techTopics = ["react","next.js","nextjs","vue","svelte","langchain","langgraph",
                       "fastapi","flask","express","bun","deno","docker","pytorch","tensorflow","mcp"];
  const fromTopics = (repo.topics || []).filter(t => techTopics.includes(t.toLowerCase())).slice(0, 3);
  return [...new Set([...stack, ...fromTopics])].slice(0, 4);
}

function estimateDifficulty(repo) {
  const t = `${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
  if (/demo|example|starter|tutorial|template/.test(t) || repo.stargazers_count < 200)
    return { label: "簡單", level: 1, eta: "15 分鐘" };
  if (/production|enterprise|kubernetes|distributed/.test(t) || repo.forks_count > 300)
    return { label: "進階", level: 3, eta: "2 小時" };
  return { label: "中等", level: 2, eta: "45 分鐘" };
}

function makeSteps(repo, type) {
  const clone = [
    `前往 github.com/${repo.full_name} 閱讀 README，了解專案目標與架構`,
    `git clone https://github.com/${repo.full_name} 並進入目錄`,
  ];
  const byType = {
    Agent: [...clone,
      "複製 .env.example 為 .env，填入所需的 API key（Anthropic / OpenAI 等）",
      "安裝依賴（pip install -r requirements.txt 或 npm install）",
      "執行主程式，觀察 Agent 如何拆解並完成任務",
    ],
    RAG: [...clone,
      "安裝依賴並確認向量資料庫（Chroma / Qdrant / FAISS）設定正確",
      "執行 ingest 腳本，把你的文件灌進向量庫",
      "啟動查詢介面，問幾個問題驗證 RAG pipeline 的準確度",
    ],
    Tool: [...clone,
      "安裝依賴，確認必要的 API key 與環境變數就位",
      "依文件把這個 tool 接進你現有的 Agent 或工作流程",
      "用真實案例測試，檢查輸出是否符合預期",
    ],
    Demo: [...clone,
      "安裝依賴（npm install 或 pip install -r requirements.txt）",
      "設定 .env 中的 API key，啟動本地 dev server",
      "在瀏覽器操作 demo，理解背後的核心技術概念",
    ],
  };
  return (byType[type] || byType.Demo);
}

function makeCodePreview(repo) {
  const install =
    repo.language === "Python"                                             ? "$ pip install -r requirements.txt" :
    repo.language === "TypeScript" || repo.language === "JavaScript"       ? "$ npm install" :
    repo.language === "Go"                                                  ? "$ go mod download" :
    repo.language === "Rust"                                                ? "$ cargo build" : "";
  return [
    `# ${repo.full_name}`,
    `$ git clone https://github.com/${repo.full_name}`,
    `$ cd ${repo.name}`,
    install,
  ].filter(Boolean).join("\n");
}

// ─── Star delta (localStorage cache) ────────────────────────────────────────
// On first load we record today's star count.
// On second load (after time passes) we compare to the stored count.

function getStarDelta(repoId, currentStars) {
  try {
    const cache  = JSON.parse(localStorage.getItem(STARS_KEY) || "{}");
    const today  = new Date().toDateString();
    const entry  = cache[repoId];

    if (entry && entry.date !== today) {
      // A new day — compute delta from yesterday's stored value
      const delta = Math.max(0, currentStars - entry.stars);
      cache[repoId] = { stars: currentStars, date: today };
      localStorage.setItem(STARS_KEY, JSON.stringify(cache));
      return delta;
    }
    if (!entry) {
      cache[repoId] = { stars: currentStars, date: today };
      localStorage.setItem(STARS_KEY, JSON.stringify(cache));
    }
    return 0;
  } catch {
    return 0;
  }
}

// ─── Repo → digest card ──────────────────────────────────────────────────────

function transformRepo(repo, rank) {
  const models = detectModels(repo);
  const type   = detectType(repo);
  const stack  = detectStack(repo);
  const diff   = estimateDifficulty(repo);
  const delta  = getStarDelta(repo.id, repo.stargazers_count);

  const desc = repo.description || "";
  return {
    id:            String(repo.id),
    rank,
    name:          repo.name,
    author:        repo.owner.login,
    models,
    type,
    stars:         repo.stargazers_count,
    starsToday:    delta,
    starsTrend:    [],
    difficulty:    diff.label,
    difficultyLevel: diff.level,
    eta:           diff.eta,
    stack,
    tagline:       desc || repo.name,
    summary:       desc
      ? `${desc}。由 ${repo.owner.login} 維護，使用 ${repo.language || "多種語言"} 開發，目前 GitHub 上有 ${repo.stargazers_count.toLocaleString()} 顆星。`
      : `由 ${repo.owner.login} 開發的 ${type} 類型專案，與 ${models.join("/")} 整合，目前有 ${repo.stargazers_count.toLocaleString()} 顆星。`,
    whyValuable:
      `此專案獲得 ${repo.stargazers_count.toLocaleString()} 顆星、被 fork ${repo.forks_count} 次，社群活躍度高。` +
      (repo.topics?.length ? `\n相關技術標籤：${repo.topics.slice(0, 5).join("、")}。` : ""),
    steps:        makeSteps(repo, type),
    codePreview:  makeCodePreview(repo),
    githubUrl:    repo.html_url,
    topics:       repo.topics || [],
    license:      repo.license?.spdx_id,
    updatedAt:    repo.updated_at,
  };
}

// ─── GitHub Search fetch ─────────────────────────────────────────────────────

async function searchRepos(query, token, perPage = 10) {
  const headers = { Accept: "application/vnd.github.v3+json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`,
    { headers }
  );

  if (!res.ok) {
    const remaining = res.headers.get("X-RateLimit-Remaining");
    if (res.status === 403 && remaining === "0") {
      const reset = res.headers.get("X-RateLimit-Reset");
      throw Object.assign(new Error("rate_limit"), { reset: Number(reset) });
    }
    throw new Error(`GitHub API ${res.status}`);
  }
  return res.json();
}

// ─── Main loader ─────────────────────────────────────────────────────────────

async function loadDigestData(token = null) {
  // Return cached data if fresh
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return { data: cached.data, source: "cache" };
    }
  } catch {}

  // Search GitHub for repos updated in the last 14 days
  const since = new Date(Date.now() - 14 * 86400e3).toISOString().split("T")[0];
  const queries = [
    `claude anthropic in:name,description,topics pushed:>${since}`,
    `gemini google-ai in:name,description,topics pushed:>${since}`,
    `chatgpt openai in:name,description,topics pushed:>${since}`,
  ];

  const settled = await Promise.allSettled(
    queries.map(q => searchRepos(q, token, 10))
  );

  // Surface rate-limit errors
  for (const r of settled) {
    if (r.status === "rejected" && r.reason?.message === "rate_limit") throw r.reason;
  }

  // Merge + deduplicate (exclude forks)
  const seen = new Set();
  const allRepos = [];
  for (const r of settled) {
    if (r.status !== "fulfilled" || !r.value?.items) continue;
    for (const repo of r.value.items) {
      if (!seen.has(repo.id) && !repo.fork) {
        seen.add(repo.id);
        allRepos.push(repo);
      }
    }
  }

  if (!allRepos.length) throw new Error("no_results");

  allRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);

  const picks = allRepos.slice(0, 8).map((r, i) => transformRepo(r, i + 1));

  // Newly released: created in the last 14 days
  const cutoff = Date.now() - 14 * 86400e3;
  const newlyReleased = allRepos
    .filter(r => new Date(r.created_at).getTime() > cutoff)
    .slice(0, 4)
    .map(r => ({
      name: r.name, author: r.owner.login,
      tagline: r.description || r.name,
      stars: r.stargazers_count, starsToday: r.stargazers_count,
      models: detectModels(r), type: detectType(r),
    }));

  // Trending: by star delta, fall back to star rank
  const trending = allRepos.slice(0, 10)
    .map(r => {
      const d = getStarDelta(r.id, r.stargazers_count);
      return { name: r.name, delta: `+${d || "?"}`, pct: d ? `+${((d / r.stargazers_count) * 100).toFixed(1)}%` : "新上榜", _d: d };
    })
    .sort((a, b) => b._d - a._d)
    .slice(0, 7)
    .map(({ _d, ...rest }) => rest);

  const modelCounts = { Claude: 0, Gemini: 0, ChatGPT: 0 };
  const typeCounts  = { Agent: 0, RAG: 0, Tool: 0, Demo: 0 };
  picks.forEach(p => {
    p.models.forEach(m => { if (m in modelCounts) modelCounts[m]++; });
    if (p.type in typeCounts) typeCounts[p.type]++;
  });

  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const doy  = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 86400e3);
  const total = settled.reduce((s, r) => s + (r.value?.total_count || 0), 0);

  const data = {
    date:          now.toISOString().split("T")[0],
    dateLabel:     `${now.getFullYear()} 年 ${now.getMonth()+1} 月 ${now.getDate()} 日 · 週${days[now.getDay()]}`,
    edition:       `Vol. ${doy}`,
    totalScanned:  total,
    curated:       picks.length,
    picks,
    newlyReleased: newlyReleased.length >= 2 ? newlyReleased : window.DIGEST_DATA.newlyReleased,
    trending:      trending.length >= 2 ? trending : window.DIGEST_DATA.trending,
    modelCounts,
    typeCounts,
  };

  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}

  return { data, source: "github", total };
}

window.loadDigestData    = loadDigestData;
window.clearDigestCache  = () => {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(STARS_KEY);
  console.log("[digest] cache cleared");
};
