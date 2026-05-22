# Digest 更新流程

每天的 AI 開源精選內容如何產生、處理、並存入資料庫。

## 概覽

Digest 更新由 Claude Code 執行（使用 `/update-digest` skill），流程完全在記憶體中完成，**不需要直連資料庫**，最後透過 HTTPS 把結果 POST 到 Render server。

```
GitHub Search API（5 個關鍵字組合）
       ↓
抓取每個 repo 的 README
       ↓
分析：偵測模型、類型、技術堆疊
       ↓
Claude 撰寫繁體中文摘要
       ↓
POST 到 Render /internal/digest/update
       ↓
Render server 寫入 Neon Postgres
```

---

## GitHub 搜尋策略

使用 5 個關鍵字組合搜尋，每組取 12 個結果，合計去重後排序取前 15：

| 查詢 | 目標 |
|---|---|
| `claude anthropic` | Claude 相關工具與應用 |
| `gemini google-ai` | Google AI 相關 |
| `chatgpt openai` | OpenAI 相關 |
| `ai agent mcp` | AI Agent 與 MCP 工具 |
| `rag embedding vector` | RAG 與向量檢索 |

**搜尋範圍**：過去 14 天內有推送（`pushed:>SINCE`）

**排分公式**：

```
starScore   = log10(max(10, stars)) × 18
forkScore   = log10(max(5, forks+1)) × 8
recencyScore = max(0, 18 - 距離最近 push 的天數)
topicScore  = topics 數量 × 1.5
score = starScore + forkScore + recencyScore + topicScore
```

---

## 每個 Repo 的分析欄位

### 自動偵測

| 欄位 | 說明 | 可能值 |
|---|---|---|
| `models` | 相關 AI 模型 | `Claude`, `Gemini`, `ChatGPT`（至少一個） |
| `type` | 專案類型 | `Agent`, `RAG`, `Tool`, `Demo` |
| `stack` | 技術堆疊 | 主要語言 + 框架（react, langchain, fastapi 等） |

### Claude 撰寫的中文摘要

| 欄位 | 字數限制 | 說明 |
|---|---|---|
| `tagline` | 最多 18 字 | 一句話抓住核心定位 |
| `summary` | 80–160 字 | 解決什麼問題、關鍵技術、主要語言 |
| `whyValuable` | 80–160 字 | 今天為什麼值得看、與同類工具的差異 |
| `steps` | 3–5 步 | 具體到指令層級的安裝上手步驟 |
| `difficulty` | — | `簡單` / `中等` / `進階` |
| `eta` | — | `15 分鐘` / `45 分鐘` / `2 小時` |

---

## 執行方式

### 方法一：透過 Claude Code skill（推薦）

在 Claude Code 中輸入：

```
/update-digest
```

Claude 會自動完成全部步驟，包含 GitHub 搜尋、摘要撰寫、資料寫入。

### 方法二：手動執行腳本（需直連資料庫）

```bash
# 需要設定 DATABASE_URL
npm run update:digest
```

> **注意**：Claude Code 的沙盒環境封鎖了 PostgreSQL 的 5432 port，所以在 Claude Code 中只能用 skill 方式執行（透過 Render HTTPS API）。

---

## 所需環境變數

| 變數 | 必填 | 說明 |
|---|---|---|
| `RENDER_URL` | 是 | Render 服務的 base URL |
| `INTERNAL_API_KEY` | 是 | 內部 API 認證金鑰 |
| `GITHUB_TOKEN` | 選填 | 提高 GitHub API rate limit（未認證：60 次/小時，認證：5000 次/小時） |

---

## Digest Payload 結構

寫入資料庫的完整 JSON 格式：

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
      "starsToday": 0,
      "models": ["Claude"],
      "type": "Tool",
      "stack": ["Python", "fastapi"],
      "tagline": "一鍵部署的 MCP Server 工具箱",
      "summary": "...",
      "whyValuable": "...",
      "steps": ["git clone ...", "pip install ...", "..."],
      "difficulty": "簡單",
      "eta": "15 分鐘",
      "score": 87.3
    }
  ],
  "modelCounts": { "Claude": 8, "Gemini": 4, "ChatGPT": 3 },
  "typeCounts": { "Agent": 5, "RAG": 3, "Tool": 6, "Demo": 1 }
}
```

---

## Edition 編號計算

以 **2026-05-21** 為第 1 期起始日：

```
期數 = max(1, floor((今天 - 2026-05-21) / 1天) + 1)
```

---

## 常見問題

**Q：重複執行同一天的 digest 會怎樣？**
A：資料庫使用 `ON CONFLICT DO UPDATE`，會覆蓋當天的資料，不會產生重複記錄。

**Q：GitHub API 有 rate limit 怎麼辦？**
A：設定 `GITHUB_TOKEN` 可把 rate limit 從 60 次/小時提高到 5000 次/小時。

**Q：哪些 repo 會被過濾掉？**
A：fork 的 repo 會被排除（`fork: false`）。
