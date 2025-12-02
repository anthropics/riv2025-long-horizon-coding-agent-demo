const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleMessages.push(`[ERROR] ${msg.text()}`);
    }
  });

  await page.goto('http://localhost:6174/admin/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Click on the users table to expand it (it has 2 records)
  const usersRow = page.locator('text=users').first();
  await usersRow.click();
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-32/test-250-expanded.png' });

  // Save console log
  if (consoleMessages.length === 0) {
    fs.writeFileSync('screenshots/issue-32/test-250-console.txt', 'NO_CONSOLE_ERRORS');
  } else {
    fs.writeFileSync('screenshots/issue-32/test-250-console.txt', consoleMessages.join('\n'));
  }

  console.log('Screenshot saved: screenshots/issue-32/test-250-expanded.png');
  console.log('Console log saved: screenshots/issue-32/test-250-console.txt');
  console.log(consoleMessages.length === 0 ? 'No console errors detected.' : `Found ${consoleMessages.length} console errors.`);

  await browser.close();
})();
