# Daily AI Digest

每天自動整理 GitHub 上最值得關注的 AI 開源專案，生成繁體中文摘要，透過電子報寄送給訂閱者。

## 系統架構

```
GitHub Search API
       ↓
Claude Code（/update-digest skill）
  抓 repo + README、寫中文摘要
       ↓
Render Server（server.mjs）
  儲存到 Neon Postgres
       ↓
前端網站（index.html）
  讀取 /api/digest/today 顯示
       ↓
GitHub Actions（每天 8am 台灣時間）
  自動寄送電子報給訂閱者
```

## 功能總覽

| 功能 | 說明 | 文件 |
|---|---|---|
| Digest 更新 | 從 GitHub 抓 AI repo，寫中文摘要，存入資料庫 | [docs/digest-update.md](docs/digest-update.md) |
| 前端網站 | 顯示每日精選的互動式網頁 | [docs/frontend.md](docs/frontend.md) |
| 電子報 | 生成 HTML 電子報並透過 Gmail API 寄出 | [docs/email.md](docs/email.md) |
| 自動排程 | GitHub Actions 每天自動寄信 | [docs/scheduling.md](docs/scheduling.md) |
| API | Server 提供的 REST API | [docs/api.md](docs/api.md) |
| 資料庫 | Neon Postgres 的 schema 設計 | [docs/database.md](docs/database.md) |
| 環境設定 | 首次部署的完整設定步驟 | [docs/setup.md](docs/setup.md) |

## 快速開始（本機開發）

```bash
# 1. 安裝依賴
npm install

# 2. 複製環境變數範本
cp .env.example .env
# 編輯 .env，填入 DATABASE_URL、INTERNAL_API_KEY 等

# 3. 啟動 server
npm start
# 開啟 http://localhost:3000
```

## 部署平台

- **Server & 前端**：[Render](https://render.com)（`render.yaml` 自動設定）
- **資料庫**：[Neon Postgres](https://neon.tech)
- **Email API**：Gmail API（OAuth2）
- **自動排程**：GitHub Actions

## 相關設定

- Render 環境變數 → 見 [docs/setup.md](docs/setup.md)
- GitHub Actions Secrets → 見 [docs/scheduling.md](docs/scheduling.md)
- 新增電子報收件人 → 修改 Render 的 `EMAIL_TO` 環境變數（逗號分隔）
