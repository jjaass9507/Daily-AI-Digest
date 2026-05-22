# 寄送 Daily AI Digest 電子報

從 Render 抓今日 digest 資料，產生 HTML 電子報，透過 Render server（Brevo API）寄出。
收件人由 Render 環境變數 `EMAIL_TO` 管理，支援逗號分隔多位收件人。

需要的環境變數：
- `RENDER_URL` — Render 服務的 base URL
- `INTERNAL_API_KEY` — Render 內部 API 金鑰

（`BREVO_API_KEY` 與 `EMAIL_TO` 設定在 Render 環境變數，不需在本地設定）

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

等待輸出 `✓ Email sent (recipients configured on server)`。

---

## 完成標準

- 輸出 `✓ Email sent (recipients configured on server)`
- 電子報包含今日 digest 的 picks（通常 15 個）
