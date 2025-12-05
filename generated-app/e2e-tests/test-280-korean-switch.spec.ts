import { test, expect } from '@playwright/test';

test('Switch to Korean and verify UI updates', async ({ page }) => {
  // Go to settings
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Korean option
  const koreanOption = page.locator('text=한국어').first();
  await koreanOption.click();

  // Wait for UI to update
  await page.waitForTimeout(500);

  // Verify Korean translations
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible(); // Settings in Korean
  await expect(page.locator('text=프로필').first()).toBeVisible(); // Profile in Korean
  await expect(page.locator('text=언어').first()).toBeVisible(); // Language in Korean

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-46/test-280-korean-ui.png' });
});
