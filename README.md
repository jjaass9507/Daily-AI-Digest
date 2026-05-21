# Daily AI Digest · 每日 AI 開源精選

每天從 GitHub 自動抓取與 Claude / Gemini / ChatGPT 相關、最具學習價值的開源專案，以 Apple Today 風格呈現。

## 功能

- **每日自動更新** — 每 30 分鐘從 GitHub Search API 抓取最新資料，快取於 localStorage
- **篩選** — 按類型（Agent / RAG / Tool / Demo）或模型（Claude / Gemini / ChatGPT）過濾
- **搜尋** — 即時全文搜尋 repo 名稱、作者、標題、技術棧
- **收藏** — 點 ♡ 收藏感興趣的專案，儲存於 localStorage
- **詳情頁** — 點任何卡片開啟底部浮層，含技術棧、理解步驟、程式碼預覽、GitHub 連結
- **深色模式** — 點 ☽ 切換，偏好設定自動儲存
- **今日趨勢、模型分佈、類型分佈** — 右側欄即時統計

## 快速開始

直接用瀏覽器開啟 `index.html`（需要能連外網以載入 React CDN 和 GitHub API）：

```bash
# 本地預覽（任何靜態伺服器皆可）
npx serve .
# 或
python3 -m http.server 8080
```

然後前往 `http://localhost:8080`。

## GitHub Token（建議設定）

未登入每小時只有 **10 次** GitHub Search API 請求；設定 token 後提升到 **30 次**。

1. 前往 <https://github.com/settings/tokens>，建立 Personal Access Token（只需 `public_repo` 讀取權限）
2. 點頁面右上角的 **⚙** 按鈕，貼上 token
3. 點「立即重新抓取」

Token 僅儲存在你的瀏覽器 localStorage，不會傳送到任何伺服器。

## 專案結構

```
index.html              入口頁面（載入 React CDN + 所有腳本）
src/
  data.js               Mock 示範資料（GitHub API 無法使用時的 fallback）
  github-api.js         GitHub Search API 整合、快取、資料轉換
  v1-magazine.jsx       主頁面元件（DigestApp）— App Store Today 風格
```

## 技術

- **React 18** + **Babel Standalone** — 無 build step，直接瀏覽器執行 JSX
- **GitHub Search API** — 三條查詢（claude/anthropic、gemini/google-ai、chatgpt/openai）
- **localStorage** — 資料快取（30 分鐘）、收藏、主題偏好、每日星數快照

## 資料來源

GitHub Search API 搜尋過去 14 天內有 push 的 repo，依星數排序後取前 8 名作為「精選」。
所有分類（Agent / RAG / Tool / Demo）和技術棧偵測均由 `src/github-api.js` 的規則函式自動判斷。
