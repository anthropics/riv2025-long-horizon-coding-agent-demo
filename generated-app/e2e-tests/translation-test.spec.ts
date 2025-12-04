import { test, expect } from '@playwright/test';

test('language settings translate all pages', async ({ page }) => {
  // Go to settings page
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Japanese language option
  await page.click('text=日本語');
  await page.waitForTimeout(500);

  // Verify settings page header is translated
  const settingsHeader = page.locator('h1:has-text("設定")');
  await expect(settingsHeader).toBeVisible();

  // Navigate to projects page
  await page.click('text=プロジェクト');
  await page.waitForTimeout(500);

  // Verify projects page header is translated
  const projectsHeader = page.locator('h1:has-text("プロジェクト")');
  await expect(projectsHeader).toBeVisible();
});
