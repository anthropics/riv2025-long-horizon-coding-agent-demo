import { test, expect } from '@playwright/test';

test.describe('Korean Language Support', () => {
  test('Settings page displays Korean language option', async ({ page }) => {
    await page.goto('http://localhost:6174/settings');
    await page.waitForLoadState('networkidle');

    // Check Korean option is visible
    const koreanOption = page.locator('text=한국어');
    await expect(koreanOption).toBeVisible();

    const koreanLabel = page.locator('text=Korean');
    await expect(koreanLabel).toBeVisible();
  });

  test('User can switch to Korean language and UI updates', async ({ page }) => {
    await page.goto('http://localhost:6174/settings');
    await page.waitForLoadState('networkidle');

    // Click on Korean option
    await page.click('text=한국어');
    await page.waitForTimeout(500);

    // Verify Settings page shows Korean text - use more specific locators
    const settingsHeader = page.locator('h1:has-text("설정")');
    await expect(settingsHeader).toBeVisible();

    // Verify Language section title
    const languageCard = page.locator('text=선호하는 언어 선택');
    await expect(languageCard).toBeVisible();
  });

  test('Korean language reflects in sidebar navigation', async ({ page }) => {
    // First set language to Korean
    await page.goto('http://localhost:6174/settings');
    await page.waitForLoadState('networkidle');
    await page.click('text=한국어');
    await page.waitForTimeout(500);

    // Navigate to home
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');

    // Check sidebar has Korean labels - use specific sidebar link
    const projectsLink = page.locator('a:has-text("프로젝트")').first();
    await expect(projectsLink).toBeVisible();

    // Check workflows in Korean
    const workflowsLink = page.locator('a:has-text("워크플로우")');
    await expect(workflowsLink).toBeVisible();
  });
});
