# src/ — 原始碼說明

## 檔案說明

### `data.js`
Mock 示範資料，定義在 `window.DIGEST_DATA`。
用於 GitHub API 無法使用（速率限制、網路錯誤）時的 fallback，以及開發時的預設資料。

也定義了：
- `window.MODEL_COLORS` — 各模型的品牌色（fg / bg / ring）
- `window.TYPE_GLYPHS` — 各類型的符號圖示

### `github-api.js`
GitHub Search API 整合。對外暴露：
- `window.loadDigestData(token?)` — 主要資料載入函式，有 30 分鐘 localStorage 快取
- `window.clearDigestCache()` — 清除快取強制重新抓取

內部流程：
1. 檢查 localStorage 快取是否還在有效期（30 分鐘）
2. 若過期，並行發送 3 條 GitHub Search 查詢（claude、gemini、chatgpt）
3. 合併結果、去除 fork、依星數排序，取前 8 名
4. 用 `transformRepo()` 轉換成頁面所需格式（含難度估算、步驟生成等）
5. 儲存快取後回傳

### `v1-magazine.jsx`
主頁面 React 元件 `DigestApp`，Apple Today 風格。

**Props：**
| Prop | 說明 |
|------|------|
| `data` | digest 資料（來自 github-api 或 mock） |
| `status` | `"loading"` / `"ok"` / `"rate_limit"` / `"error"` |
| `token` | GitHub token 字串 |
| `onTokenChange(t)` | token 變更回調 |
| `onRefresh()` | 觸發重新載入 |
| `onClearCache()` | 清除 localStorage 快取 |

**內部狀態（全存 localStorage）：**
- `digest-theme-v1` — `"light"` / `"dark"`
- `digest-bookmarks-v1` — 收藏的 repo ID 陣列
