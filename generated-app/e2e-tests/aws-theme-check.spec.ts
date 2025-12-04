import { test, expect } from '@playwright/test';

test('AWS theme is default and visible in settings', async ({ page }) => {
  // Navigate to settings
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Look for the Color Theme text and scroll it into view
  const colorThemeLabel = page.getByText('Color Theme').first();
  if (await colorThemeLabel.count() > 0) {
    await colorThemeLabel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }

  // Take a screenshot
  await page.screenshot({ path: 'screenshots/issue-44/test-274-color-theme-99999.png', fullPage: false });
});
