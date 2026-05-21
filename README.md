# Daily AI Digest · 每日 AI 開源精選

每日從 GitHub 撈取與 **Gemini / ChatGPT / Claude** 相關的高價值應用專案，整理成附有理解步驟的日報。

## 設計預覽

三個 Apple 科技風方向，在設計畫布上並排呈現：

| 方向 | 風格 |
|------|------|
| **A · App Store Today** | 日曆型大字 masthead、英雄卡 + 3 欄精選、底部滑入詳情 |
| **B · Apple.com Product Page** | 滾動長頁、96px 大標題、4 欄統計 Bento、訂閱 callout |
| **C · Apple Intelligence** | 全暗 + 虹彩 Siri ring、玻璃卡、依模型/類型篩選 + 搜尋 |

## 本地執行

需要靜態檔案伺服器（瀏覽器的 CORS 政策不允許直接以 `file://` 載入 JS 模組）：

```bash
# 方式 1：npx serve（推薦）
npx serve .

# 方式 2：Python
python3 -m http.server 8080

# 方式 3：Node http-server
npx http-server -p 8080
```

啟動後開啟 `http://localhost:3000`（或對應 port）。

## 操作說明

- **縮放 / 平移**：滾輪縮放、雙指滑動平移、中鍵拖曳
- **全螢幕專注**：點任一方向的展開按鈕（↗）或直接點標籤
- **切換方向**：全螢幕模式下用 ← → 鍵切換
- **Tweaks 面板**：右下角 ⚙ Tweaks 按鈕 — 切換亮 / 暗色、調整文字大小
- **詳情面板**（A / C 方向）：點任一卡片展開，含介紹、為什麼值得看、理解步驟、程式範例

## 專案結構

```
daily-ai-digest/
├── index.html          # 主入口
├── design-canvas.jsx   # 設計畫布（縮放/平移/全螢幕）
├── tweaks-panel.jsx    # Tweaks 控制面板
└── src/
    ├── data.js         # 模擬資料（repos、趨勢、新發布）
    ├── v1-magazine.jsx # 方向 A：App Store Today
    ├── v2-workspace.jsx# 方向 B：Apple.com Product Page
    └── v3-reader.jsx   # 方向 C：Apple Intelligence
```

## 下一步

1. 串接真實 GitHub API（trending、keyword 篩選、star delta）
2. 加上 LLM 摘要 pipeline（每日自動生成中文介紹與理解步驟）
3. 確定主方向後做手機版響應式
4. Email 訂閱頁 + 歷史日報歸檔
5. 收藏 / 稍後閱讀同步機制
