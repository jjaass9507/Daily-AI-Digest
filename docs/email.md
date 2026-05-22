# 電子報功能

Daily AI Digest 的電子報系統：如何生成 HTML 電子報並透過 Brevo 寄送。

## 概覽

電子報由本機（或 CI）執行 `scripts/send-digest-email.mjs`，流程如下：

```
呼叫 Render /api/digest/today
       ↓
在記憶體中生成 HTML 電子報
       ↓
POST 到 Render /internal/send-email
       ↓
Render server 呼叫 Brevo API 寄信
       ↓
所有收件人收到電子報
```

---

## 電子報樣式

使用純 table 佈局，相容各種郵件客戶端（包含 Lotus Notes 6.5 等舊版）：

- **頂部**：深色 `#0a0a18` 標題列，顯示版次與日期
- **統計區**：模型分佈（Claude / Gemini / ChatGPT）與掃描數量
- **精選列表**：每個 repo 顯示名稱、標語、摘要、[Model] [Type] 標籤
- **CTA 按鈕**：藍色按鈕連結到 Render 網站
- **技術規格**：固定 600px 寬，不使用 CSS gradient / border-radius / emoji

---

## 執行電子報寄送

### 透過 Claude Code skill

```
/send-digest-email
```

### 直接執行腳本

```bash
RENDER_URL=https://your-app.onrender.com \
INTERNAL_API_KEY=your-key \
node scripts/send-digest-email.mjs
```

成功輸出：

```
Fetching digest data...
Posting to Render /internal/send-email...
✓ Email sent (recipients configured on server)
```

---

## 收件人管理

收件人由 **Render 環境變數 `EMAIL_TO`** 管理，不需要改程式碼：

```
# 單人
EMAIL_TO=user@gmail.com

# 多人（逗號分隔）
EMAIL_TO=user1@gmail.com,user2@company.com,user3@example.com
```

更改後 Render 會在下次 API 呼叫時自動套用，**不需要重新部署**。

> **隱私提醒**：多位收件人都在 Brevo 的 `to` 欄位，彼此可以看到對方的信箱。若需要隱藏，可改用 BCC（目前尚未實作）。

---

## 所需環境變數

| 位置 | 變數 | 說明 |
|---|---|---|
| 本機 / CI | `RENDER_URL` | Render 服務 URL |
| 本機 / CI | `INTERNAL_API_KEY` | 內部 API 金鑰 |
| **Render** | `BREVO_API_KEY` | Brevo API 金鑰 |
| **Render** | `SENDER_EMAIL` | 寄件者信箱（需在 Brevo 驗證） |
| **Render** | `EMAIL_TO` | 收件人清單（逗號分隔） |

`BREVO_API_KEY`、`SENDER_EMAIL`、`EMAIL_TO` 只需設在 Render，不需要放在本機 `.env`。

---

## Render 內部 API：`/internal/send-email`

電子報是透過 Render server 的內部 API 寄送，不是直接呼叫 Brevo。

**Request：**

```http
POST /internal/send-email
Authorization: Bearer <INTERNAL_API_KEY>
Content-Type: application/json

{
  "subject": "第 2 期 2026年5月22日 · 今日 AI 開源精選",
  "html": "<html>...</html>"
}
```

**Response：**

```json
{ "ok": true, "messageId": "..." }
```

---

## 常見問題

**Q：寄信失敗顯示 502 brevo_error 怎麼辦？**
A：檢查 Render 上的 `BREVO_API_KEY` 是否正確，以及 `SENDER_EMAIL` 是否已在 Brevo 完成驗證。

**Q：今天沒有 digest 資料會怎樣？**
A：script 在呼叫 `/api/digest/today` 時會得到 404，直接報錯退出，不會寄出空白電子報。

**Q：可以手動指定要寄哪一天的內容嗎？**
A：目前固定讀取 today（最新一期）。若要指定日期，需修改 `send-digest-email.mjs` 中的 API URL。
