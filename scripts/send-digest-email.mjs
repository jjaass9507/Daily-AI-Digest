#!/usr/bin/env node
/**
 * Send Daily AI Digest as a styled HTML email via Gmail SMTP.
 * Usage: node scripts/send-digest-email.mjs [--screenshot <path>]
 *
 * Required env vars:
 *   RENDER_URL           - base URL of the Render service
 *   GMAIL_USER           - Gmail address used as sender
 *   GMAIL_APP_PASSWORD   - 16-char Gmail App Password
 * Optional:
 *   EMAIL_TO             - recipient (default: jjaass9507@gmail.com)
 */
import { readFileSync, existsSync } from 'fs';

const RENDER_URL = process.env.RENDER_URL || 'https://daily-ai-digest-36zh.onrender.com';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const EMAIL_TO = process.env.EMAIL_TO || 'jjaass9507@gmail.com';

const args = process.argv.slice(2);
const ssIdx = args.indexOf('--screenshot');
const screenshotPath = ssIdx !== -1 ? args[ssIdx + 1] : null;

// ── helpers ──────────────────────────────────────────────────────────────────

function modelColor(m) {
  return { Claude: '#e8632b', Gemini: '#4285f4', ChatGPT: '#10a37f' }[m] || '#888888';
}
function typeColor(t) {
  return { Agent: '#8b5cf6', RAG: '#2a9df4', Tool: '#e08a00', Demo: '#10b981' }[t] || '#666666';
}
function num(n) { return (n || 0).toLocaleString('zh-TW'); }

// ── fetch digest ─────────────────────────────────────────────────────────────

async function fetchDigest() {
  const res = await fetch(`${RENDER_URL}/api/digest/today`);
  if (!res.ok) throw new Error(`Digest API returned ${res.status}`);
  return res.json();
}

// ── build HTML (Lotus Notes 6.5 compatible) ───────────────────────────────────

function buildHtml(digest, screenshotUrl) {
  const picks = (digest.picks || []).slice(0, 15);
  const mc = digest.modelCounts || {};
  const allStats = [
    ...Object.entries(mc).map(([k, v]) => ({ label: k, val: v })),
    { label: '掃描', val: num(digest.totalScanned) },
  ];

  const statsHtml = allStats.map(({ label, val }, i) => `
    <td align="center" width="${Math.floor(600 / allStats.length)}" style="padding:14px 10px${i < allStats.length - 1 ? ';border-right:1px solid #f0f0f0' : ''}">
      <font color="#1d1d1f" size="4"><b>${val}</b></font><br>
      <font color="#aaaaaa" size="1">${label}</font>
    </td>`).join('');

  const picksHtml = picks.map((p, i) => {
    const modelLabels = (p.models || []).map(m =>
      `<font color="${modelColor(m)}"><b>[${m}]</b></font>`
    ).join(' ');
    const typeLabel = `<font color="${typeColor(p.type)}"><b>[${p.type || 'Tool'}]</b></font>`;
    const stackStr = (p.stack || []).slice(0, 3).join(' / ');
    const displayUrl = (p.githubUrl || '').replace('https://', '');

    return `
    <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff">
    <tr>
      <td width="44" valign="top" style="padding:16px 0 16px 16px">
        <font color="#cccccc"><b>${String(i + 1).padStart(2, '0')}</b></font>
      </td>
      <td valign="top" style="padding:16px 16px 16px 6px">
        <div>${modelLabels} ${typeLabel}</div>
        <div style="margin-top:6px;margin-bottom:4px">
          <a href="${p.githubUrl || '#'}" style="font-size:16px;color:#1d1d1f;text-decoration:none"><b>${p.name || ''}</b></a>
          &nbsp;<font color="#aaaaaa" size="2">${p.author || ''}</font>
        </div>
        <div style="margin-bottom:8px"><font color="#777777" size="2">${p.tagline || ''}</font></div>
        <div style="margin-bottom:10px"><font color="#444444" size="2">${p.summary || ''}</font></div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="middle">
            <font color="#aaaaaa" size="1">${num(p.stars)} 星${stackStr ? '&nbsp;&nbsp;' + stackStr : ''}</font>
          </td>
          <td align="right" valign="middle">
            <a href="${p.githubUrl || '#'}" style="color:#2a9df4;text-decoration:none;font-size:12px"><b>${displayUrl} &gt;&gt;</b></a>
          </td>
        </tr>
        </table>
      </td>
    </tr>
    </table>
    <table width="600" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="#f0f0f0"></td></tr></table>`;
  }).join('');

  const screenshotSection = screenshotUrl ? `
    <table width="600" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding-bottom:12px">
      <a href="${RENDER_URL}"><img src="${screenshotUrl}" width="600" border="0" alt="Daily AI Digest 網頁截圖" style="display:block"></a>
    </td></tr>
    </table>` : '';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>${digest.edition || 'Daily AI Digest'}</title>
</head>
<body bgcolor="#f0f0f5" style="margin:0;padding:0">

<table width="600" cellpadding="0" cellspacing="0" border="0" align="center">
<tr><td style="padding:20px 0">

  <!-- HEADER -->
  <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0a18">
  <tr><td align="center" style="padding:36px 24px 32px">
    <font color="#555555" size="1"><b>D A I L Y &nbsp; A I &nbsp; D I G E S T</b></font>
    <br><br>
    <font color="#ffffff" size="6"><b>${digest.dateLabel || ''}</b></font>
    <br><br>
    <font color="#888888" size="2">${digest.edition || ''} &nbsp;&middot;&nbsp; 精選 ${picks.length} 個 AI 開源專案</font>
    <br><br><br>
    <!-- CTA button -->
    <table cellpadding="0" cellspacing="0" border="0" align="center">
    <tr>
      <td bgcolor="#2a7fff" align="center" style="padding:16px 48px">
        <font size="4" color="#ffffff"><b><a href="${RENDER_URL}" style="color:#ffffff;text-decoration:none">查看完整電子報</a></b></font>
      </td>
    </tr>
    </table>
    <br>
    <font color="#555555" size="1">${RENDER_URL}</font>
  </td></tr>
  </table>

  <table width="600" cellpadding="0" cellspacing="0" border="0"><tr><td height="12" bgcolor="#f0f0f5"></td></tr></table>

  ${screenshotSection}

  <!-- STATS -->
  <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff">
  <tr>${statsHtml}</tr>
  </table>

  <table width="600" cellpadding="0" cellspacing="0" border="0"><tr><td height="12" bgcolor="#f0f0f5"></td></tr></table>

  <!-- PICKS HEADER -->
  <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff">
  <tr><td style="padding:18px 20px 10px">
    <font color="#1d1d1f" size="4"><b>今日精選</b></font><br>
    <font color="#aaaaaa" size="1">從 ${num(digest.totalScanned)} 個候選中精選</font>
  </td></tr>
  </table>
  <table width="600" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="#f0f0f0"></td></tr></table>

  ${picksHtml}

  <table width="600" cellpadding="0" cellspacing="0" border="0"><tr><td height="12" bgcolor="#f0f0f5"></td></tr></table>

  <!-- FOOTER -->
  <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff">
  <tr><td align="center" style="padding:18px 20px">
    <font size="2" color="#aaaaaa">
      <a href="${RENDER_URL}" style="color:#2a9df4;text-decoration:none"><b>Daily AI Digest 網站</b></a>
      &nbsp;&middot;&nbsp;
      Daily AI Digest &copy; 2026 &nbsp;&middot;&nbsp; 每日自動精選 AI 開源專案
    </font>
  </td></tr>
  </table>

</td></tr>
</table>

</body>
</html>`;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!INTERNAL_API_KEY) throw new Error('INTERNAL_API_KEY env var is not set');

  console.log('Fetching digest data...');
  const digest = await fetchDigest();

  let screenshotUrl = null;
  if (screenshotPath && existsSync(screenshotPath)) {
    console.log('Uploading screenshot to Render...');
    const screenshot = readFileSync(screenshotPath).toString('base64');
    const upRes = await fetch(`${RENDER_URL}/internal/screenshot`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${INTERNAL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ screenshot }),
    });
    if (upRes.ok) {
      const upData = await upRes.json();
      screenshotUrl = upData.url;
      console.log(`✓ Screenshot uploaded: ${screenshotUrl}`);
    } else {
      console.warn('⚠ Screenshot upload failed, sending without image');
    }
  } else if (screenshotPath) {
    console.warn(`⚠ Screenshot not found at ${screenshotPath}, sending without image`);
  }

  const html = buildHtml(digest, screenshotUrl);
  const subject = `${digest.edition || 'Daily AI Digest'} ${digest.dateLabel || ''} · 今日 AI 開源精選`;

  console.log(`Posting to Render /internal/send-email...`);
  const res = await fetch(`${RENDER_URL}/internal/send-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${INTERNAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subject, html }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Send-email API ${res.status}: ${text}`);
  const data = JSON.parse(text);
  if (!data.ok) throw new Error('Email send failed: ' + text);

  console.log(`✓ Email sent (recipients configured on server)`);
}

main().catch(err => { console.error('✗', err.message); process.exit(1); });
