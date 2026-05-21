# 寄送 Daily AI Digest 電子報

每日截圖 Daily AI Digest 網頁，並以 Gmail 寄出精美 HTML 電子報。

需要的環境變數：
- `RENDER_URL` — Render 服務的 base URL
- `GMAIL_USER` — 寄件 Gmail 地址
- `GMAIL_APP_PASSWORD` — Gmail 應用程式密碼（16 碼）
- `EMAIL_TO`（選填）— 收件人，預設 jjaass9507@gmail.com

---

## 步驟

### 1. 安裝依賴

```bash
cd /home/user/Daily-AI-Digest && npm install
```

### 2. 截圖 Daily AI Digest 網頁

```bash
node /home/user/Daily-AI-Digest/scripts/screenshot-digest.mjs /tmp/digest-screenshot.jpg
```

等待輸出 `✓ Screenshot saved`。

### 3. 寄送電子報

```bash
cd /home/user/Daily-AI-Digest && node scripts/send-digest-email.mjs --screenshot /tmp/digest-screenshot.jpg
```

等待輸出 `✓ Email sent`。

### 4. 清除暫存截圖

```bash
rm -f /tmp/digest-screenshot.jpg
```

---

## 完成標準

- 步驟 2 輸出 `✓ Screenshot saved: /tmp/digest-screenshot.jpg`
- 步驟 3 輸出 `✓ Email sent to jjaass9507@gmail.com`（或 EMAIL_TO 設定的地址）
- 電子報包含今日 digest 的 picks（通常 15 個）和截圖

## 備注

若 Puppeteer 無法啟動（缺少 Chrome 依賴），步驟 3 仍可執行 — 電子報會以純 HTML 格式寄出（不含截圖）。
