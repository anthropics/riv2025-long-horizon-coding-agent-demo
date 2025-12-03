import { test, expect } from '@playwright/test';

test.describe('Mandarin Language Feature', () => {
  test('Settings page displays Mandarin language option', async ({ page }) => {
    await page.goto('http://localhost:6174/settings');
    await page.waitForLoadState('networkidle');

    // Check that all 4 language options are visible
    await expect(page.locator('[data-testid="language-en"]')).toBeVisible();
    await expect(page.locator('[data-testid="language-ja"]')).toBeVisible();
    await expect(page.locator('[data-testid="language-ar"]')).toBeVisible();
    await expect(page.locator('[data-testid="language-zh"]')).toBeVisible();

    // Verify Mandarin option shows Chinese text
    const mandarinButton = page.locator('[data-testid="language-zh"]');
    await expect(mandarinButton).toContainText('中文');
    await expect(mandarinButton).toContainText('Mandarin');
  });

  test('User can switch to Mandarin language and UI updates', async ({ page }) => {
    await page.goto('http://localhost:6174/settings');
    await page.waitForLoadState('networkidle');

    // Click on Mandarin language option
    await page.click('[data-testid="language-zh"]');
    await page.waitForTimeout(500);

    // Verify Settings page header is now in Mandarin
    await expect(page.locator('h1')).toContainText('设置');

    // Verify Language section title is in Mandarin (use first() for specificity)
    await expect(page.getByText('语言', { exact: true }).first()).toBeVisible();
  });

  test('Mandarin language reflects in sidebar navigation', async ({ page }) => {
    await page.goto('http://localhost:6174/settings');
    await page.waitForLoadState('networkidle');

    // Switch to Mandarin
    await page.click('[data-testid="language-zh"]');
    await page.waitForTimeout(500);

    // Verify sidebar items are in Mandarin (use specific selectors)
    await expect(page.getByRole('link', { name: '项目' })).toBeVisible(); // Projects
    await expect(page.getByRole('link', { name: '关于我们' })).toBeVisible(); // About Us
  });
});
