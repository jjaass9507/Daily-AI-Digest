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
import nodemailer from 'nodemailer';
import { readFileSync, existsSync } from 'fs';

const RENDER_URL = process.env.RENDER_URL || 'https://daily-ai-digest-36zh.onrender.com';
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const EMAIL_TO = process.env.EMAIL_TO || 'jjaass9507@gmail.com';

const args = process.argv.slice(2);
const ssIdx = args.indexOf('--screenshot');
const screenshotPath = ssIdx !== -1 ? args[ssIdx + 1] : null;

// ── helpers ──────────────────────────────────────────────────────────────────

function modelColor(m) {
  return { Claude: '#e8632b', Gemini: '#4285f4', ChatGPT: '#10a37f' }[m] || '#888';
}
function typeColor(t) {
  return { Agent: '#8b5cf6', RAG: '#2a9df4', Tool: '#f59e0b', Demo: '#10b981' }[t] || '#666';
}
function badge(label, bg) {
  return `<span style="display:inline-block;background:${bg};color:#fff;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;margin-right:3px;letter-spacing:0.3px">${label}</span>`;
}
function num(n) { return (n || 0).toLocaleString('zh-TW'); }

// ── fetch digest ─────────────────────────────────────────────────────────────

async function fetchDigest() {
  const res = await fetch(`${RENDER_URL}/api/digest/today`);
  if (!res.ok) throw new Error(`Digest API returned ${res.status}`);
  return res.json();
}

// ── build HTML ───────────────────────────────────────────────────────────────

function buildHtml(digest, hasScreenshot) {
  const picks = (digest.picks || []).slice(0, 15);
  const mc = digest.modelCounts || {};
  const tc = digest.typeCounts || {};

  const statsHtml = Object.entries({ ...mc, ...tc })
    .map(([k, v]) => `
      <td style="text-align:center;padding:0 16px;border-right:1px solid #eee">
        <div style="font-size:22px;font-weight:800;color:#1d1d1f;line-height:1">${v}</div>
        <div style="font-size:11px;color:#aaa;margin-top:3px">${k}</div>
      </td>`)
    .join('');

  const picksHtml = picks.map((p, i) => {
    const modelBadges = (p.models || []).map(m => badge(m, modelColor(m))).join('');
    const typeBadge = badge(p.type || 'Tool', typeColor(p.type));
    return `
    <tr>
      <td style="padding:20px 0;border-bottom:1px solid #f5f5f7;vertical-align:top">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="width:40px;vertical-align:top;padding-top:4px">
            <span style="font-size:20px;font-weight:900;color:#e8e8ea">${String(i + 1).padStart(2, '0')}</span>
          </td>
          <td style="vertical-align:top">
            <div style="margin-bottom:6px">${modelBadges}${typeBadge}</div>
            <a href="${p.githubUrl || '#'}" style="font-size:16px;font-weight:800;color:#1d1d1f;text-decoration:none;display:block;margin-bottom:3px">${p.name || ''}</a>
            <div style="font-size:13px;color:#888;font-weight:500;margin-bottom:8px">${p.tagline || ''}</div>
            <div style="font-size:14px;color:#444;line-height:1.65;margin-bottom:10px">${p.summary || ''}</div>
            <div style="font-size:12px;color:#aaa">
              ⭐ ${num(p.stars)}
              &nbsp;·&nbsp; ${p.author || ''}
              ${p.stack && p.stack.length ? `&nbsp;·&nbsp; ${p.stack.slice(0, 3).join(' / ')}` : ''}
            </div>
          </td>
        </tr></table>
      </td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${digest.edition || 'Daily AI Digest'}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,'PingFang TC','Noto Sans TC',sans-serif;-webkit-font-smoothing:antialiased">

<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto">

  <!-- Header -->
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0f0f1a 0%,#1a1a2e 100%);border-radius:16px;overflow:hidden;margin-bottom:16px">
      <tr><td style="padding:36px 32px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;margin-bottom:10px">DAILY AI DIGEST</div>
        <div style="font-size:28px;font-weight:900;color:#fff;margin-bottom:8px;line-height:1.2">${digest.dateLabel || ''}</div>
        <div style="font-size:14px;color:rgba(255,255,255,0.55)">${digest.edition || ''} &nbsp;·&nbsp; 精選 ${picks.length} 個 AI 開源專案</div>
      </td></tr>
    </table>
  </td></tr>

  ${hasScreenshot ? `
  <!-- Screenshot -->
  <tr><td style="margin-bottom:16px;display:block">
    <div style="border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);margin-bottom:16px">
      <img src="cid:digest-screenshot" width="100%" style="display:block;max-width:100%" alt="Daily AI Digest 網頁預覽">
    </div>
  </td></tr>
  ` : ''}

  <!-- Stats -->
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;margin-bottom:16px;overflow:hidden">
      <tr>
        ${statsHtml}
        <td style="text-align:center;padding:16px">
          <div style="font-size:22px;font-weight:800;color:#1d1d1f;line-height:1">${num(digest.totalScanned)}</div>
          <div style="font-size:11px;color:#aaa;margin-top:3px">掃描</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Picks -->
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:24px 28px">
      <tr><td style="padding-bottom:4px">
        <div style="font-size:17px;font-weight:800;color:#1d1d1f">今日精選</div>
        <div style="font-size:13px;color:#aaa;margin-top:2px;margin-bottom:16px">從 ${num(digest.totalScanned)} 個候選中精選 ${picks.length} 個</div>
      </td></tr>
      ${picksHtml}
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="text-align:center;padding:20px 0">
    <div style="font-size:12px;color:#bbb">
      <a href="${RENDER_URL}" style="color:#2a9df4;text-decoration:none;font-weight:600">查看網頁版</a>
      &nbsp;·&nbsp; Daily AI Digest &copy; 2026
    </div>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!GMAIL_USER) throw new Error('GMAIL_USER env var is not set');
  if (!GMAIL_APP_PASSWORD) throw new Error('GMAIL_APP_PASSWORD env var is not set');

  console.log('Fetching digest data...');
  const digest = await fetchDigest();

  const hasScreenshot = !!(screenshotPath && existsSync(screenshotPath));
  if (screenshotPath && !hasScreenshot) {
    console.warn(`⚠ Screenshot not found at ${screenshotPath}, sending without image`);
  }

  const html = buildHtml(digest, hasScreenshot);

  const attachments = [];
  if (hasScreenshot) {
    attachments.push({
      filename: 'digest-screenshot.jpg',
      content: readFileSync(screenshotPath),
      cid: 'digest-screenshot',
    });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  const subject = `${digest.edition || 'Daily AI Digest'} ${digest.dateLabel || ''} · 今日 AI 開源精選`;

  console.log(`Sending to ${EMAIL_TO}...`);
  await transporter.sendMail({
    from: `"Daily AI Digest" <${GMAIL_USER}>`,
    to: EMAIL_TO,
    subject,
    html,
    attachments,
  });

  console.log(`✓ Email sent to ${EMAIL_TO}`);
}

main().catch(err => { console.error('✗', err.message); process.exit(1); });
