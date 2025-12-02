import { test, expect } from '@playwright/test';

test('capture calendar page screenshot', async ({ page }) => {
  // Go to home page
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');

  // Create a project first
  const createBtn = page.locator('button:has-text("Create your first project")');
  await createBtn.waitFor({ state: 'visible' });
  await createBtn.click();

  // Wait for the new project page
  await page.waitForURL('**/projects/new', { timeout: 10000 });

  // Fill in project name
  const nameInput = page.locator('#name');
  await nameInput.waitFor({ state: 'visible' });
  await nameInput.fill('Calendar Demo');
  await page.waitForTimeout(500);

  // Click the form submit button
  const submitBtn = page.locator('button[type="submit"]:has-text("Create Project")');
  await submitBtn.click();

  // Wait for redirect to board
  await page.waitForURL('**/board', { timeout: 10000 });

  // Click Calendar link
  const calendarLink = page.locator('a:has-text("Calendar")');
  await calendarLink.click();

  // Wait for calendar page
  await page.waitForURL('**/calendar', { timeout: 5000 });

  // Verify calendar content is visible
  const calendarTitle = page.locator('h1:has-text("Calendar")');
  await expect(calendarTitle).toBeVisible();

  // Wait a moment for animations
  await page.waitForTimeout(500);

  // Take screenshot for test-222
  await page.screenshot({ path: 'screenshots/issue-20/test-222-calendar.png' });

  // Verify the legend is visible (use exact match)
  const legend = page.locator('span:has-text("Overdue")');
  await expect(legend.first()).toBeVisible();

  // Verify month navigation
  const todayBtn = page.locator('button:has-text("Today")');
  await expect(todayBtn).toBeVisible();
});
