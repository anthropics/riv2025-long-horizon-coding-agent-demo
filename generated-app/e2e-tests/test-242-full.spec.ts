import { test, expect } from '@playwright/test';

test('Japanese sidebar with project navigation', async ({ page }) => {
  // First create a project using the UI
  await page.goto('http://localhost:6174/projects/new');
  await page.waitForLoadState('networkidle');

  // Fill project name
  await page.fill('input#name', 'Test JP');
  await page.waitForTimeout(300);

  // Click create button
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  // Now set Japanese language
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');
  await page.click('[data-testid="language-ja"]');
  await page.waitForTimeout(500);

  // Navigate to project board
  await page.goto('http://localhost:6174/project/TJP/board');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-29/test-242-full.png', fullPage: true });

  // Verify Japanese labels in sidebar
  const sidebar = page.locator('aside');
  await expect(sidebar).toContainText('プランニング');
});
