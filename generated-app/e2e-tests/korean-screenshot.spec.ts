import { test, expect } from '@playwright/test';

test('Take screenshot of Korean UI', async ({ page }) => {
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Korean option
  await page.click('text=한국어');
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-46/test-280-korean-ui.png' });
});

test('Take screenshot of Korean sidebar', async ({ page }) => {
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Korean option
  await page.click('text=한국어');
  await page.waitForTimeout(1000);

  // Navigate to home
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-46/test-281-korean-sidebar.png' });
});
