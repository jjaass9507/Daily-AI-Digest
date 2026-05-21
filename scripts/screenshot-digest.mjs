#!/usr/bin/env node
/**
 * Take a full-page screenshot of the Daily AI Digest site using Puppeteer.
 * Usage: node scripts/screenshot-digest.mjs [output-path]
 */
import puppeteer from 'puppeteer';

const RENDER_URL = process.env.RENDER_URL || 'https://daily-ai-digest-36zh.onrender.com';
const OUT = process.argv[2] || '/tmp/digest-screenshot.jpg';

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
  headless: 'new',
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1.5 });
await page.goto(RENDER_URL, { waitUntil: 'networkidle0', timeout: 45000 });

// Wait for the loading overlay to disappear
await page.waitForFunction(
  () => {
    const el = document.getElementById('digest-overlay');
    return !el || el.classList.contains('hidden') || el.style.display === 'none';
  },
  { timeout: 30000 },
).catch(() => {});

// Small pause for any final animations
await new Promise(r => setTimeout(r, 1500));

await page.screenshot({ path: OUT, type: 'jpeg', quality: 88, fullPage: false });
await browser.close();

console.log(`✓ Screenshot saved: ${OUT}`);
