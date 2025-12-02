import { test, expect } from '@playwright/test';

test('verify theme switching works', async ({ page }) => {
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Ocean theme
  await page.click('button:has-text("Ocean")');
  await page.waitForTimeout(500);

  // Take screenshot after switching to Ocean
  await page.screenshot({ path: 'screenshots/issue-25/test-233-ocean-theme.png' });

  // Verify Ocean theme is applied
  const html = page.locator('html');
  await expect(html).toHaveClass(/theme-ocean/);
  console.log('✓ Ocean theme class applied');

  // Click on Cyberpunk theme
  await page.click('button:has-text("Cyberpunk")');
  await page.waitForTimeout(500);

  // Take screenshot after switching to Cyberpunk
  await page.screenshot({ path: 'screenshots/issue-25/test-233-cyberpunk-theme.png' });

  // Verify Cyberpunk theme is applied
  await expect(html).toHaveClass(/theme-cyberpunk/);
  console.log('✓ Cyberpunk theme class applied');
});
