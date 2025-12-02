import { test, expect } from '@playwright/test';

test('setup project and verify calendar', async ({ page }) => {
  // Navigate to create project page
  await page.goto('http://localhost:6174/projects/new');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Take initial screenshot
  await page.screenshot({ path: 'screenshots/issue-20/new-project-page.png' });

  // Fill in project name
  const nameInput = page.locator('input#name');
  await nameInput.fill('Calendar Test');
  await page.waitForTimeout(300);

  // Fill in project key
  const keyInput = page.locator('input#key');
  await keyInput.fill('CAL');
  await page.waitForTimeout(300);

  // Take screenshot before submit
  await page.screenshot({ path: 'screenshots/issue-20/form-filled.png' });

  // Click create button
  const createBtn = page.locator('button[type="submit"]:has-text("Create Project")');
  await createBtn.click();

  // Wait for navigation or page change
  await page.waitForTimeout(3000);

  // Get current URL
  const url = page.url();
  console.log('Current URL after submit:', url);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-20/after-submit.png' });

  // Navigate to calendar explicitly
  await page.goto('http://localhost:6174/project/CAL/calendar');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // Take calendar screenshot
  await page.screenshot({ path: 'screenshots/issue-20/calendar-page.png' });

  // Verify we're on calendar page or see Loading message
  const pageContent = await page.content();
  console.log('Page has Calendar text:', pageContent.includes('Calendar'));
});
