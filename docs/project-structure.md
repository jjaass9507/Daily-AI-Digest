# 專案資料夾結構

Daily AI Digest 目前依照「前台 UI、資料更新、資料庫、部署文件、設計工具」分區整理。

```text
Daily-AI-Digest/
├─ db/
│  └─ schema.sql
├─ docs/
│  ├─ github-digest-automation-plan.md
│  └─ project-structure.md
├─ scripts/
│  ├─ apply-schema.mjs
│  └─ update-digest.mjs
├─ src/
│  ├─ data.js
│  ├─ github-api.js
│  ├─ v1-magazine.jsx
│  ├─ v2-workspace.jsx
│  ├─ v3-reader.jsx
│  └─ README.md
├─ tools/
│  ├─ README.md
│  └─ design/
│     ├─ design-canvas.jsx
│     └─ tweaks-panel.jsx
├─ index.html
├─ server.mjs
├─ package.json
├─ render.yaml
├─ README.md
└─ .env.example
```

## 根目錄

- `index.html`：目前的前台入口。
- `server.mjs`：Render Web Service 與本機 Node server，提供靜態檔案與 `/api/digest/*`。
- `package.json`：Node scripts 與部署依賴。
- `render.yaml`：Render Web Service 設定。
- `.env.example`：環境變數範例，不包含真實密碼。

## `src/`

前台 UI 與瀏覽器端資料載入邏輯。

- `github-api.js`：優先讀取 `/api/digest/today`，失敗時才 fallback 到 GitHub API。
- `data.js`：保留 UI 顏色與分類常數。
- `v1-magazine.jsx`：目前正式載入的 Apple.com Product Page 風格 UI。
- `v2-workspace.jsx`、`v3-reader.jsx`：早期設計版本，保留作為參考。

## `db/`

Neon Postgres schema。

- `schema.sql`：建立 repos、repo_snapshots、repo_summaries、digest_editions、digest_items。

## `scripts/`

資料庫與資料更新腳本。

- `apply-schema.mjs`：套用 NeonDB schema。
- `update-digest.mjs`：抓取 GitHub 資料、產生摘要 payload、寫入 NeonDB。

## `docs/`

規劃與維運文件。

- `github-digest-automation-plan.md`：GitHub 爬取、摘要生成、NeonDB 欄位更新格式與後續自動化計畫。
- `project-structure.md`：本文件。

## `tools/`

非 production runtime 的設計輔助工具。

- `tools/design/design-canvas.jsx`
- `tools/design/tweaks-panel.jsx`

這些檔案目前沒有被 `index.html` 載入，移到 `tools/` 後可降低根目錄雜訊。

## 不提交的本機檔案

以下檔案或資料夾只留在本機，不應提交到 Git：

- `.env`
- `.env.*`
- `.codex_tmp/`
- `.design-canvas.state.json`
- `AGENTS.md`
- `node_modules/`
- `dist/`
