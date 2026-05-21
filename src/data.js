// Mock daily-digest data: GitHub repos related to Gemini / ChatGPT / Claude
// All content is illustrative — repos are fictional composites for design purposes.

window.DIGEST_DATA = {
  date: "2026-05-21",
  dateLabel: "2026 年 5 月 21 日 · 週四",
  edition: "Vol. 142",
  totalScanned: 3284,
  curated: 12,
  picks: [
    {
      id: "claude-pocket-agent",
      rank: 1,
      name: "claude-pocket-agent",
      author: "soren-l",
      models: ["Claude"],
      type: "Agent",
      stars: 4821,
      starsToday: 612,
      starsTrend: [12, 18, 24, 31, 48, 92, 187, 612],
      difficulty: "中等",
      difficultyLevel: 2,
      eta: "30 分鐘",
      stack: ["TypeScript", "Bun", "MCP", "SQLite"],
      tagline: "把 Claude 變成一個可以背在口袋裡的本地代理人",
      summary:
        "一個極輕量的本地 Agent runtime，把 Anthropic 的 MCP 協議實作成 single-binary，可以離線運行、用 SQLite 持久化會話、並支援多個本地工具。重點是它把 Agent 的「身份」抽象成一個可攜的 .agent 檔，丟到任何電腦上都能恢復記憶與工具設定。",
      whyValuable:
        "市面上的 Agent 框架幾乎都假設你會跑在雲端，這個專案把整套 stack 壓到單一可執行檔，對需要在客戶內網或邊緣裝置部署的開發者很有意義。",
      steps: [
        "下載對應平台的 binary，第一次啟動會問你的 Anthropic API key",
        "用 agent init my-agent 建立第一個代理人，會自動產生 .agent 設定檔",
        "在 tools/ 資料夾放入任何 MCP server，啟動時會自動偵測並掛載",
        "用 agent chat 開始對話，所有訊息會即時寫入本地 SQLite",
        "用 agent export 把整個身份打包成單一檔案，可以在其他機器復原",
      ],
      codePreview: `$ agent init research-bot
✓ created .agent/config.toml
✓ scanned tools/ — found 4 MCP servers
✓ Claude Sonnet 4.5 ready

$ agent chat
> 幫我整理今天的 GitHub trending`,
    },
    {
      id: "gemini-canvas-lab",
      rank: 2,
      name: "gemini-canvas-lab",
      author: "kira-research",
      models: ["Gemini"],
      type: "Demo",
      stars: 3104,
      starsToday: 421,
      starsTrend: [8, 14, 22, 38, 67, 124, 256, 421],
      difficulty: "簡單",
      difficultyLevel: 1,
      eta: "10 分鐘",
      stack: ["Next.js", "Gemini 2.5", "Canvas API"],
      tagline: "用 Gemini 的多模態能力即時把草圖變成可互動原型",
      summary:
        "示範 Gemini 2.5 在 streaming 模式下如何接住一張正在被畫的草圖，並逐步生成對應的 React 元件碼。整個 demo 跑在純前端，連 server 都不用，是研究多模態互動的好起點。",
      whyValuable:
        "幾乎所有「sketch-to-code」展示都需要後端，這個 repo 把它壓到 600 行純前端、可在 CodeSandbox 直接 fork 玩，對 PM 跟設計師很友善。",
      steps: [
        "Fork 這個 repo 或在 CodeSandbox 開啟",
        "在 .env 放入 Gemini API key（free tier 就能跑）",
        "npm run dev 啟動本地預覽",
        "在左邊畫布隨便畫一個 UI 草圖，右邊會 streaming 出 React 碼",
        "點擊任何已生成的元件可以再用文字微調樣式",
      ],
      codePreview: `// streamFromCanvas.ts
const stream = await gemini.generateContentStream({
  model: 'gemini-2.5-flash',
  contents: [imageBlob, '把這張草圖變成 React'],
});`,
    },
    {
      id: "gpt-deep-research-kit",
      rank: 3,
      name: "gpt-deep-research-kit",
      author: "nori-ai",
      models: ["ChatGPT"],
      type: "RAG",
      stars: 6730,
      starsToday: 389,
      starsTrend: [42, 58, 71, 96, 142, 198, 287, 389],
      difficulty: "進階",
      difficultyLevel: 3,
      eta: "2 小時",
      stack: ["Python", "LangGraph", "Qdrant", "GPT-5"],
      tagline: "把 OpenAI 的 deep research 邏輯拆解成可以自架的 pipeline",
      summary:
        "這個專案逆向研究了「逐步擴展檢索 + 自我反思」的 deep research 模式，並用 LangGraph 把它組成一個可觀察、可中斷的圖。內附三種搜尋後端（Tavily、Exa、自架 SearXNG）的 adapter。",
      whyValuePartial: "若你想做企業內部的研究助理，這份程式碼幾乎可以直接拿來用。",
      whyValuable:
        "把一個原本黑箱的功能拆得很清楚，每個節點都能單獨換掉模型或檢索源。文件甚至附了 cost 分析跟 latency benchmark。",
      steps: [
        "git clone 並 uv sync 安裝依賴",
        "複製 .env.example，填入 OpenAI 跟其中一個搜尋 API key",
        "執行 python -m research_kit.bootstrap 建立向量資料庫",
        "用 research_kit.run('你的研究題目') 啟動 pipeline",
        "在 LangSmith 或內建的 trace UI 觀察每一步的 reasoning",
      ],
      codePreview: `graph = StateGraph(ResearchState)
graph.add_node("plan", plan_step)
graph.add_node("search", parallel_search)
graph.add_node("reflect", reflect_and_expand)
graph.add_conditional_edges("reflect", should_continue)`,
    },
    {
      id: "mcp-mesh",
      rank: 4,
      name: "mcp-mesh",
      author: "wovenlabs",
      models: ["Claude", "ChatGPT"],
      type: "Tool",
      stars: 2156,
      starsToday: 287,
      starsTrend: [5, 9, 14, 28, 52, 98, 176, 287],
      difficulty: "中等",
      difficultyLevel: 2,
      eta: "45 分鐘",
      stack: ["Go", "MCP", "OpenAPI"],
      tagline: "讓多個 MCP server 像 service mesh 一樣協作的路由層",
      summary:
        "當你的 Agent 同時掛了 10+ 個 MCP server，工具命名衝突、權限管理、觀測會立刻變成噩夢。mcp-mesh 把這些痛點抽成一個輕量 proxy，提供命名空間、RBAC、metrics 與工具版本管理。",
      whyValuable:
        "MCP 生態剛起步，路由與治理是還沒被認真解決的問題，這是目前看過最完整的嘗試。",
      steps: [
        "用 go install 或 docker pull 取得 mesh binary",
        "撰寫 mesh.toml 列出所有要納管的 upstream MCP server",
        "啟動 mesh，它會在本地 expose 一個統一的 MCP endpoint",
        "把 Claude Desktop 或 Cursor 指向這個 endpoint",
        "在 :8080/admin 觀察每個工具的呼叫頻率與延遲",
      ],
      codePreview: `# mesh.toml
[[upstream]]
name = "github"
url  = "stdio://./mcp-github"
namespace = "gh"
rbac = ["read:repo"]`,
    },
    {
      id: "shaderbench",
      rank: 5,
      name: "shaderbench",
      author: "minoru-k",
      models: ["Claude", "Gemini", "ChatGPT"],
      type: "Demo",
      stars: 982,
      starsToday: 214,
      starsTrend: [3, 7, 12, 24, 48, 96, 158, 214],
      difficulty: "簡單",
      difficultyLevel: 1,
      eta: "15 分鐘",
      stack: ["WebGPU", "Vite", "TypeScript"],
      tagline: "三家 LLM 寫 shader 的橫向 benchmark，結果意外有趣",
      summary:
        "作者用 200 道 shader 題目，讓 Claude Sonnet 4.5、Gemini 2.5 Pro、GPT-5 各自挑戰，記錄編譯成功率、視覺正確率、token 消耗。網站上每一題都可以即時 fork 編輯。",
      whyValuable:
        "shader 是少數能客觀比較程式生成品質的領域（編譯不過就是錯），這個 benchmark 的設計很有啟發性，且資料集完全開放。",
      steps: [
        "造訪 shaderbench.dev 看 leaderboard",
        "點任何一題進入「三家對決」視圖，左中右並排程式碼與輸出",
        "想自己跑：clone repo，pnpm install 後 pnpm bench --models all",
        "結果會以 JSONL 寫入 results/，可匯入 Observable 視覺化",
        "歡迎提交新題目到 problems/，作者會定期重跑",
      ],
      codePreview: `# 跑一輪 benchmark
$ pnpm bench --models claude,gemini,gpt --problems 1-50

→ claude   42/50 ✅  avg 1.8s  $0.21
→ gemini   38/50 ✅  avg 1.1s  $0.04
→ gpt      45/50 ✅  avg 2.4s  $0.31`,
    },
  ],
  newlyReleased: [
    {
      name: "claude-skills-yaml",
      author: "anthropic-community",
      tagline: "把 Claude Skills 用純 YAML 描述、自動生成 system prompt",
      stars: 412,
      starsToday: 412,
      models: ["Claude"],
      type: "Tool",
    },
    {
      name: "gemini-live-translate",
      author: "tamako",
      tagline: "Gemini Live API 的即時口譯耳機 demo",
      stars: 289,
      starsToday: 289,
      models: ["Gemini"],
      type: "Demo",
    },
    {
      name: "gpt-voice-agent-starter",
      author: "openai-cookbook",
      tagline: "用 GPT Realtime + Twilio 做語音客服的最小範例",
      stars: 651,
      starsToday: 651,
      models: ["ChatGPT"],
      type: "Agent",
    },
    {
      name: "rag-eval-suite",
      author: "deepset",
      tagline: "跨三家模型的 RAG 評估標準與儀表板",
      stars: 178,
      starsToday: 178,
      models: ["Claude", "Gemini", "ChatGPT"],
      type: "RAG",
    },
  ],
  trending: [
    { name: "claude-pocket-agent", delta: "+612", pct: "+14.5%" },
    { name: "gpt-voice-agent-starter", delta: "+651", pct: "+∞" },
    { name: "gemini-canvas-lab", delta: "+421", pct: "+15.7%" },
    { name: "gpt-deep-research-kit", delta: "+389", pct: "+6.1%" },
    { name: "mcp-mesh", delta: "+287", pct: "+15.4%" },
    { name: "shaderbench", delta: "+214", pct: "+27.9%" },
    { name: "rag-eval-suite", delta: "+178", pct: "+∞" },
  ],
  modelCounts: { Claude: 5, Gemini: 4, ChatGPT: 5 },
  typeCounts: { Agent: 3, RAG: 2, Tool: 3, Demo: 4 },
};

window.MODEL_COLORS = {
  Claude: { fg: "#C96442", bg: "rgba(201, 100, 66, 0.10)", ring: "rgba(201,100,66,0.35)" },
  Gemini: { fg: "#3B6FD8", bg: "rgba(59, 111, 216, 0.10)", ring: "rgba(59,111,216,0.32)" },
  ChatGPT: { fg: "#137a5a", bg: "rgba(19, 122, 90, 0.10)", ring: "rgba(19,122,90,0.32)" },
};

window.TYPE_GLYPHS = {
  Agent: "◆",
  RAG: "▲",
  Tool: "●",
  Demo: "■",
};
