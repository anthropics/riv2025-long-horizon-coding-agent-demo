import { test, expect } from '@playwright/test';

test('switch to Arabic language', async ({ page }) => {
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Arabic language option
  await page.click('[data-testid="language-ar"]');

  // Wait for UI to update
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-31/test-253-arabic-ui.png' });

  // Verify Settings header is now in Arabic
  const settingsHeader = page.locator('h1, h2').filter({ hasText: 'الإعدادات' });
  await expect(settingsHeader).toBeVisible();
});

test('Arabic language shows in sidebar', async ({ page }) => {
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Arabic language option
  await page.click('[data-testid="language-ar"]');

  // Wait for UI to update
  await page.waitForTimeout(500);

  // Verify sidebar shows Arabic labels
  const projectsLabel = page.locator('text=المشاريع');
  await expect(projectsLabel).toBeVisible();
});
