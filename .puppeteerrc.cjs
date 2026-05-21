// Prevent Puppeteer from auto-downloading Chrome during npm install.
// Chrome is installed on demand via: npx puppeteer browsers install chrome
module.exports = { skipDownload: true };
