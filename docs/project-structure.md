# 專案資料夾結構

```
Daily-AI-Digest/
├── .claude/
│   └── commands/               # Claude Code skills
│       ├── send-digest-email.md  # /send-digest-email skill
│       └── update-digest.md      # /update-digest skill
│
├── .github/
│   └── workflows/
│       └── daily-digest.yml    # GitHub Actions 排程（每天 8am 寄信）
│
├── db/
│   └── schema.sql              # Neon Postgres 建表 SQL
│
├── docs/                       # 功能文件（本資料夾）
│   ├── api.md                  # API 端點參考
│   ├── database.md             # 資料庫 schema 說明
│   ├── digest-update.md        # Digest 更新流程
│   ├── email.md                # 電子報功能
│   ├── frontend.md             # 前端介面說明
│   ├── project-structure.md    # 本文件
│   ├── scheduling.md           # 自動排程設定
│   └── setup.md                # 首次部署環境設定指南
│
├── scripts/
│   ├── agent-digest.mjs        # Digest 更新（無 DB，透過 Render API）
│   ├── apply-schema.mjs        # 初始化 Neon Postgres schema
│   ├── screenshot-digest.mjs   # Puppeteer 截圖工具
│   ├── send-digest-email.mjs   # 電子報生成與寄送
│   └── update-digest.mjs       # Digest 更新（需直連 DB）
│
├── src/                        # 前端原始碼
│   ├── data.js                 # 顏色與分類常數
│   ├── github-api.js           # 資料載入邏輯（API + fallback）
│   ├── v1-magazine.jsx         # 主要 UI（目前使用）
│   ├── v2-workspace.jsx        # 備用 UI 版本
│   ├── v3-reader.jsx           # 備用 UI 版本
│   └── README.md
│
├── tools/
│   └── design/                 # 開發期設計工具（非 production）
│       ├── design-canvas.jsx
│       └── tweaks-panel.jsx
│
├── .env.example                # 環境變數範本
├── .gitignore
├── .puppeteerrc.cjs            # Puppeteer 設定
├── CLAUDE.md                   # Claude Code 行為指南
├── index.html                  # 前端入口
├── package.json
├── render.yaml                 # Render 部署設定
└── server.mjs                  # Node.js server（API + 靜態檔案）
```

---

## 核心檔案說明

### `server.mjs`

Node.js HTTP server，同時提供：
- 前端靜態檔案（`index.html`, `src/`）
- 公開 REST API（`/api/digest/*`）
- 內部 API（`/internal/*`，需 Bearer token）

詳見 [docs/api.md](api.md)。

### `scripts/send-digest-email.mjs`

電子報生成腳本。從 Render 的 `/api/digest/today` 抓資料，生成 HTML，透過 Render 的 `/internal/send-email` 寄出。**不需要直連資料庫**。

詳見 [docs/email.md](email.md)。

### `scripts/agent-digest.mjs`

Digest 更新腳本，適合 Claude Code 等無法直連 PostgreSQL 的環境。透過 HTTPS 把結果 POST 到 Render，由 Render 負責寫入資料庫。

詳見 [docs/digest-update.md](digest-update.md)。

### `.claude/commands/`

Claude Code skill 定義檔。在 Claude Code 中輸入 `/update-digest` 或 `/send-digest-email` 即可觸發對應流程。

---

## 不提交的本機檔案

以下已在 `.gitignore` 排除，請勿提交：

```
.env
.env.*
node_modules/
dist/
.codex_tmp/
```
