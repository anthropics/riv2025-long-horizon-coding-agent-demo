import { test, expect } from '@playwright/test';

test('capture screenshots for calendar tests', async ({ page }) => {
  // Go to home page
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');

  // Create a project if needed
  const createBtn = page.locator('button:has-text("Create your first project")');
  if (await createBtn.isVisible()) {
    await createBtn.click();
    await page.waitForURL('**/projects/new', { timeout: 10000 });
    const nameInput = page.locator('#name');
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.fill('Calendar Screenshots');
    await page.waitForTimeout(500);
    const submitBtn = page.locator('button[type="submit"]:has-text("Create Project")');
    await submitBtn.click();
    await page.waitForURL('**/board', { timeout: 10000 });
  }

  // Wait for toast to disappear
  await page.waitForTimeout(2000);

  // Take test-224 screenshot (sidebar with Calendar link on board page)
  await page.screenshot({ path: 'screenshots/issue-20/test-224-capture.png' });

  // Navigate to Calendar
  const calendarLink = page.locator('a:has-text("Calendar")');
  await calendarLink.click();
  await page.waitForURL('**/calendar', { timeout: 5000 });

  // Wait for page to fully load
  await page.waitForTimeout(500);

  // Take test-222 screenshot (calendar grid)
  await page.screenshot({ path: 'screenshots/issue-20/test-222-capture.png' });

  // Take test-223 screenshot (same page - shows legend and stats)
  await page.screenshot({ path: 'screenshots/issue-20/test-223-capture.png' });

  // Log the current URL to verify
  console.log('Current URL:', page.url());
});
