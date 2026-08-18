# Daily AI Digest 更新

從 GitHub 抓取最新 AI 相關 repo，用你自己的理解寫出真正有內容的繁體中文摘要，然後透過 Render 內部 API 寫入 NeonDB。

需要的環境變數：`RENDER_URL`、`INTERNAL_API_KEY`、`GITHUB_TOKEN`（選填，提高 rate limit）

> **⚠️ 重要限制**
> - **禁止**執行 `scripts/update-digest.mjs`、`scripts/agent-digest.mjs` 或任何直連資料庫的腳本
> - **禁止**使用 `DATABASE_URL` 或直接連線 PostgreSQL（port 5432 在沙盒環境中被封鎖）
> - 整個流程只允許：在記憶體中處理資料、最後 POST 到 `$RENDER_URL`（HTTPS）
> - 資料庫寫入由 Render server 負責，不在這裡執行
>
> **⚠️ GitHub 存取限制（remote sandbox）**
> - 在雲端排程環境中，對外的 GitHub 連線被綁定在單一 repo，**直接 `curl` 打 `api.github.com/search/*` 或 `api.github.com/repos/{別的 repo}` 會回 403**（訊息：`sessions are bound to their configured repositories`）。
> - 這是「主機/路徑」層級的封鎖，**換 `GITHUB_TOKEN` 也無效**。
> - 因此：**搜尋改用 GitHub MCP 工具 `search_repositories`**（被允許的通道，能搜全 GitHub）；**抓 README 改用 `raw.githubusercontent.com`**（免認證、不被擋）。詳見步驟 1、2。

---

## 步驟

### 0. 清除資料庫環境變數（防止誤連）

```bash
unset DATABASE_URL
```

### 1. 從 GitHub 搜尋候選 repo

**用 GitHub MCP 工具 `search_repositories`**（不要用 `curl` 打 `api.github.com/search`，在沙盒會 403）。
呼叫參數：`perPage=12`、`sort=updated`、`order=desc`、**`minimal_output=false`**（見下方說明）。
各 query 取 12 個結果，去除 fork，合併去重後依分數排序，取前 15 名：

```
claude anthropic stars:>100 pushed:>SINCE
gemini stars:>100 pushed:>SINCE
chatgpt openai stars:>100 pushed:>SINCE
ai agent mcp stars:>100 pushed:>SINCE
rag stars:>100 pushed:>SINCE
org:anthropics skills pushed:>SINCE
claude skills SKILL.md stars:>50 pushed:>SINCE
```

`SINCE` = 今天往前 **7 天**的日期（ISO 格式）。

> **skill 這兩個 query 為什麼這樣寫？**
> - `org:anthropics skills`：Anthropic 官方來源（`anthropics/skills`、`anthropics/claude-plugins-official`），**視為推薦，優先收錄**，不設 stars 門檻。
> - `claude skills SKILL.md`：第三方候選。要求文字含 `SKILL.md`，實測撈回來多是真的 skill 庫；`stars:>50` 是因為 skill 是新類別，多數 repo 還沒到 100 顆星。
> - **不要用 `topic:agent-skills` 或 `topic:claude-skills`**：實測回來的大多是「支援 skills 的應用」（影片編輯器、agent harness、外掛），不是提供 skill 的 repo。
>
> 這兩個 query 的候選一律要過下面的步驟 1.5 才能收錄。

> **為什麼拿掉 `in:name,description,topics` 與 `google-ai`／`embedding vector`？**
> 實測在此資料集，多字 AND 再加 `in:` 限定會把結果壓到只剩 1～5 筆（例如 `gemini google-ai … in:…` 只回 1 筆、`rag embedding vector …` 只回 5 筆），主題代表性不足。改用較寬的單一主詞即可回到數百筆。若某 query 仍不足 3 筆新 repo，從其他 query 的剩餘候選補足到 15 個。

> **為什麼要 `minimal_output=false`？**
> 步驟 5 的 server 端會讀 `repo.owner.login`、`repo.created_at`、`repo.pushed_at`、`repo.license.spdx_id`。`minimal_output=false` 回傳的是**完整 GitHub 物件**，已內含這些欄位，可原封不動塞進 `repos`（見步驟 5），且 `pushed_at` 是真值、`recencyScore` 才會準確。若為了省 context 用 `minimal_output=true`，務必自行補齊步驟 5 列出的欄位，否則 server 會因 `repo.owner` 為 undefined 而回 500。

排序分數公式（`daysSincePush` 用 `repo.pushed_at` 計算）：
- `starScore = log10(max(10, stars)) * 12`
- `forkScore = log10(max(5, forks+1)) * 4`
- `recencyScore = daysSincePush <= 1 ? 30 : max(0, 25 - (daysSincePush - 1) * 5)`
- `topicScore = topicsCount * 1.5`
- `score = starScore + forkScore + recencyScore + topicScore`

### 1.5 驗證 skill 候選（只收「推薦的 skill」）

日報要收的是**值得推薦的 Claude skill**，不是所有名字裡有 skill 的 repo。分兩條路處理：

**官方來源 → 直接視為推薦**

`org:anthropics` 底下的 skill repo（目前是 `anthropics/skills` 與 `anthropics/claude-plugins-official`，後者是 Anthropic 自己維護的高品質 plugin 目錄）不用驗證，優先收錄。

**第三方 → 要驗證才收**

用 GitHub MCP 工具 `search_code` 查該 repo 有沒有真的 skill 檔（`raw.githubusercontent.com` 無法列目錄，而 skill 幾乎都放在子目錄，**連官方 repo 的根目錄也沒有 `SKILL.md`**，所以不要用抓根目錄檔案的方式驗證）：

```
repo:{full_name} filename:SKILL.md
```

三個條件都要過：

1. `total_count > 0` — 真的有 `SKILL.md`，不是只有 README 在講 skill
2. 回傳片段看得到 YAML frontmatter 的 `name:` 與 `description:` — 符合官方 Agent Skills 格式
3. **repo 的主體就是提供可重複使用的 skill**。有 `SKILL.md` 不代表是 skill repo：實測影片編輯器 `0xsline/OpenChatCut` 有 16 個 `SKILL.md`、agent harness 與各種外掛也有，那些是應用附帶 skill，應歸 `Tool` 或 `Agent`，不要當 `Skill` 收。

再加上推薦門檻，任一項不符就丟掉：

- 近 30 天內有 push（沒在維護的 skill 沒有推薦價值）
- README 說得出具體用途與安裝方式
- 不是把官方 skill 改名重發、或內容農場式的清單堆疊
- 用途明確可判斷；判斷不出來就不收

被丟掉的候選不要硬湊，從其他 query 的剩餘候選補足到 15 個。`Skill` 類目標 **3–5 則**（官方至少 1 則），避免整份日報被 skill 佔滿。

### 2. 抓每個 repo 的 README

**用 `raw.githubusercontent.com`**（不要用 `api.github.com/repos/{full_name}/readme`，在沙盒會 403）：

```
https://raw.githubusercontent.com/{full_name}/{branch}/README.md
```

`branch` 依序嘗試 `main`、`master`（可再加 `develop`），檔名依序嘗試 `README.md`、`readme.md`、`README`。
取回的是純文字，**不需 base64 decode**。

清洗 README（移除 code block、HTML tag、圖片、badge，縮排空白）後取前 4000 字作為分析材料。

### 3. 你自己分析並寫摘要

**用你真正讀懂的方式寫，不要套模板。** 針對每個 repo 寫出：

**`tagline`**（最多 18 個中文字）
- 一句話抓住這個 repo 的核心定位

**`summary`**（80–160 字）
- 說清楚這個專案在解決什麼具體問題
- 提到關鍵技術或架構特點（不要只說「AI 應用」這種空話）
- 說明主要語言或框架

**`whyValuable`**（80–160 字）
- 今天為什麼值得看這個 repo？有什麼具體的新進展或亮點？
- 和同類工具相比，它的差異是什麼？
- 不要只寫星數有多少（那是廢話）

**`steps`**（3–5 個步驟）
- 這個 repo 實際的安裝或上手方式
- 要具體到指令層級（git clone 哪個路徑、pip install 什麼、需要設定哪個環境變數）
- 不同語言/框架的步驟不同，要針對這個 repo 寫
- `Skill` 類的重點不是安裝依賴，而是「怎麼裝進 agent」：skill 檔案放到哪個目錄（例如 `~/.claude/skills/` 或專案的 `.claude/skills/`）、怎麼觸發、有沒有相依的工具或 MCP server

**`difficulty`** / **`difficultyLevel`** / **`eta`**
- 難度：`簡單` / `中等` / `進階`，level 1/2/3
- eta：`15 分鐘` / `45 分鐘` / `2 小時`

### 4. 組合 digest payload 並偵測欄位

每個 item 同時需要：
- `id`：repo.id（字串）
- `rank`：排序（1 開始）
- `name`、`author`、`fullName`、`githubUrl`
- `stars`、`forks`、`starsToday`（無歷史資料時為 0）
- `models`：從 name/description/topics 偵測 Claude / Gemini / ChatGPT，至少一個
- `type`：從 description/topics/README 判斷 Skill / Agent / RAG / Tool / Demo
  - **先判斷 `Skill`**：repo 的主體就是提供可重複使用的 skill，且已通過步驟 1.5 的驗證。這類 repo 通常也會提到 agent，若先比對 Agent 就會被吃掉。反之，只是附帶幾個 `SKILL.md` 的應用或外掛不算 `Skill`。
  - 其餘維持原順序：Agent → RAG → Tool → Demo
- `stack`：主要語言 + 從 topics 偵測 react/nextjs/langchain/fastapi/docker 等
- `topics`、`license`、`updatedAt`

`models`、`stack`、`steps`、`topics` 一定要是 **陣列**（即使只有一個元素也要寫成
`["JavaScript"]`，不能寫成 `"JavaScript"`），否則前端會在 render 時丟出
`.map is not a function` 而整頁變空白。

組合 digest 頂層：
```json
{
  "date": "YYYY-MM-DD",
  "dateLabel": "2026年5月21日 週四",
  "edition": "第 N 期",  // N = 距離 2026-05-21 的天數 + 1
  "theme": "今日值得追蹤的 AI 開源專案",
  "totalScanned": N,
  "curated": 15,
  "picks": [...],
  "newlyReleased": [],
  "trending": [],
  "modelCounts": { "Claude": N, "Gemini": N, "ChatGPT": N },
  "typeCounts": { "Skill": N, "Agent": N, "RAG": N, "Tool": N, "Demo": N }
}
```

`edition` 計算：以 2026-05-21（Asia/Taipei）為第 1 期，每天加 1。
公式：`第 ${daysSince("2026-05-21") + 1} 期`（今天 2026-05-23 = 第 3 期）

### 5. POST 到 Render

```
POST $RENDER_URL/internal/digest/update
Authorization: Bearer $INTERNAL_API_KEY
Content-Type: application/json

{
  "repos": [ ...原始 GitHub repo 物件陣列... ],
  "digest": { ...上面組合的 digest payload... }
}
```

**`repos` 陣列每個物件必須包含 server 端會讀取的欄位**（否則 `handleInternalDigestUpdate` 會因欄位 undefined 而回 500）：

```jsonc
{
  "id": 123,                      // 數值
  "full_name": "owner/repo",
  "name": "repo",
  "owner": { "login": "owner" },  // ⚠️ 必填，缺這個 server 會 500
  "html_url": "https://github.com/owner/repo",
  "description": "...",
  "language": "Python",
  "topics": ["..."],
  "license": { "spdx_id": "MIT" },// 可為 null
  "created_at": "...",            // 可為 null
  "updated_at": "...",
  "pushed_at": "...",             // recencyScore 用；缺則傳 null
  "stargazers_count": 123,
  "forks_count": 45
}
```

> 若步驟 1 用 `minimal_output=false`，MCP 回傳的完整物件已含以上欄位，**直接放進 `repos` 即可，不用重組**。

成功回傳 `{ ok: true, date, saved }` 表示已寫入 NeonDB。

---

## 完成標準

- 成功 POST 並收到 `ok: true`
- `saved` 等於 picks 的數量（通常是 15）
- 每個 pick 的 summary / whyValuable / steps 是針對該 repo 真正寫的，不是套模板
