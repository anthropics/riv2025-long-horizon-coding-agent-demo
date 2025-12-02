const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Go to homepage
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');

  // Click create project button
  await page.click('text=Create your first project');
  await page.waitForLoadState('networkidle');

  // Fill project details
  await page.fill('input[id="name"]', 'Test Project');
  await page.waitForTimeout(500);

  // Click create
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Get current URL
  const url = page.url();
  console.log('Current URL:', url);

  await browser.close();
})();
