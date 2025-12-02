import { test, expect } from '@playwright/test';

test('verify dark mode with different color themes', async ({ page }) => {
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Switch to Cyberpunk theme
  await page.click('button:has-text("Cyberpunk")');
  await page.waitForTimeout(500);

  // Switch to dark mode
  await page.click('button:has-text("Dark")');
  await page.waitForTimeout(500);

  // Verify dark mode is applied with Cyberpunk theme
  const html = page.locator('html');
  await expect(html).toHaveClass(/dark/);
  await expect(html).toHaveClass(/theme-cyberpunk/);
  console.log('✓ Cyberpunk theme in dark mode');

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-25/cyberpunk-dark-mode.png' });
});
