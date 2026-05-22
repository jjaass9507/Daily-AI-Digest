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

// Screenshot via CID is not supported with Resend; email is sent without inline image.
const screenshotPath = null;

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
  const allStats = [
    ...Object.entries(mc).map(([k, v]) => ({ label: k, val: v })),
    { label: '掃描', val: num(digest.totalScanned) },
  ];

  const statsHtml = allStats.map(({ label, val }, i) => `
    <td style="text-align:center;padding:14px 12px${i < allStats.length - 1 ? ';border-right:1px solid #f0f0f0' : ''}">
      <div style="font-size:20px;font-weight:800;color:#1d1d1f;line-height:1">${val}</div>
      <div style="font-size:11px;color:#aaa;margin-top:3px">${label}</div>
    </td>`).join('');

  const picksHtml = picks.map((p, i) => {
    const modelBadges = (p.models || []).map(m => badge(m, modelColor(m))).join('');
    const typeBadge = badge(p.type || 'Tool', typeColor(p.type));
    // Short display URL: github.com/author/name
    const displayUrl = (p.githubUrl || '').replace('https://', '');
    const stackStr = (p.stack || []).slice(0, 3).join(' · ');
    return `
    <tr>
      <td style="padding:22px 0;border-bottom:1px solid #f5f5f5;vertical-align:top">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="width:36px;vertical-align:top;padding-top:3px">
            <span style="font-size:18px;font-weight:900;color:#e4e4e6">${String(i + 1).padStart(2, '0')}</span>
          </td>
          <td style="vertical-align:top">
            <!-- badges -->
            <div style="margin-bottom:7px">${modelBadges}${typeBadge}</div>

            <!-- title -->
            <a href="${p.githubUrl || '#'}" style="font-size:16px;font-weight:800;color:#1d1d1f;text-decoration:none">${p.name || ''}</a>
            &nbsp;
            <span style="font-size:12px;color:#aaa">${p.author || ''}</span>

            <!-- tagline -->
            <div style="font-size:13px;color:#777;font-weight:500;margin:4px 0 9px">${p.tagline || ''}</div>

            <!-- summary -->
            <div style="font-size:14px;color:#444;line-height:1.7;margin-bottom:12px">${p.summary || ''}</div>

            <!-- meta row: stars + stack + github link -->
            <table cellpadding="0" cellspacing="0" width="100%"><tr>
              <td style="vertical-align:middle">
                <span style="font-size:12px;color:#aaa">⭐ ${num(p.stars)}</span>
                ${stackStr ? `<span style="font-size:12px;color:#ccc">&nbsp;·&nbsp;</span><span style="font-size:12px;color:#aaa">${stackStr}</span>` : ''}
              </td>
              <td style="text-align:right;vertical-align:middle;white-space:nowrap">
                <a href="${p.githubUrl || '#'}"
                   style="display:inline-block;font-size:12px;font-weight:600;color:#2a9df4;text-decoration:none;border:1px solid #d0e8fb;border-radius:6px;padding:3px 10px;background:#f5faff">
                  ${displayUrl}&nbsp;↗
                </a>
              </td>
            </tr></table>

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
<body style="margin:0;padding:0;background:#f0f0f5;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,'PingFang TC','Noto Sans TC',sans-serif;-webkit-font-smoothing:antialiased">

<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto">

  <!-- ── HEADER ── -->
  <tr><td style="padding-bottom:14px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#0a0a18 0%,#141428 60%,#1a1040 100%);border-radius:18px">
      <tr><td style="padding:38px 32px 30px;text-align:center">
        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.35);letter-spacing:4px;text-transform:uppercase;margin-bottom:12px">DAILY AI DIGEST</div>
        <div style="font-size:30px;font-weight:900;color:#fff;line-height:1.15;margin-bottom:8px">${digest.dateLabel || ''}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:24px">${digest.edition || ''} &nbsp;·&nbsp; 精選 ${picks.length} 個 AI 開源專案</div>
        <!-- CTA -->
        <a href="${RENDER_URL}"
           style="display:inline-block;background:#fff;color:#0a0a18;font-size:13px;font-weight:800;padding:10px 28px;border-radius:99px;text-decoration:none;letter-spacing:0.3px">
          查看完整電子報 →
        </a>
      </td></tr>
    </table>
  </td></tr>

  ${hasScreenshot ? `
  <!-- ── SCREENSHOT ── -->
  <tr><td style="padding-bottom:14px">
    <div style="border-radius:14px;overflow:hidden;box-shadow:0 6px 28px rgba(0,0,0,0.12)">
      <img src="cid:digest-screenshot" width="100%" style="display:block;max-width:100%;border-radius:14px" alt="Daily AI Digest 網頁截圖">
    </div>
  </td></tr>
  ` : ''}

  <!-- ── STATS ── -->
  <tr><td style="padding-bottom:14px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden">
      <tr>${statsHtml}</tr>
    </table>
  </td></tr>

  <!-- ── PICKS ── -->
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px">
      <tr><td style="padding:24px 26px 0">
        <div style="font-size:17px;font-weight:800;color:#1d1d1f">今日精選</div>
        <div style="font-size:12px;color:#bbb;margin-top:3px;padding-bottom:6px">從 ${num(digest.totalScanned)} 個候選中精選</div>
      </td></tr>
      <tr><td style="padding:0 26px 8px">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${picksHtml}
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- ── FOOTER ── -->
  <tr><td style="padding:20px 0;text-align:center">
    <div style="font-size:12px;color:#bbb;line-height:2">
      <a href="${RENDER_URL}" style="color:#2a9df4;text-decoration:none;font-weight:600">Daily AI Digest 網站</a>
      &nbsp;·&nbsp;
      <a href="https://github.com/jjaass9507/daily-ai-digest" style="color:#aaa;text-decoration:none">GitHub</a>
    </div>
    <div style="font-size:11px;color:#ccc;margin-top:4px">Daily AI Digest &copy; 2026 &nbsp;·&nbsp; 每日自動精選 AI 開源專案</div>
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

  const hasScreenshot = !!(screenshotPath && existsSync(screenshotPath));
  if (screenshotPath && !hasScreenshot) {
    console.warn(`⚠ Screenshot not found at ${screenshotPath}, sending without image`);
  }

  const html = buildHtml(digest, hasScreenshot);
  const subject = `${digest.edition || 'Daily AI Digest'} ${digest.dateLabel || ''} · 今日 AI 開源精選`;
  const screenshot = hasScreenshot ? readFileSync(screenshotPath).toString('base64') : null;

  console.log(`Posting to Render /internal/send-email...`);
  const res = await fetch(`${RENDER_URL}/internal/send-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${INTERNAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subject, html, screenshot, to: EMAIL_TO }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Send-email API ${res.status}: ${text}`);
  const data = JSON.parse(text);
  if (!data.ok) throw new Error('Email send failed: ' + text);

  console.log(`✓ Email sent to ${EMAIL_TO}`);
}

main().catch(err => { console.error('✗', err.message); process.exit(1); });
