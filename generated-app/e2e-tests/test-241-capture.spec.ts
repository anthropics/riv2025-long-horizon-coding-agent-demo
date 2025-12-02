import { test, expect } from '@playwright/test';

test('capture Japanese language screenshot', async ({ page }) => {
  // Navigate to settings
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Japanese option
  await page.click('[data-testid="language-ja"]');

  // Wait for the state to update
  await page.waitForTimeout(500);

  // Verify UI text changed to Japanese
  const settingsHeading = page.locator('h1');
  await expect(settingsHeading).toHaveText('設定');

  // Take full page screenshot
  await page.screenshot({ path: 'screenshots/issue-29/test-241-japanese-ui.png', fullPage: true });

  // Capture console logs
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleLogs.push(msg.text());
    }
  });

  // Navigate again to trigger any errors
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Take another screenshot after reload showing persistence
  await page.screenshot({ path: 'screenshots/issue-29/test-241-final.png', fullPage: true });

  console.log('Console errors:', consoleLogs.length === 0 ? 'NO_CONSOLE_ERRORS' : consoleLogs.join('\\n'));
});
