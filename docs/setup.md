# 環境設定指南

從零開始部署 Daily AI Digest 的完整步驟。

## 前置需求

- Node.js 20 以上
- GitHub 帳號
- [Render](https://render.com) 帳號（免費方案即可）
- [Neon](https://neon.tech) 帳號（免費方案即可）
- [Brevo](https://brevo.com) 帳號（免費方案每天可寄 300 封）

---

## 步驟一：建立 Neon 資料庫

1. 登入 [Neon Console](https://console.neon.tech)
2. 建立新專案，選擇離你最近的 region
3. 建立完成後，複製 **Connection string**（格式：`postgresql://user:password@host/dbname?sslmode=require`）
4. 初始化 schema（需先有 `DATABASE_URL`）：

```bash
DATABASE_URL=postgresql://... npm run db:schema
```

或直接在 Neon Console 的 SQL Editor 貼上 `db/schema.sql` 的內容執行。

---

## 步驟二：部署到 Render

1. 登入 Render，點 **New → Web Service**
2. 連接你的 GitHub repo
3. 設定：
   - **Build Command**：`npm install`
   - **Start Command**：`npm start`
   - **Environment**：Node

4. 在 Render 的 **Environment Variables** 頁面加入以下變數：

| 變數名稱 | 說明 | 範例 |
|---|---|---|
| `DATABASE_URL` | Neon 連線字串 | `postgresql://user:pass@host/db?sslmode=require` |
| `INTERNAL_API_KEY` | 自訂的內部 API 金鑰（任意字串，請保密） | `my-secret-key-123` |
| `BREVO_API_KEY` | Brevo API 金鑰 | `xkeysib-...` |
| `SENDER_EMAIL` | 寄件者信箱（需在 Brevo 驗證） | `digest@yourdomain.com` |
| `EMAIL_TO` | 收件人（多人用逗號分隔） | `user1@gmail.com,user2@gmail.com` |

5. 點 **Deploy** 等待部署完成
6. 記下你的 Render URL（格式：`https://your-app.onrender.com`）

---

## 步驟三：取得 Brevo API 金鑰

1. 登入 [Brevo](https://app.brevo.com)
2. 右上角 → **Profile → SMTP & API → API Keys**
3. 建立新 API Key，複製備用
4. 到 **Senders & Domains** 驗證你的寄件者信箱

---

## 步驟四：設定 GitHub Actions Secrets

1. 進入 GitHub repo → **Settings → Secrets and variables → Actions**
2. 點 **New repository secret**，加入：

| Secret 名稱 | 值 |
|---|---|
| `RENDER_URL` | 你的 Render URL（如 `https://your-app.onrender.com`） |
| `INTERNAL_API_KEY` | 與 Render 上設定的相同值 |

---

## 步驟五：本機開發設定

```bash
# 複製環境變數範本
cp .env.example .env
```

編輯 `.env`：

```bash
DATABASE_URL=postgresql://...
INTERNAL_API_KEY=your-secret-key
RENDER_URL=https://your-app.onrender.com
```

啟動：

```bash
npm start
# 開啟 http://localhost:3000
```

---

## 驗證部署

訪問以下 URL 確認服務正常：

```
https://your-app.onrender.com/health
# 應回傳 {"ok":true}

https://your-app.onrender.com/api/digest/today
# 首次部署尚無資料，會回傳 404
```

資料更新後再次訪問 `/api/digest/today` 應有完整 digest 資料。

---

## 新增電子報收件人

只需修改 Render 的 `EMAIL_TO` 環境變數，支援逗號分隔多位收件人：

```
user1@gmail.com,user2@company.com,user3@example.com
```

不需要改程式碼，Render 會在下次請求時自動套用。
