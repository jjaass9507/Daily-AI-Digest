# 寄送 Daily AI Digest 電子報

截圖 Daily AI Digest 網頁，上傳到 Render 取得公開 URL，產生 HTML 電子報（img src 用 URL），透過 Render server（Resend API）寄出。

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

### 2. 安裝 Puppeteer 及 Chrome（用於截圖）

```bash
node -e "import('puppeteer').then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null || npm install puppeteer
npx puppeteer browsers install chrome 2>/dev/null || true
```

### 3. 截圖 Daily AI Digest 網頁

```bash
node /home/user/Daily-AI-Digest/scripts/screenshot-digest.mjs /tmp/digest-screenshot.jpg
```

等待輸出 `✓ Screenshot saved`。若截圖失敗仍可繼續步驟 4（電子報以純 HTML 寄出）。

### 4. 寄送電子報

```bash
node /home/user/Daily-AI-Digest/scripts/send-digest-email.mjs --screenshot /tmp/digest-screenshot.jpg
```

等待輸出 `✓ Email sent`。

### 5. 清除暫存截圖

```bash
rm -f /tmp/digest-screenshot.jpg
```

---

## 完成標準

- 步驟 3 輸出 `✓ Screenshot saved: /tmp/digest-screenshot.jpg`
- 步驟 4 輸出 `✓ Screenshot uploaded: https://...` 以及 `✓ Email sent to jjaass9507@gmail.com`
- 電子報包含今日 digest 的 picks（通常 15 個）及網頁截圖
