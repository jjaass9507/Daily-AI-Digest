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
