import { test, expect } from '@playwright/test';

test('Japanese sidebar with project selected', async ({ page }) => {
  // First create a project
  await page.goto('http://localhost:6174/projects/new');
  await page.waitForLoadState('networkidle');

  // Fill project name
  await page.fill('input#name', 'Japanese Test');
  await page.waitForTimeout(500);

  // Click create button
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/project\/.*\/board/);
  await page.waitForLoadState('networkidle');

  // Now set Japanese language
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');
  await page.click('[data-testid="language-ja"]');
  await page.waitForTimeout(500);

  // Go back with history
  await page.goBack();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-29/test-242-v2.png', fullPage: true });
});
