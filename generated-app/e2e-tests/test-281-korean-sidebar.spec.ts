import { test, expect } from '@playwright/test';

test('Korean language reflects in sidebar navigation', async ({ page }) => {
  // Go to settings first
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Korean option
  const koreanOption = page.locator('text=한국어').first();
  await koreanOption.click();

  // Wait for UI to update
  await page.waitForTimeout(500);

  // Navigate to home page
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');

  // Verify sidebar has Korean translations
  await expect(page.locator('text=프로젝트').first()).toBeVisible(); // Projects
  await expect(page.locator('text=워크플로우')).toBeVisible(); // Workflows
  await expect(page.locator('text=소개')).toBeVisible(); // About Us
  await expect(page.locator('text=이모지 만들기')).toBeVisible(); // Emoji Creator

  // Verify welcome message
  await expect(page.locator('text=Canopy에 오신 것을 환영합니다')).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-46/test-281-korean-home.png' });
});
