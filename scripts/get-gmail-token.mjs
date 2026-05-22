#!/usr/bin/env node
// 一次性工具：取得 Gmail OAuth2 Refresh Token
// 用法：GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=xxx node scripts/get-gmail-token.mjs

import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("請先設定環境變數：");
  console.error("  GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=xxx node scripts/get-gmail-token.mjs");
  process.exit(1);
}

const REDIRECT_URI = "http://localhost:9876/callback";
const SCOPE = "https://www.googleapis.com/auth/gmail.send";

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`;

// 等瀏覽器回呼的小 server
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:9876");
  if (url.pathname !== "/callback") {
    res.end("waiting...");
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    res.end(`<h1>錯誤：${error || "no code"}</h1>`);
    server.close();
    return;
  }

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
    res.end("<h1>成功！請回終端機查看 Refresh Token。</h1>");
    console.log("\n✓ 取得成功！把以下值填入 Render 環境變數：\n");
    console.log(`GMAIL_REFRESH_TOKEN=${data.refresh_token}\n`);
    server.close();
  } else {
    res.end(`<h1>失敗：${JSON.stringify(data)}</h1>`);
    console.error("✗ 失敗：", data);
    server.close();
  }
});

server.listen(9876, () => {
  console.log("請在瀏覽器開啟以下網址授權：\n");
  console.log(authUrl);
  console.log("\n授權完成後會自動取得 Refresh Token。\n");
});
