# 資料庫設計

Daily AI Digest 使用 [Neon Postgres](https://neon.tech) 儲存所有 digest 資料。

## Schema 初始化

```bash
# 方法一：使用 npm script
DATABASE_URL=postgresql://... npm run db:schema

# 方法二：在 Neon Console 的 SQL Editor 直接執行
# 貼上 db/schema.sql 的內容
```

---

## 資料表說明

### `repos`

儲存 GitHub repo 的基本資訊。每個 repo 只有一筆記錄，更新時覆蓋。

| 欄位 | 類型 | 說明 |
|---|---|---|
| `id` | `bigint` PK | GitHub repo ID |
| `full_name` | `text` UK | `owner/name` 格式 |
| `name` | `text` | repo 名稱 |
| `owner` | `text` | 擁有者帳號 |
| `html_url` | `text` | GitHub 頁面 URL |
| `description` | `text` | repo 描述 |
| `language` | `text` | 主要語言 |
| `topics` | `text[]` | Topics 陣列 |
| `license` | `text` | SPDX license ID（如 `MIT`） |
| `created_at` | `timestamptz` | repo 建立時間 |
| `updated_at` | `timestamptz` | 最後更新時間 |
| `last_seen_at` | `timestamptz` | 最後被 digest 收錄的時間 |

---

### `repo_snapshots`

每天為每個 repo 記錄一次星數和 fork 數。

| 欄位 | 類型 | 說明 |
|---|---|---|
| `repo_id` | `bigint` PK, FK | 對應 `repos.id` |
| `snapshot_date` | `date` PK | 快照日期 |
| `stars` | `int` | 當天星數 |
| `forks` | `int` | 當天 fork 數 |
| `pushed_at` | `timestamptz` | 最後 push 時間 |

**索引**：`(snapshot_date)` — 加速依日期查詢

---

### `repo_summaries`

儲存每個 repo 的 README 原文、中文摘要與難度評估。每個 repo 只有一筆，更新時覆蓋。

| 欄位 | 類型 | 說明 |
|---|---|---|
| `repo_id` | `bigint` PK, FK | 對應 `repos.id` |
| `readme_sha` | `text` | README 的 Git SHA（用於偵測是否需要重新生成） |
| `readme_excerpt` | `text` | README 前 500 字節錄 |
| `summary_zh` | `text` | 中文摘要（80–160 字） |
| `why_zh` | `text` | 值得關注的原因（80–160 字） |
| `quick_start_zh` | `jsonb` | 快速上手步驟（JSON 陣列） |
| `difficulty` | `text` | 難度：`簡單` / `中等` / `進階` |
| `eta` | `text` | 預估學習時間：`15 分鐘` / `45 分鐘` / `2 小時` |
| `generated_at` | `timestamptz` | 摘要生成時間 |

---

### `digest_editions`

每天的 digest 版次摘要，包含整份 digest 的完整 JSON payload。

| 欄位 | 類型 | 說明 |
|---|---|---|
| `digest_date` | `date` PK | 版次日期 |
| `edition` | `text` | 版次號（如 `第 2 期`） |
| `theme` | `text` | 當期主題 |
| `total_scanned` | `int` | 本次掃描的 repo 總數 |
| `curated_count` | `int` | 精選數量（通常 15） |
| `payload` | `jsonb` | 完整的 digest JSON（前端直接讀取） |
| `generated_at` | `timestamptz` | 生成時間 |

---

### `digest_items`

每天 digest 中的個別精選項目，方便做跨日查詢與統計。

| 欄位 | 類型 | 說明 |
|---|---|---|
| `digest_date` | `date` PK | 版次日期 |
| `repo_id` | `bigint` PK, FK | 對應 `repos.id` |
| `rank` | `int` | 排名（1 = 最高） |
| `score` | `numeric` | 綜合分數 |
| `models` | `text[]` | 相關模型（`Claude`, `Gemini`, `ChatGPT`） |
| `item_type` | `text` | 類型（`Agent`, `RAG`, `Tool`, `Demo`） |
| `payload` | `jsonb` | 該 item 的完整 JSON |

**索引**：`(digest_date, rank)` — 加速依日期和排名查詢

---

## 資料關聯

```
repos ──────────────┬── repo_snapshots（一對多，依日期）
                    ├── repo_summaries（一對一）
                    └── digest_items（多對多，透過 digest_date + repo_id）

digest_editions ────── digest_items（一對多）
```

---

## 常見查詢

```sql
-- 最新一期 digest
SELECT payload FROM digest_editions ORDER BY digest_date DESC LIMIT 1;

-- 特定日期的精選列表（依排名）
SELECT di.rank, r.full_name, rs.stars
FROM digest_items di
JOIN repos r ON r.id = di.repo_id
JOIN repo_snapshots rs ON rs.repo_id = di.repo_id AND rs.snapshot_date = di.digest_date
WHERE di.digest_date = '2026-05-22'
ORDER BY di.rank;

-- 某個 repo 的星數趨勢
SELECT snapshot_date, stars
FROM repo_snapshots
WHERE repo_id = 123456789
ORDER BY snapshot_date;
```
