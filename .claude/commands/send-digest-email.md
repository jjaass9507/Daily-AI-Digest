# 寄送 Daily AI Digest 電子報

從 Render 取得今日 digest 資料，產生 HTML 電子報，透過 Render server（Resend API）寄出。

需要的環境變數：
- `RENDER_URL` — Render 服務的 base URL
- `INTERNAL_API_KEY` — Render 內部 API 金鑰
- `EMAIL_TO`（選填）— 收件人，預設 jjaass9507@gmail.com

（`RESEND_API_KEY` 設定在 Render 環境變數，不需在本地設定）

---

## 步驟

### 1. 安裝依賴

```bash
cd /home/user/Daily-AI-Digest && npm install
```

### 2. 寄送電子報

```bash
node /home/user/Daily-AI-Digest/scripts/send-digest-email.mjs
```

等待輸出 `✓ Email sent`。

---

## 完成標準

- 輸出 `✓ Email sent to jjaass9507@gmail.com`（或 EMAIL_TO 設定的地址）
- 電子報包含今日 digest 的 picks（通常 15 個）
