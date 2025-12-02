import { test, expect } from '@playwright/test';

test('switch to Japanese language', async ({ page }) => {
  // Navigate to settings
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Japanese option
  await page.click('[data-testid="language-ja"]');

  // Wait a moment for the state to update
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-29/test-241-japanese.png', fullPage: true });

  // Verify Japanese is selected
  const japaneseButton = page.locator('[data-testid="language-ja"]');
  await expect(japaneseButton).toHaveClass(/border-primary/);

  // Verify UI text changed to Japanese
  const settingsHeading = page.locator('h1');
  await expect(settingsHeading).toHaveText('設定');
});
