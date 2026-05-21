# GitHub 資料爬取與摘要自動化計畫

本文件說明 Daily AI Digest 後續要補齊的「GitHub 資料爬取 + README 摘要生成 + NeonDB 寫入」工作。目標是讓平台每天取得最新 AI GitHub 專案，完成中文摘要與策展排序後，存進 NeonDB，前台只需要讀取 `/api/digest/today` 就能顯示最新內容。

## 1. 目標與假設

### 目標

1. 每日抓取 GitHub 上近期活躍的 AI 專案。
2. 讀取每個 repo 的 metadata、README、topics、stars、forks、license、更新時間。
3. 使用 GPT/Codex 摘要成繁體中文內容，包含專案一句話定位、價值說明、快速上手步驟、難度、預估時間。
4. 將原始 repo 資料、每日 snapshot、摘要、當日 digest payload 寫入 NeonDB。
5. Render Web Service 只負責讀 DB 並提供 API，不直接在使用者開頁時爬 GitHub。

### 目前假設

- NeonDB 是主要資料來源，`DATABASE_URL` 只放在 Render Environment Variables 或本機 `.env`，不寫入 Git。
- GitHub 抓取可以使用 `GITHUB_TOKEN` 提高 rate limit；沒有 token 時仍可跑，但較容易被限流。
- GPT/Codex 摘要階段可以先由 Codex 自動化或人工觸發完成；若未來要完全雲端無人值守，需改為 OpenAI API 或其他可在雲端執行的摘要服務。
- 前台資料格式以目前 React UI 所需的 digest payload 為準，DB 會同時保留 normalized tables 與完整 JSON payload。

## 2. 資料流程

```text
每日觸發
  -> GitHub Search API 搜尋候選 repo
  -> GitHub Repo API 取得 repo metadata
  -> GitHub README API 取得 README markdown 與 readme_sha
  -> 清洗 README，取摘要上下文
  -> GPT/Codex 產生繁中摘要欄位
  -> 計算 score、rank、starsToday、type、models、difficulty
  -> 寫入 NeonDB normalized tables
  -> 產生 digest_editions.payload
  -> Render API /api/digest/today 回傳最新 payload
  -> 前台 React UI 顯示資料
```

## 3. GitHub 爬取設計

### 搜尋來源

每日使用 GitHub Search API，以最近 14 天仍有 push 的 repo 為主要候選池。

建議 query：

```text
claude anthropic in:name,description,topics pushed:>{since}
gemini google-ai in:name,description,topics pushed:>{since}
chatgpt openai in:name,description,topics pushed:>{since}
ai agent mcp in:name,description,topics pushed:>{since}
rag embedding vector in:name,description,topics pushed:>{since}
```

其中 `{since}` 為執行日往前 14 天，例如 `2026-05-07`。

### Repo 篩選規則

候選 repo 先做以下過濾：

- 排除 fork repo。
- 排除沒有 GitHub URL 或 owner/name 異常的 repo。
- 排除 README 無法讀取且 description 過短的 repo。
- 同一 repo 若被多個 query 搜到，只保留一份。

### 排序分數

初版分數可沿用目前 `scripts/update-digest.mjs` 的概念：

```text
score = starScore + forkScore + recencyScore + topicScore
```

欄位含義：

- `starScore`：使用 stars 的 log 分數，避免大型 repo 完全壓過新 repo。
- `forkScore`：使用 forks 的 log 分數，代表可複製與開發活躍度。
- `recencyScore`：越近期 push 分數越高。
- `topicScore`：topics 越完整，越容易判讀定位。

後續可以再加入：

- README 是否有 quickstart。
- 是否有 demo/example。
- 是否有 license。
- 是否近期新增 release。
- 是否與 Claude / Gemini / ChatGPT / RAG / Agent 明確相關。

## 4. 摘要生成設計

### GPT/Codex 輸入

每個 repo 摘要時，建議提供以下上下文：

```json
{
  "repo": {
    "id": 123,
    "full_name": "owner/repo",
    "description": "...",
    "language": "TypeScript",
    "topics": ["ai", "agent", "mcp"],
    "stars": 1200,
    "forks": 80,
    "html_url": "https://github.com/owner/repo",
    "created_at": "2026-05-01T00:00:00Z",
    "updated_at": "2026-05-21T00:00:00Z",
    "pushed_at": "2026-05-21T00:00:00Z"
  },
  "readme": {
    "sha": "...",
    "excerpt": "cleaned README excerpt, max 4000 chars"
  }
}
```

### GPT/Codex 輸出格式

摘要模型需輸出穩定 JSON，不要輸出 Markdown 段落：

```json
{
  "summary_zh": "用 1 到 2 句繁體中文說明這個專案在做什麼。",
  "why_zh": "說明它為什麼值得今天收錄，包含使用場景或技術亮點。",
  "quick_start_zh": [
    "閱讀 README 並確認必要 API key。",
    "clone repo 並安裝依賴。",
    "依照 README 執行 demo 或範例。"
  ],
  "difficulty": "入門",
  "difficulty_level": 1,
  "eta": "15 分鐘",
  "models": ["Claude", "ChatGPT"],
  "item_type": "Agent",
  "tagline": "短標題，不超過 18 個中文字"
}
```

### 欄位限制

- `summary_zh`：80 到 160 個中文字，避免空泛形容詞。
- `why_zh`：80 到 180 個中文字，需指出具體價值。
- `quick_start_zh`：3 到 5 個步驟。
- `difficulty`：只能是 `入門`、`中階`、`進階`。
- `difficulty_level`：只能是 `1`、`2`、`3`。
- `eta`：例如 `15 分鐘`、`45 分鐘`、`2 小時`。
- `models`：可包含 `Claude`、`Gemini`、`ChatGPT`，至少一個。
- `item_type`：只能是 `Agent`、`RAG`、`Tool`、`Demo`。

## 5. NeonDB Schema 與更新格式

目前 schema 位於 `db/schema.sql`。以下是每張表的責任與更新格式。

### repos

`repos` 保存 repo 的穩定 metadata。每次爬到同一 repo 都使用 upsert。

| 欄位 | 型別 | 更新方式 | 說明 |
| --- | --- | --- | --- |
| `id` | `bigint` | insert only / conflict key | GitHub repo id |
| `full_name` | `text` | upsert | `owner/repo` |
| `name` | `text` | upsert | repo 名稱 |
| `owner` | `text` | upsert | GitHub owner login |
| `html_url` | `text` | upsert | GitHub URL |
| `description` | `text` | upsert | GitHub description |
| `language` | `text` | upsert | 主要語言 |
| `topics` | `text[]` | upsert | GitHub topics |
| `license` | `text` | upsert | SPDX id，例如 `MIT` |
| `created_at` | `timestamptz` | upsert | repo 建立時間 |
| `updated_at` | `timestamptz` | upsert | GitHub metadata 更新時間 |
| `last_seen_at` | `timestamptz` | 每次設為 `now()` | 最近一次被爬取時間 |

Upsert key：

```sql
on conflict (id) do update
```

### repo_snapshots

`repo_snapshots` 保存每日 stars/forks 快照，用來計算 `starsToday` 與趨勢。

| 欄位 | 型別 | 更新方式 | 說明 |
| --- | --- | --- | --- |
| `repo_id` | `bigint` | conflict key | 對應 `repos.id` |
| `snapshot_date` | `date` | conflict key | 快照日期 |
| `stars` | `integer` | upsert | 當日總 stars |
| `forks` | `integer` | upsert | 當日總 forks |
| `pushed_at` | `timestamptz` | upsert | GitHub pushed_at |

Primary key：

```sql
primary key (repo_id, snapshot_date)
```

`starsToday` 計算方式：

```text
starsToday = today.stars - latest_previous_snapshot.stars
```

若沒有前一天 snapshot，初版可設為 `0`，避免誤導。

### repo_summaries

`repo_summaries` 保存每個 repo 最新摘要。當 README SHA 改變，或摘要規格更新時，重新生成。

| 欄位 | 型別 | 更新方式 | 說明 |
| --- | --- | --- | --- |
| `repo_id` | `bigint` | conflict key | 對應 `repos.id` |
| `readme_sha` | `text` | upsert | GitHub README blob sha |
| `readme_excerpt` | `text` | upsert | 清洗後 README 片段 |
| `summary_zh` | `text` | upsert | GPT/Codex 中文摘要 |
| `why_zh` | `text` | upsert | 收錄價值說明 |
| `quick_start_zh` | `jsonb` | upsert | 中文快速上手步驟陣列 |
| `difficulty` | `text` | upsert | `入門` / `中階` / `進階` |
| `eta` | `text` | upsert | 預估上手時間 |
| `generated_at` | `timestamptz` | 每次設為 `now()` | 摘要生成時間 |

建議新增但尚未實作的欄位：

| 欄位 | 型別 | 用途 |
| --- | --- | --- |
| `summary_model` | `text` | 紀錄使用的 GPT/Codex 模型 |
| `summary_version` | `text` | 摘要 prompt 版本，例如 `v1` |
| `difficulty_level` | `integer` | 前台可直接排序或顯示難度 |
| `item_type` | `text` | normalized 保存 `Agent` / `RAG` / `Tool` / `Demo` |
| `models` | `text[]` | normalized 保存相關模型 |

### digest_editions

`digest_editions` 保存每日完整 digest。前台 API 主要讀這張表。

| 欄位 | 型別 | 更新方式 | 說明 |
| --- | --- | --- | --- |
| `digest_date` | `date` | conflict key | digest 日期 |
| `edition` | `text` | upsert | 期數，例如 `第 142 期` |
| `theme` | `text` | upsert | 今日主題 |
| `total_scanned` | `integer` | upsert | GitHub 搜尋總量 |
| `curated_count` | `integer` | upsert | 收錄數量 |
| `payload` | `jsonb` | upsert | 前台完整資料 |
| `generated_at` | `timestamptz` | 每次設為 `now()` | 產生時間 |

`payload` 必須符合前台格式：

```json
{
  "date": "2026-05-21",
  "dateLabel": "2026年5月21日 週四",
  "edition": "第 142 期",
  "theme": "今日值得關注的 AI 開源專案",
  "totalScanned": 11334,
  "curated": 8,
  "picks": [],
  "newlyReleased": [],
  "trending": [],
  "modelCounts": {
    "Claude": 3,
    "Gemini": 2,
    "ChatGPT": 4
  },
  "typeCounts": {
    "Agent": 3,
    "RAG": 2,
    "Tool": 2,
    "Demo": 1
  }
}
```

### digest_items

`digest_items` 保存每日每個收錄 repo 的 normalized item 與完整 payload。

| 欄位 | 型別 | 更新方式 | 說明 |
| --- | --- | --- | --- |
| `digest_date` | `date` | conflict key | 對應 `digest_editions.digest_date` |
| `repo_id` | `bigint` | conflict key | 對應 `repos.id` |
| `rank` | `integer` | 每日重算 | 當日排序 |
| `score` | `numeric` | 每日重算 | 策展分數 |
| `models` | `text[]` | 每日重算 | 相關模型 |
| `item_type` | `text` | 每日重算 | `Agent` / `RAG` / `Tool` / `Demo` |
| `payload` | `jsonb` | 每日重算 | 單一 item 完整資料 |

每次重建某日 digest 時，建議：

```sql
delete from digest_items where digest_date = $1;
insert into digest_items (...)
```

這樣可以避免 rank 改變後留下舊資料。

## 6. Digest Item Payload 格式

`digest_items.payload` 與 `digest_editions.payload.picks[]` 建議保持一致：

```json
{
  "id": "123",
  "rank": 1,
  "name": "repo",
  "author": "owner",
  "fullName": "owner/repo",
  "githubUrl": "https://github.com/owner/repo",
  "models": ["Claude"],
  "type": "Agent",
  "stars": 1200,
  "starsToday": 32,
  "forks": 80,
  "difficulty": "入門",
  "difficultyLevel": 1,
  "eta": "15 分鐘",
  "stack": ["TypeScript", "React"],
  "tagline": "AI Agent 工具",
  "summary": "繁體中文摘要。",
  "whyValuable": "收錄價值說明。",
  "steps": ["步驟一", "步驟二", "步驟三"],
  "codePreview": "$ git clone https://github.com/owner/repo",
  "topics": ["ai", "agent"],
  "license": "MIT",
  "updatedAt": "2026-05-21T00:00:00Z",
  "readmeSha": "...",
  "score": 92.5
}
```

前台目前主要依賴：

- `picks`
- `newlyReleased`
- `trending`
- `modelCounts`
- `typeCounts`
- 每個 item 的 `summary`、`whyValuable`、`steps`、`starsToday`、`difficulty`、`eta`

## 7. 排程方案

### 方案 A：Codex/GPT 介入摘要，寫入 NeonDB

適合現在階段，因為摘要品質可以由 Codex 直接處理。

流程：

1. 每日由 Codex 自動化或人工觸發。
2. Codex 讀取 GitHub 候選 repo 與 README。
3. Codex 生成繁中摘要 JSON。
4. Codex 使用 `DATABASE_URL` 寫入 NeonDB。
5. Render Web Service 讀 NeonDB 顯示。

限制：

- 若執行環境依賴本機，電腦未開機時可能不會跑。
- 需要確保自動化環境可存取 `DATABASE_URL` 與 GitHub API。

### 方案 B：Render Cron + OpenAI API

適合未來要完全雲端無人值守。

流程：

1. Render Cron 每日執行 `npm run update:digest`。
2. Node script 使用 GitHub API 抓資料。
3. Node script 呼叫 OpenAI API 生成摘要。
4. 寫入 NeonDB。
5. Render Web Service 讀 NeonDB。

限制：

- 需要 `OPENAI_API_KEY`。
- 會產生 API 成本。
- 摘要 prompt 與 JSON validation 要寫得更嚴格。

### 目前建議

短期使用方案 A，因為你希望摘要經過 GPT/Codex 品質處理；等平台穩定後，再把摘要 prompt 固化到程式中，轉成方案 B。

## 8. 實作階段

### Phase 1：穩定資料抓取

完成項目：

- GitHub search query 設計。
- repo metadata upsert。
- README fetch 與 `readme_sha` 保存。
- stars/forks 每日 snapshot。
- digest payload 寫入 NeonDB。

驗證：

```bash
npm run db:schema
npm run update:digest
```

檢查：

```sql
select count(*) from digest_editions;
select count(*) from digest_items where digest_date = current_date;
select full_name, last_seen_at from repos order by last_seen_at desc limit 10;
```

### Phase 2：摘要品質固定

完成項目：

- 制定 GPT/Codex 摘要 JSON 格式。
- 建立 summary prompt version。
- 對輸出做 JSON schema validation。
- README SHA 未變時可沿用舊摘要，減少重複生成。

驗證：

```sql
select repo_id, readme_sha, generated_at
from repo_summaries
order by generated_at desc
limit 10;
```

人工抽查：

- 摘要是否真的說明 repo 用途。
- `why_zh` 是否指出具體價值。
- `steps` 是否可操作。
- 難度與 eta 是否合理。

### Phase 3：前台與 API 穩定化

完成項目：

- `/api/digest/today` 永遠回傳最新 digest。
- `/api/digest/:date` 可讀歷史 digest。
- 若 DB 無資料，回傳清楚錯誤，不讓前台全黑。
- 前台顯示資料來源是 database 或 fallback。

驗證：

```bash
npm start
```

```text
GET http://localhost:3000/health
GET http://localhost:3000/api/digest/today
```

### Phase 4：雲端排程決策

需要決策：

- 是否接受 OpenAI API 成本，讓 Render Cron 全自動生成摘要。
- 或保留 Codex/GPT 自動化，採半自動但摘要品質較可控。

若改成 Render Cron，需要新增：

- `OPENAI_API_KEY`
- `SUMMARY_MODEL`
- `SUMMARY_PROMPT_VERSION`
- JSON validation 與 retry
- Render Cron service

## 9. 錯誤處理與資料一致性

### GitHub API 失敗

建議處理：

- 單一 query 失敗不終止整批。
- README 讀不到時使用 repo description 做摘要 fallback。
- rate limit 時記錄錯誤並保留前一天 digest，不覆蓋今日 payload。

### GPT/Codex 摘要失敗

建議處理：

- 單一 repo 摘要失敗時跳過或使用 rule-based fallback。
- JSON 解析失敗時重新要求輸出 JSON。
- 若失敗數超過 30%，不要寫入新的 digest edition。

### DB 寫入失敗

建議處理：

- 使用 transaction 包住每日 digest 寫入。
- `repos`、`repo_snapshots`、`repo_summaries`、`digest_editions`、`digest_items` 必須一致。
- 若任何一段失敗，rollback，避免前台讀到半套資料。

## 10. 安全與機密管理

不得提交到 Git：

- `DATABASE_URL`
- `GITHUB_TOKEN`
- `OPENAI_API_KEY`
- `.env`
- `.env.*`

Render Environment Variables 建議：

```text
DATABASE_URL=...
GITHUB_TOKEN=...
OPENAI_API_KEY=...
SUMMARY_MODEL=gpt-4.1-mini
SUMMARY_PROMPT_VERSION=v1
DIGEST_SIZE=8
```

若任何 secret 曾出現在公開 issue、log、commit 或截圖，應立即 rotate。

## 11. 完成定義

這部分工作完成時，應滿足：

1. 每日可取得至少 8 個 AI repo 候選並寫入 NeonDB。
2. `digest_editions` 有當日 payload。
3. `digest_items` 有當日逐項資料與 rank。
4. `repo_snapshots` 有當日 stars/forks。
5. `repo_summaries` 有繁體中文摘要與快速上手步驟。
6. `/api/digest/today` 能回傳最新 digest。
7. 前台能使用 DB payload 顯示，不依賴瀏覽器端即時 GitHub 抓取。
8. README 或本文件清楚說明如何部署、如何更新、如何驗證。

