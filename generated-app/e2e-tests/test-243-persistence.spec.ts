import { test, expect } from '@playwright/test';

test('Language setting persists after page reload', async ({ page }) => {
  // Navigate to settings
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Switch to Japanese
  await page.click('[data-testid="language-ja"]');
  await page.waitForTimeout(500);

  // Verify Japanese is selected before reload
  const settingsHeading = page.locator('h1');
  await expect(settingsHeading).toHaveText('設定');

  // Reload the page
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Take screenshot showing persistence
  await page.screenshot({ path: 'screenshots/issue-29/test-243-persistence.png', fullPage: true });

  // Verify Japanese is still selected after reload
  await expect(settingsHeading).toHaveText('設定');

  // Verify Japanese option has the checkmark (selected state)
  const japaneseOption = page.locator('[data-testid="language-ja"]');
  await expect(japaneseOption).toHaveClass(/border-primary/);
});
