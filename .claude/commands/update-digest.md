# Daily AI Digest 更新

從 GitHub 抓取最新 AI 相關 repo，用你自己的理解寫出真正有內容的繁體中文摘要，然後透過 Render 內部 API 寫入 NeonDB。

需要的環境變數：`RENDER_URL`、`INTERNAL_API_KEY`、`GITHUB_TOKEN`（選填，提高 rate limit）

> **⚠️ 重要限制**
> - **禁止**執行 `scripts/update-digest.mjs`、`scripts/agent-digest.mjs` 或任何直連資料庫的腳本
> - **禁止**使用 `DATABASE_URL` 或直接連線 PostgreSQL（port 5432 在沙盒環境中被封鎖）
> - 整個流程只允許：用 `curl`/`fetch` 呼叫 GitHub API（HTTPS）、在記憶體中處理資料、最後 POST 到 `$RENDER_URL`（HTTPS）
> - 資料庫寫入由 Render server 負責，不在這裡執行

---

## 步驟

### 0. 清除資料庫環境變數（防止誤連）

```bash
unset DATABASE_URL
```

### 1. 從 GitHub 搜尋候選 repo

用以下五個 query，各取 12 個結果，去除 fork，合併去重後依分數排序，取前 15 名：

```
claude anthropic in:name,description,topics pushed:>SINCE
gemini google-ai in:name,description,topics pushed:>SINCE
chatgpt openai in:name,description,topics pushed:>SINCE
ai agent mcp in:name,description,topics pushed:>SINCE
rag embedding vector in:name,description,topics pushed:>SINCE
```

`SINCE` = 今天往前 **3 天**的日期（ISO 格式）。

每個 query 加上 `&sort=updated&order=desc`，讓 GitHub 優先回傳最近有動作的 repo。

排序分數公式：
- `starScore = log10(max(10, stars)) * 8`
- `forkScore = log10(max(5, forks+1)) * 4`
- `recencyScore = max(0, 30 - daysSincePush * 3)`
- `topicScore = topicsCount * 1.5`
- `score = starScore + forkScore + recencyScore + topicScore`

GitHub API headers：
```
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
User-Agent: daily-ai-digest
Authorization: Bearer $GITHUB_TOKEN  （若有設定）
```

### 2. 抓每個 repo 的 README

呼叫 `GET https://api.github.com/repos/{full_name}/readme`，base64 decode content 欄位。

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
- `type`：從 description/topics/README 判斷 Agent / RAG / Tool / Demo
- `stack`：主要語言 + 從 topics 偵測 react/nextjs/langchain/fastapi/docker 等
- `topics`、`license`、`updatedAt`

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
  "typeCounts": { "Agent": N, "RAG": N, "Tool": N, "Demo": N }
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

成功回傳 `{ ok: true, date, saved }` 表示已寫入 NeonDB。

---

## 完成標準

- 成功 POST 並收到 `ok: true`
- `saved` 等於 picks 的數量（通常是 15）
- 每個 pick 的 summary / whyValuable / steps 是針對該 repo 真正寫的，不是套模板
