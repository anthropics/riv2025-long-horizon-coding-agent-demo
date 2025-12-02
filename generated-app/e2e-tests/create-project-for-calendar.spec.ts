import { test, expect } from '@playwright/test';

test('create a project and navigate to calendar', async ({ page }) => {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');

  // Click "Create your first project" button
  const createBtn = page.locator('button:has-text("Create your first project")');
  await createBtn.waitFor({ state: 'visible' });
  await createBtn.click();

  // Wait for the new project page
  await page.waitForURL('**/projects/new', { timeout: 10000 });

  // Fill in project name (using id="name" from the page)
  const nameInput = page.locator('#name');
  await nameInput.waitFor({ state: 'visible' });
  await nameInput.fill('Test Project');
  await page.waitForTimeout(500);

  // Click the form submit button (type="submit")
  const submitBtn = page.locator('button[type="submit"]:has-text("Create Project")');
  await submitBtn.click();

  // Wait for redirect to board
  await page.waitForURL('**/board', { timeout: 10000 });

  // Verify sidebar has Calendar link
  const calendarLink = page.locator('a:has-text("Calendar")');
  await expect(calendarLink).toBeVisible();

  // Click Calendar to navigate
  await calendarLink.click();

  // Wait for calendar page
  await page.waitForURL('**/calendar', { timeout: 5000 });

  // Verify Calendar page loads
  const calendarTitle = page.locator('h1:has-text("Calendar")');
  await expect(calendarTitle).toBeVisible();

  // Screenshot the calendar page
  await page.screenshot({ path: 'screenshots/issue-20/calendar-page-e2e.png' });
});
