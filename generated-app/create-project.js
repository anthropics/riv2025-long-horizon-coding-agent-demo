const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Go to homepage
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');

  // Click "Create your first project" button
  await page.click('text=Create your first project');
  await page.waitForTimeout(500);

  // Fill in project details
  await page.fill('input[placeholder*="project name" i], input[name="name"], input:near(:text("Name"))', 'Demo Project');
  await page.waitForTimeout(300);

  // Click Create button
  await page.click('button:has-text("Create")');
  await page.waitForTimeout(1000);

  // Get current URL
  const url = page.url();
  console.log('Current URL:', url);

  await browser.close();
}

main().catch(console.error);
