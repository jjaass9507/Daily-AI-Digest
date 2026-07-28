# API 參考文件

Render server（`server.mjs`）提供的所有 API 端點。

## 公開 API

不需要認證，任何人都可以呼叫。

---

### `GET /health`

健康檢查，確認 server 是否正常運作。

**Response：**
```json
{ "ok": true }
```

---

### `GET /api/digest/today`

取得最新一期（最近一天）的 digest 完整資料。

**Response 範例：**
```json
{
  "date": "2026-05-22",
  "dateLabel": "2026年5月22日 週五",
  "edition": "第 2 期",
  "theme": "今日值得追蹤的 AI 開源專案",
  "totalScanned": 48,
  "curated": 15,
  "picks": [
    {
      "id": "123456789",
      "rank": 1,
      "name": "awesome-mcp-server",
      "author": "example-user",
      "fullName": "example-user/awesome-mcp-server",
      "githubUrl": "https://github.com/example-user/awesome-mcp-server",
      "stars": 2400,
      "forks": 180,
      "models": ["Claude"],
      "type": "Tool",
      "stack": ["Python", "fastapi"],
      "tagline": "一鍵部署的 MCP Server 工具箱",
      "summary": "...",
      "whyValuable": "...",
      "steps": ["...", "...", "..."],
      "difficulty": "簡單",
      "eta": "15 分鐘",
      "score": 87.3
    }
  ],
  "modelCounts": { "Claude": 8, "Gemini": 4, "ChatGPT": 3 },
  "typeCounts": { "Agent": 5, "RAG": 3, "Tool": 6, "Demo": 1 }
}
```

**錯誤：**
- `404` — 資料庫中尚無任何 digest 資料

---

### `GET /api/digest/:date`

取得指定日期的 digest。

**URL 參數：**
- `date`：日期字串，格式 `YYYY-MM-DD`，例如 `2026-05-22`

**Response：** 與 `/api/digest/today` 相同格式

**錯誤：**
- `404` — 該日期無資料

---

### `GET /api/digest/editions`

取得最近 90 天的 digest 版次列表，用於前端的歷史瀏覽功能。

**Response 範例：**
```json
[
  {
    "digest_date": "2026-05-22",
    "curated_count": 15,
    "date_label": "2026年5月22日 週五",
    "edition": "第 2 期"
  },
  {
    "digest_date": "2026-05-21",
    "curated_count": 15,
    "date_label": "2026年5月21日 週四",
    "edition": "第 1 期"
  }
]
```

---

### `GET /api/repos/:id/context`

組裝單一 repo 的「深度 context」，供之後使用者用自己的 LLM API key 深入詢問該專案時當作 prompt 素材。本端點本身不呼叫任何 LLM。

資料來源：
- **DB（免費）**：`repos` metadata、`repo_summaries` 的中文摘要與 why、`repo_snapshots` 星數走勢、該 repo 在 `digest_items` 的登場期數。
- **GitHub API（盡力而為）**：README 全文、檔案樹（已過濾 `node_modules`/`.git`/`dist`/`build`、鎖定檔、二進位檔，最多 300 筆）、`package.json`/`pyproject.toml`/`requirements.txt`/`go.mod`/`Cargo.toml`（存在才抓）、最近 30 筆 commit、最新一筆 release、最多 15 筆 open issues（已排除 PR）、依語言與檔案樹推測的最多 3 個關鍵原始碼檔案。

任何單一 GitHub 請求失敗（404、403 rate limit、逾時）都不會讓整個請求失敗，缺少的部分會列在回應的 `missing` 欄位，端點仍回傳 `200`。

**URL 參數：**
- `id`：`repos.id`（bigint）

**Query 參數：**
- `depth`：`light` | `standard` | `deep`，預設 `standard`。只影響輸出裁切，不影響實際抓取範圍（永遠抓最完整的一份存快取）。
  - `light`（約 3k tokens）：DB 資料 + README 前 4000 字元
  - `standard`（約 15k tokens）：DB 資料 + README 全文 + 檔案樹 + manifest + commits + release + issues
  - `deep`（約 30k tokens）：`standard` + 關鍵原始碼檔案

**快取：** 結果存在 `repo_context` 表，24 小時內重複呼叫（含不同 `depth`）不會再打 GitHub。

**Response 範例（`depth=standard`）：**
```json
{
  "repoId": "123456789",
  "fullName": "example-user/awesome-mcp-server",
  "depth": "standard",
  "cachedAt": "2026-07-28T04:29:49.454Z",
  "db": {
    "metadata": { "id": "123456789", "fullName": "...", "name": "...", "owner": "...", "githubUrl": "...", "description": "...", "language": "...", "topics": [], "license": "MIT", "createdAt": "...", "updatedAt": "...", "lastSeenAt": "..." },
    "summary": { "summary": "...", "why": "...", "quickStart": ["..."], "difficulty": "中等", "eta": "45 分鐘" },
    "starHistory": [{ "snapshot_date": "2026-07-20", "stars": 3, "forks": 0 }],
    "digestAppearances": [{ "digest_date": "2026-07-20", "rank": 1, "score": "90.5" }]
  },
  "github": {
    "readme": "...",
    "fileTree": ["src/index.ts", "package.json"],
    "manifests": { "package.json": "..." },
    "commits": [{ "message": "...", "date": "..." }],
    "latestRelease": { "tag": "v1.0.0", "body": "..." },
    "openIssues": ["..."]
  },
  "missing": [],
  "tokenEstimate": 2259,
  "tokenEstimateNote": "粗略估計值（回應 JSON 字元數 / 3），中英文與程式碼混合，非精確 tokenizer 計算"
}
```

**錯誤：**
- `404` — `{"error":"repo_not_found"}`（repo 不在 `repos` 表）
- `503` — 資料庫未設定

---

### `GET /api/repos/:id/files`

取得指定檔案在 repo 內的實際內容，供前端「深度解讀」兩段式問答使用：先請 LLM 從檔案樹挑出需要細讀的檔案，再用這個端點把內容抓回來夾進第二段提問。本端點本身不呼叫任何 LLM，也不快取（每次都即時向 GitHub 抓取）。

**URL 參數：**
- `id`：`repos.id`（bigint）

**Query 參數：**
- `paths`：以逗號分隔的檔案路徑清單，例如 `paths=src/index.ts,package.json`。必須是 repo 內的相對路徑（不可以 `/` 開頭、不可包含 `..` 路徑片段），且最多 5 個。

單一檔案抓取失敗（404、逾時、rate limit 等）不會讓整個請求失敗，該路徑會列在 `missing`，端點仍回傳 `200`。每個檔案內容截斷至 8000 字元。

**Response 範例：**
```json
{
  "files": { "src/index.ts": "..." },
  "missing": ["docs/does-not-exist.md"]
}
```

**錯誤：**
- `400` — `{"error":"paths_required"}`（未帶 `paths`）
- `400` — `{"error":"too_many_paths","max":5}`（超過 5 個路徑）
- `400` — `{"error":"invalid_path"}`（路徑為絕對路徑或含 `..`）
- `404` — `{"error":"repo_not_found"}`（repo 不在 `repos` 表）
- `503` — 資料庫未設定

---

## 內部 API

需要在 `Authorization` header 帶入 Bearer token：

```
Authorization: Bearer <INTERNAL_API_KEY>
```

`INTERNAL_API_KEY` 在 Render 環境變數設定。

---

### `POST /internal/digest/update`

儲存一期 digest 資料到資料庫，包含 repos、快照、摘要、版次等所有資料。

**Request Body：**
```json
{
  "repos": [
    {
      "id": 123456789,
      "full_name": "example-user/awesome-mcp-server",
      "name": "awesome-mcp-server",
      "owner": { "login": "example-user" },
      "html_url": "https://github.com/...",
      "description": "...",
      "language": "Python",
      "topics": ["mcp", "claude", "fastapi"],
      "license": { "spdx_id": "MIT" },
      "stargazers_count": 2400,
      "forks_count": 180,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z",
      "pushed_at": "2026-05-22T10:00:00Z"
    }
  ],
  "digest": {
    "date": "2026-05-22",
    "picks": [...],
    "totalScanned": 48,
    "curated": 15
  }
}
```

**Response：**
```json
{ "ok": true, "date": "2026-05-22", "saved": 15 }
```

**錯誤：**
- `400` — 缺少必要欄位
- `401` — API key 錯誤
- `503` — 資料庫未設定

---

### `POST /internal/send-email`

透過 Gmail OAuth2 API 寄送電子報。收件人由 Render 的 `EMAIL_TO` 環境變數決定。

**Request Body：**
```json
{
  "subject": "第 2 期 2026年5月22日 · 今日 AI 開源精選",
  "html": "<html>...</html>"
}
```

**Response：**
```json
{ "ok": true, "messageId": "<unique-message-id>" }
```

**錯誤：**
- `400` — 缺少 `subject` 或 `html`
- `401` — API key 錯誤
- `502` — Gmail API 回傳錯誤（`detail` 欄位含原始錯誤）
- `503` — `INTERNAL_API_KEY` 或 Gmail OAuth2 環境變數未設定

---

### `POST /internal/screenshot`

儲存截圖到 server 本機（固定檔名 `screenshot-today.jpg`），並回傳可公開存取的 URL。URL 由 Render 的 `RENDER_URL` 環境變數組成。

**Request Body：**
```json
{
  "screenshot": "<base64-encoded-jpeg>"
}
```

**Response：**
```json
{ "ok": true, "url": "https://your-app.onrender.com/screenshot-today.jpg" }
```

**錯誤：**
- `400` — 缺少 `screenshot`
- `401` — API key 錯誤
- `503` — `INTERNAL_API_KEY` 未設定

---

## 靜態資源

`/` 及所有未匹配路由都會從根目錄提供靜態檔案：

- `index.html` — 前端入口
- `src/*.js`, `src/*.jsx` — 前端原始碼（由瀏覽器端 Babel 編譯）
