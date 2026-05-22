# 環境設定指南

從零開始部署 Daily AI Digest 的完整步驟。

## 前置需求

- Node.js 20 以上
- GitHub 帳號
- [Render](https://render.com) 帳號（免費方案即可）
- [Neon](https://neon.tech) 帳號（免費方案即可）
- Gmail 帳號 + Google Cloud Console 存取權（用於 OAuth2 寄信）

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
| `GMAIL_USER` | 寄件 Gmail 地址 | `you@gmail.com` |
| `GMAIL_CLIENT_ID` | Google OAuth2 Client ID | `xxx.apps.googleusercontent.com` |
| `GMAIL_CLIENT_SECRET` | Google OAuth2 Client Secret | `GOCSPX-...` |
| `GMAIL_REFRESH_TOKEN` | Gmail OAuth2 Refresh Token | `1//04...` |
| `EMAIL_TO` | 收件人（多人用逗號分隔） | `user1@gmail.com,user2@gmail.com` |

5. 點 **Deploy** 等待部署完成
6. 記下你的 Render URL（格式：`https://your-app.onrender.com`）

---

## 步驟三：取得 Gmail OAuth2 憑證

1. 開啟 [Google Cloud Console](https://console.cloud.google.com)，建立專案
2. **APIs & Services → Enable APIs** → 啟用 **Gmail API**
3. **Credentials → Create Credentials → OAuth 2.0 Client IDs**，類型選 **Desktop app**
4. 記下 Client ID 與 Client Secret
5. **APIs & Services → OAuth consent screen** → Test users → 加入你的 Gmail
6. 執行腳本取得 Refresh Token：

```bash
GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=xxx node scripts/get-gmail-token.mjs
```

腳本會產生授權網址，瀏覽器開啟授權後將授權碼貼回終端機，即可取得 `GMAIL_REFRESH_TOKEN`。

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
