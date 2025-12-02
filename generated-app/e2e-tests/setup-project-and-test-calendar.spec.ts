import { test, expect } from '@playwright/test';

test('Setup project and verify calendar feature', async ({ page }) => {
  // Go to create project page
  await page.goto('http://localhost:6174/projects/new');
  await page.waitForLoadState('networkidle');

  // Fill in project name
  const nameInput = page.locator('#name');
  await nameInput.fill('Calendar Test Project');
  await page.waitForTimeout(300);

  // Fill in project key - this should auto-generate but we set it manually
  const keyInput = page.locator('#key');
  await keyInput.clear();
  await keyInput.type('CAL', { delay: 50 });
  await page.waitForTimeout(300);

  // Take screenshot before submit
  await page.screenshot({ path: 'screenshots/issue-20/before-create.png' });

  // Click Create Project button
  const submitButton = page.locator('button[type="submit"]:has-text("Create Project")');
  await submitButton.click();

  // Wait for either navigation or error message
  await page.waitForTimeout(2000);

  // Check current URL
  const url = page.url();
  console.log('After create URL:', url);

  // Take screenshot after submit attempt
  await page.screenshot({ path: 'screenshots/issue-20/after-create-project.png' });

  // Navigate to calendar - the project key should be CAL or CALE (auto-generated from Calendar Test)
  // Let's try CAL first, then CALE
  let calendarUrl = 'http://localhost:6174/project/CAL/calendar';
  await page.goto(calendarUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Take screenshot of calendar
  await page.screenshot({ path: 'screenshots/issue-20/calendar-test.png' });

  // Check if calendar loaded (might be loading state if project doesn't exist)
  const pageContent = await page.content();
  console.log('Page has Sun:', pageContent.includes('Sun'));
  console.log('Page has Loading:', pageContent.includes('Loading'));
});
