import { test, expect } from '@playwright/test';

test('Capture test-256 - Switch to Mandarin language', async ({ page }) => {
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Mandarin language option
  await page.click('[data-testid="language-zh"]');
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-33/test-256-switched.png', fullPage: false });

  // Verify Settings page header is now in Mandarin
  await expect(page.locator('h1')).toContainText('设置');

  // Verify Profile section title
  await expect(page.getByText('个人资料', { exact: true })).toBeVisible();

  // Verify Language section title
  await expect(page.getByText('语言', { exact: true }).first()).toBeVisible();
});
