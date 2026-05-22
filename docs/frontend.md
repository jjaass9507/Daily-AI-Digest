# 前端介面

Daily AI Digest 的前端網站說明。

## 技術選型

- **React 18**：透過 CDN 載入（不需要 build step）
- **Babel**：瀏覽器端即時編譯 JSX
- **無打包工具**：直接由 `server.mjs` 提供靜態檔案

---

## 入口：`index.html`

載入順序：

```html
react.js → react-dom.js → babel.min.js → src/github-api.js → src/v1-magazine.jsx
```

包含一個 loading overlay（`#digest-overlay`），在資料載入完成前顯示。

---

## 資料來源：`src/github-api.js`

前端的資料載入邏輯，優先順序：

1. **呼叫 `/api/digest/today`**（從 Neon Postgres 讀取）
2. 若 API 失敗 → fallback 到 **localStorage 快取**
3. 若快取也沒有 → fallback 到**直接呼叫 GitHub Search API**

這樣設計讓網站在 server 暫時無法連線時仍可顯示上次的資料。

---

## 主介面：`src/v1-magazine.jsx`

目前正式使用的 UI，Apple.com Product Page 風格。

主要區塊：

| 區塊 | 說明 |
|---|---|
| Hero | 大標題、版次資訊、今日 digest 主題 |
| 統計列 | Claude / Gemini / ChatGPT 數量、掃描總數 |
| 精選列表 | 最多 15 個 repo，每個顯示完整資訊 |
| 每個 repo | 名稱、標語、摘要、模型標籤、類型標籤、難度、快速上手步驟 |
| 頁尾 | 連結與版權資訊 |

顏色系統（定義在 `src/data.js`）：

```javascript
MODEL_COLORS = {
  Claude:  '#e8632b',  // 橘紅
  Gemini:  '#4285f4',  // Google 藍
  ChatGPT: '#10a37f',  // 綠
}

TYPE_COLORS = {
  Agent: '#8b5cf6',  // 紫
  RAG:   '#2a9df4',  // 藍
  Tool:  '#e08a00',  // 金
  Demo:  '#10b981',  // 翠綠
}
```

---

## 其他 UI 版本（保留備用）

| 檔案 | 說明 |
|---|---|
| `src/v2-workspace.jsx` | 工作區視圖（早期版本） |
| `src/v3-reader.jsx` | 閱讀器視圖（早期版本） |

這兩個版本目前未被 `index.html` 載入，保留作為設計參考。

---

## 設計工具

`tools/design/` 資料夾包含開發期間使用的設計輔助工具：

- `design-canvas.jsx` — 視覺設計畫布
- `tweaks-panel.jsx` — 即時調整 UI 參數的面板

這些工具不在 production 環境中使用。

---

## 本機開發

```bash
npm start
# 開啟 http://localhost:3000
```

若 `DATABASE_URL` 有設定，`/api/digest/today` 會回傳真實資料；若無，前端會 fallback 到 GitHub API 或 localStorage 快取。

---

## 歷史版次瀏覽

前端透過 `/api/digest/editions` 取得最近 90 天的版次列表，讓使用者可以瀏覽過去的 digest。
