#!/usr/bin/env node
// 一次性工具：取得 Gmail OAuth2 Refresh Token（手動貼 code 版）
// 用法：GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=xxx node scripts/get-gmail-token.mjs

import * as readline from "node:readline/promises";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("請先設定環境變數：");
  console.error("  GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=xxx node scripts/get-gmail-token.mjs");
  process.exit(1);
}

const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";
const SCOPE = "https://www.googleapis.com/auth/gmail.send";

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log("\n步驟 1：用瀏覽器開啟以下網址並登入授權\n");
console.log(authUrl);
console.log("\n步驟 2：授權後頁面會顯示一串授權碼，複製貼到下方\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const code = (await rl.question("授權碼：")).trim();
rl.close();

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  }),
});

const data = await tokenRes.json();

if (data.refresh_token) {
  console.log("\n✓ 成功！把以下值填入 Render 環境變數：\n");
  console.log(`GMAIL_REFRESH_TOKEN=${data.refresh_token}\n`);
} else {
  console.error("\n✗ 失敗：", JSON.stringify(data, null, 2));
}
