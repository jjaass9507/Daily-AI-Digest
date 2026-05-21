# Daily AI Digest

Daily AI Digest 是一個中文版 AI 開源專案精選平台。平台部署在 Render，資料存放在 Neon Postgres。前端採用「B · Apple.com Product Page」風格，從 `/api/digest/today` 讀取已整理好的每日精選資料。

## 目前架構

```text
GitHub Search API + Repo README
        ↓
GPT/Codex 摘要與整理流程
        ↓
Neon Postgres
        ↓
server.mjs /api/digest/today
        ↓
index.html + React UI
```

## 資料更新策略

目前不使用 Render Cron Job 自動生成摘要。

原因：若要讓摘要真正經過 GPT/Codex 品質整理，不能只依賴 Render Cron 的一般 Node 腳本，除非額外接 OpenAI API。現階段資料更新流程改為：

1. 由 GPT/Codex 協助抓取 GitHub repo 與 README。
2. 生成繁中摘要、值得關注原因、快速上手步驟。
3. 寫入 NeonDB。
4. Render 上的平台只負責讀取 NeonDB 並顯示。

`scripts/update-digest.mjs` 仍保留，可作為規則式 fallback 或之後接 `OPENAI_API_KEY` 的基礎。

## Render 部署

本 repo 的 `render.yaml` 目前只建立一個服務：

```yaml
daily-ai-digest
```

用途：

- 提供靜態前端
- 提供 API
- 從 NeonDB 讀取最新 digest

Render Web Service 設定：

```text
Build Command: npm install
Start Command: npm start
```

需要設定的環境變數：

```bash
DATABASE_URL=postgresql://...
GITHUB_TOKEN=github_pat_... # 可選，目前主要給 fallback 腳本使用
```

## API

```text
GET /api/digest/today
GET /api/digest/:date
GET /health
```

## 本機開發

需要 Node.js 20+。

```bash
npm install
cp .env.example .env
npm start
```

開啟：

```text
http://localhost:3000
```

如果只用靜態 server 開 `localhost:8080`，沒有 `/api/digest/today`，前端會 fallback 成瀏覽器端 GitHub 抓取或 localStorage 快取。

## NeonDB Schema

Schema 位於 `db/schema.sql`。

- `repos`：repo 基本資料
- `repo_snapshots`：每日 stars/forks 快照
- `repo_summaries`：README 摘要、中文說明、快速上手步驟
- `digest_editions`：每日一期完整 payload
- `digest_items`：每日精選排序與單項 payload

## 資料更新相關 scripts

```bash
npm run db:schema
npm run update:digest
npm run setup:digest
```

目前這些 scripts 是規則式摘要版本，適合當 fallback。若未來要讓 Render 自己排程並用 GPT 摘要，可以加上：

```bash
OPENAI_API_KEY=sk-...
```

再把 `scripts/update-digest.mjs` 改成：

- 有 `OPENAI_API_KEY`：呼叫 GPT 生成摘要
- 沒有 `OPENAI_API_KEY`：使用規則式摘要

## 安全提醒

不要把真實密鑰提交到 GitHub。

如果 `DATABASE_URL` 曾經貼到聊天、issue、log 或任何公開位置，請到 Neon rotate password，重新產生連線字串，並只放到 Render Environment Variables。

`.gitignore` 已排除：

```text
.env
.env.*
node_modules/
.codex_tmp/
```

## 目前 UI

目前前端使用「B · Apple.com Product Page」方向：

- sticky navigation
- 大型產品頁 hero
- 每日精選統計
- 每個 repo 一段 feature section
- 彩色 product visual
- bento 趨勢區塊
- 繁中摘要與快速上手內容
