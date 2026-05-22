# 自動排程

Daily AI Digest 的自動化排程設定說明。

## 排程架構

兩個獨立的排程系統各司其職：

| 系統 | 任務 | 觸發時間 |
|---|---|---|
| Claude Code Routines | Digest 更新（抓 GitHub、寫摘要、存 DB） | 由 Claude Code 排程管理 |
| GitHub Actions | 電子報寄送 | 每天台灣時間 08:00 |

---

## GitHub Actions：電子報排程

### Workflow 檔案

位置：`.github/workflows/daily-digest.yml`

```yaml
name: Daily AI Digest

on:
  schedule:
    - cron: "0 0 * * *"  # UTC 00:00 = 台灣時間 08:00
  workflow_dispatch:      # 允許手動觸發

jobs:
  send-email:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Install dependencies
        run: npm install
      - name: Send digest email
        run: node scripts/send-digest-email.mjs
        env:
          RENDER_URL: ${{ secrets.RENDER_URL }}
          INTERNAL_API_KEY: ${{ secrets.INTERNAL_API_KEY }}
```

### 必要的 GitHub Secrets

進入 GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret 名稱 | 值 | 說明 |
|---|---|---|
| `RENDER_URL` | `https://your-app.onrender.com` | Render 服務網址 |
| `INTERNAL_API_KEY` | （與 Render 相同的值） | 內部 API 認證金鑰 |

### 手動觸發

1. GitHub repo → **Actions** tab
2. 左側點 `Daily AI Digest`
3. 右側點 **Run workflow** → **Run workflow**

---

## 確認排程正常運作

1. **確認 workflow 存在**：Actions tab 左側看到 `Daily AI Digest`，且沒有 "disabled" 提示
2. **手動跑一次**：`Run workflow` 成功（綠燈）
3. **等第一次自動觸發**：隔天早上 8 點後到 Actions 頁面確認有一筆 `schedule` 觸發的 run

> **注意**：GitHub 規定若 repo 連續 60 天沒有任何 commit，排程會自動暫停。只要 repo 有活動就不受影響。

---

## Cron 語法說明

```
0 0 * * *
│ │ │ │ └── 星期幾（0-7，0 和 7 都是星期日）
│ │ │ └──── 月份（1-12）
│ │ └────── 日期（1-31）
│ └──────── 小時（0-23，UTC）
└────────── 分鐘（0-59）
```

常用時間對照（台灣時間 = UTC + 8）：

| 台灣時間 | UTC Cron |
|---|---|
| 每天 06:00 | `0 22 * * *`（前一天 UTC 22:00） |
| 每天 08:00 | `0 0 * * *` |
| 每天 09:00 | `0 1 * * *` |
| 每天 12:00 | `0 4 * * *` |

---

## 常見問題

**Q：Actions 頁面看不到 workflow 怎麼辦？**
A：Workflow 必須在 repo 的**預設分支**（通常是 `main` 或 `master`）上才會出現。確認 `.github/workflows/daily-digest.yml` 已在預設分支。

**Q：排程觸發但失敗了怎麼辦？**
A：點進失敗的 run → `send-email` job → 展開出錯的 step 查看詳細錯誤訊息。最常見的原因是 Secrets 未設定或 Render 服務冷啟動超時。

**Q：想改變寄信時間怎麼辦？**
A：修改 `.github/workflows/daily-digest.yml` 中的 cron 表達式，push 到預設分支即生效。
