import { test, expect } from '@playwright/test';

test('Set Japanese and view About page', async ({ page }) => {
  // First go to settings
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Japanese option
  await page.click('text=日本語');
  await page.waitForTimeout(1000);

  // Take screenshot of settings with Japanese selected
  await page.screenshot({ path: 'screenshots/issue-36/settings-japanese.png' });

  // Navigate to about page
  await page.goto('http://localhost:6174/about');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-36/about-japanese.png', fullPage: true });

  // Verify Japanese text
  const pageContent = await page.content();
  console.log('Page contains Canopyへようこそ:', pageContent.includes('Canopyへようこそ'));
});
