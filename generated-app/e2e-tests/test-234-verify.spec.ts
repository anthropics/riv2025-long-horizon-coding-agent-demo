import { test, expect } from '@playwright/test';

test('verify theme persists after reload', async ({ page }) => {
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Forest theme
  await page.click('button:has-text("Forest")');
  await page.waitForTimeout(500);

  // Verify Forest theme is applied
  const html = page.locator('html');
  await expect(html).toHaveClass(/theme-forest/);
  console.log('✓ Forest theme applied before reload');

  // Take screenshot before reload
  await page.screenshot({ path: 'screenshots/issue-25/test-234-before-reload.png' });

  // Reload the page
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Verify Forest theme persists after reload
  await expect(html).toHaveClass(/theme-forest/);
  console.log('✓ Forest theme persisted after reload');

  // Take screenshot after reload
  await page.screenshot({ path: 'screenshots/issue-25/test-234-after-reload.png' });
});
