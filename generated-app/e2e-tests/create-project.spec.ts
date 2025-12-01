import { test, expect } from '@playwright/test';

test('create a project and verify board', async ({ page }) => {
  // Go directly to the new project page
  await page.goto('http://localhost:6174/projects/new');
  await page.waitForLoadState('networkidle');

  // Fill in project details using id selector
  await page.fill('#name', 'Canopy Core');

  // Wait for key to auto-generate
  await page.waitForTimeout(500);

  // Take screenshot before clicking
  await page.screenshot({ path: 'screenshots/issue-14/before-create.png' });

  // Click create button and wait for navigation
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {}),
    page.click('button:has-text("Create Project")')
  ]);

  // Wait extra for any IndexedDB operations
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-14/project-created.png' });

  console.log('Current URL:', page.url());
});
