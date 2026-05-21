// GitHub API integration for Daily AI Digest.
// Runs in the browser and caches API results in localStorage.

const GITHUB_API = "https://api.github.com";
const CACHE_KEY = "daily-digest-data-zh-v2";
const STARS_KEY = "daily-digest-stars-v1";
const CACHE_TTL = 30 * 60 * 1000;

window.MODEL_COLORS = window.MODEL_COLORS || {
  Claude: { fg: "#c96442", bg: "rgba(201,100,66,0.10)", ring: "rgba(201,100,66,0.35)" },
  Gemini: { fg: "#2a6fdb", bg: "rgba(42,111,219,0.10)", ring: "rgba(42,111,219,0.32)" },
  ChatGPT: { fg: "#137a5a", bg: "rgba(19,122,90,0.10)", ring: "rgba(19,122,90,0.32)" },
};

function detectModels(repo) {
  const text = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
  const models = [];
  if (text.includes("claude") || text.includes("anthropic")) models.push("Claude");
  if (text.includes("gemini") || text.includes("google-ai") || text.includes("googleai")) models.push("Gemini");
  if (text.includes("chatgpt") || text.includes("openai") || /gpt[-]?[45]/.test(text)) models.push("ChatGPT");
  return models.length ? models : ["Claude"];
}

function detectType(repo) {
  const text = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
  if (/\bagent|autonomous|agentic\b/.test(text)) return "Agent";
  if (/\brag\b|retrieval|embedding|\bvector\b/.test(text)) return "RAG";
  if (/\btool\b|plugin|extension|\bmcp\b|server/.test(text)) return "Tool";
  return "Demo";
}

function detectStack(repo) {
  const known = ["TypeScript", "JavaScript", "Python", "Go", "Rust", "Java", "Ruby", "Swift", "Kotlin", "C++", "C#"];
  const stack = repo.language && known.includes(repo.language) ? [repo.language] : [];
  const techTopics = ["react", "next.js", "nextjs", "vue", "svelte", "langchain", "langgraph", "fastapi", "flask", "express", "bun", "deno", "docker", "pytorch", "tensorflow", "mcp"];
  const topics = (repo.topics || []).filter((topic) => techTopics.includes(topic.toLowerCase())).slice(0, 3);
  return [...new Set([...stack, ...topics])].slice(0, 4);
}

function estimateDifficulty(repo) {
  const text = `${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
  if (/demo|example|starter|tutorial|template/.test(text) || repo.stargazers_count < 200) {
    return { label: "簡單", level: 1, eta: "15 分鐘" };
  }
  if (/production|enterprise|kubernetes|distributed/.test(text) || repo.forks_count > 300) {
    return { label: "進階", level: 3, eta: "2 小時" };
  }
  return { label: "中等", level: 2, eta: "45 分鐘" };
}

function getStarDelta(repoId, currentStars) {
  try {
    const cache = JSON.parse(localStorage.getItem(STARS_KEY) || "{}");
    const today = new Date().toDateString();
    const entry = cache[repoId];

    if (entry && entry.date !== today) {
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

function makeSteps(repo, type) {
  const base = [
    `打開 github.com/${repo.full_name}，先快速讀 README 了解專案定位。`,
    `git clone https://github.com/${repo.full_name}`,
  ];

  if (type === "RAG") {
    return [...base, "確認向量資料庫或 embedding 設定。", "依 README 執行 ingest 或 demo 指令。"];
  }
  if (type === "Agent") {
    return [...base, "如果有 .env.example，複製成 .env 並填入 API key。", "安裝依賴後，跑一次範例 Agent 任務。"];
  }
  if (type === "Tool") {
    return [...base, "檢查 tool/plugin 的設定方式。", "啟動本機 server 或 extension 入口點。"];
  }
  return [...base, "安裝專案依賴。", "啟動 demo，觀察它的主要流程。"];
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

function transformRepo(repo, rank) {
  const models = detectModels(repo);
  const type = detectType(repo);
  const diff = estimateDifficulty(repo);
  const description = repo.description || `${repo.owner.login} 維護的 ${repo.name} 專案`;
  const language = repo.language || "未標示語言";

  return {
    id: String(repo.id),
    rank,
    name: repo.name,
    author: repo.owner.login,
    models,
    type,
    stars: repo.stargazers_count,
    starsToday: getStarDelta(repo.id, repo.stargazers_count),
    difficulty: diff.label,
    difficultyLevel: diff.level,
    eta: diff.eta,
    stack: detectStack(repo),
    tagline: repo.name,
    summary: `這是一個由 ${repo.owner.login} 維護的 ${type} 類型專案，和 ${models.join("、")} 生態相關。主要使用 ${language} 開發，目前在 GitHub 上有 ${repo.stargazers_count.toLocaleString()} 顆星。`,
    whyValuable: `這個專案有明確的公開關注度：${repo.stargazers_count.toLocaleString()} 顆星、${repo.forks_count.toLocaleString()} 次 fork，且近期和 ${models.join("、")} 生態有關。`,
    steps: makeSteps(repo, type),
    codePreview: makeCodePreview(repo),
    githubUrl: repo.html_url,
    topics: repo.topics || [],
    license: repo.license?.spdx_id || "N/A",
    updatedAt: repo.updated_at,
  };
}

async function searchRepos(query, token, perPage = 10) {
  const headers = { Accept: "application/vnd.github.v3+json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`,
    { headers },
  );

  if (!res.ok) {
    const remaining = res.headers.get("X-RateLimit-Remaining");
    if (res.status === 403 && remaining === "0") {
      const reset = Number(res.headers.get("X-RateLimit-Reset"));
      throw Object.assign(new Error("rate_limit"), { reset });
    }
    throw new Error(`GitHub API ${res.status}`);
  }

  return res.json();
}

function fallbackData() {
  const repos = [
    {
      id: "fallback-1",
      rank: 1,
      name: "awesome-llm-apps",
      author: "github",
      models: ["Claude", "ChatGPT"],
      type: "Agent",
      stars: 12500,
      starsToday: 0,
      difficulty: "簡單",
      difficultyLevel: 1,
      eta: "15 分鐘",
      stack: ["Python", "TypeScript"],
      tagline: "實用 LLM 應用模式的精選集合。",
      summary: "這是 GitHub 資料暫時無法取得時顯示的預覽資料。加入 token 或稍後重新整理，就能載入即時 repo。",
      whyValuable: "它讓平台在 API 受限時仍能預覽完整介面，不會只看到空白頁。",
      steps: ["如果遇到速率限制，先在設定中加入 GitHub token。", "重新整理今日精選。", "從卡片打開即時 repo。"],
      codePreview: "$ npm install\n$ npm run dev",
      githubUrl: "https://github.com/topics/artificial-intelligence",
      topics: ["ai", "agents"],
      license: "N/A",
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    date: new Date().toISOString().split("T")[0],
    dateLabel: new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "short" }),
    edition: "預覽版",
    totalScanned: 0,
    curated: repos.length,
    picks: repos,
    newlyReleased: [],
    trending: repos.map((repo) => ({ name: repo.name, delta: "+0", pct: "0%" })),
    modelCounts: { Claude: 1, Gemini: 0, ChatGPT: 1 },
    typeCounts: { Agent: 1, RAG: 0, Tool: 0, Demo: 0 },
  };
}

async function loadDigestData(token = null) {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return { data: cached.data, source: "cache" };
    }
  } catch {}

  try {
    const res = await fetch("/api/digest/today", { headers: { Accept: "application/json" } });
    if (res.ok) {
      const data = await res.json();
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
      return { data, source: "database", total: data.totalScanned || 0 };
    }
  } catch {
    // Static/local previews may not have a database API. Fall back to browser-side GitHub fetching.
  }

  const since = new Date(Date.now() - 14 * 86400e3).toISOString().split("T")[0];
  const queries = [
    `claude anthropic in:name,description,topics pushed:>${since}`,
    `gemini google-ai in:name,description,topics pushed:>${since}`,
    `chatgpt openai in:name,description,topics pushed:>${since}`,
  ];

  const settled = await Promise.allSettled(queries.map((query) => searchRepos(query, token, 10)));
  for (const result of settled) {
    if (result.status === "rejected" && result.reason?.message === "rate_limit") throw result.reason;
  }

  const seen = new Set();
  const repos = [];
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const repo of result.value.items || []) {
      if (!repo.fork && !seen.has(repo.id)) {
        seen.add(repo.id);
        repos.push(repo);
      }
    }
  }

  if (!repos.length) return { data: fallbackData(), source: "fallback", total: 0 };

  repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
  const picks = repos.slice(0, 8).map((repo, index) => transformRepo(repo, index + 1));
  const cutoff = Date.now() - 14 * 86400e3;
  const newlyReleased = repos
    .filter((repo) => new Date(repo.created_at).getTime() > cutoff)
    .slice(0, 4)
    .map((repo) => ({
      id: String(repo.id),
      name: repo.name,
      author: repo.owner.login,
      tagline: repo.description || repo.name,
      summary: repo.description || repo.name,
      stars: repo.stargazers_count,
      starsToday: repo.stargazers_count,
      models: detectModels(repo),
      type: detectType(repo),
      githubUrl: repo.html_url,
    }));

  const modelCounts = { Claude: 0, Gemini: 0, ChatGPT: 0 };
  const typeCounts = { Agent: 0, RAG: 0, Tool: 0, Demo: 0 };
  picks.forEach((pick) => {
    pick.models.forEach((model) => { if (modelCounts[model] !== undefined) modelCounts[model] += 1; });
    if (typeCounts[pick.type] !== undefined) typeCounts[pick.type] += 1;
  });

  const total = settled.reduce((sum, result) => sum + (result.value?.total_count || 0), 0);
  const now = new Date();
  const data = {
    date: now.toISOString().split("T")[0],
    dateLabel: now.toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "short" }),
    edition: `第 ${Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 86400e3)} 期`,
    totalScanned: total,
    curated: picks.length,
    picks,
    newlyReleased,
    trending: picks.slice(0, 7).map((pick) => ({ name: pick.name, delta: `+${pick.starsToday || 0}`, pct: "0%" })),
    modelCounts,
    typeCounts,
  };

  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
  return { data, source: "github", total };
}

window.loadDigestData = loadDigestData;
window.clearDigestCache = () => {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(STARS_KEY);
};
