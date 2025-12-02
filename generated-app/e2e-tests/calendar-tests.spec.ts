import { test, expect } from '@playwright/test';

test.describe('Calendar Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
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
      await nameInput.fill('Calendar Test');
      await page.waitForTimeout(500);
      const submitBtn = page.locator('button[type="submit"]:has-text("Create Project")');
      await submitBtn.click();
      await page.waitForURL('**/board', { timeout: 10000 });
    }
  });

  test('test-222: Calendar page displays monthly calendar grid', async ({ page }) => {
    // Navigate to Calendar
    const calendarLink = page.locator('a:has-text("Calendar")');
    await calendarLink.click();
    await page.waitForURL('**/calendar', { timeout: 5000 });

    // Verify calendar elements
    const calendarTitle = page.locator('h1:has-text("Calendar")');
    await expect(calendarTitle).toBeVisible();

    // Verify days of week header
    const sunHeader = page.locator('text=Sun').first();
    const satHeader = page.locator('text=Sat').first();
    await expect(sunHeader).toBeVisible();
    await expect(satHeader).toBeVisible();

    // Verify Today button
    const todayBtn = page.locator('button:has-text("Today")');
    await expect(todayBtn).toBeVisible();

    // Verify navigation arrows
    const prevBtn = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') });
    const nextBtn = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') });
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-20/test-222-verified.png' });
  });

  test('test-223: Calendar page shows status legend and stats', async ({ page }) => {
    // Navigate to Calendar
    const calendarLink = page.locator('a:has-text("Calendar")');
    await calendarLink.click();
    await page.waitForURL('**/calendar', { timeout: 5000 });

    // Verify legend items
    const overdueLabel = page.locator('span:has-text("Overdue")');
    const dueTodayLabel = page.locator('span:has-text("Due Today")');
    const upcomingLabel = page.locator('span:has-text("Upcoming")');
    const completedLabel = page.locator('span:has-text("Completed")');

    await expect(overdueLabel).toBeVisible();
    await expect(dueTodayLabel).toBeVisible();
    await expect(upcomingLabel).toBeVisible();
    await expect(completedLabel).toBeVisible();

    // Verify stats text
    const statsText = page.locator('text=items with due dates');
    await expect(statsText).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-20/test-223-verified.png' });
  });

  test('test-224: Calendar link appears in sidebar', async ({ page }) => {
    // Verify sidebar has Planning section
    const planningSection = page.locator('h3:has-text("PLANNING")');
    await expect(planningSection).toBeVisible();

    // Verify Calendar link exists
    const calendarLink = page.locator('a:has-text("Calendar")');
    await expect(calendarLink).toBeVisible();

    // Take screenshot before navigation
    await page.screenshot({ path: 'screenshots/issue-20/test-224-sidebar.png' });

    // Verify Calendar link navigates to correct URL
    await calendarLink.click();
    await page.waitForURL('**/calendar', { timeout: 5000 });

    // Take screenshot after navigation
    await page.screenshot({ path: 'screenshots/issue-20/test-224-verified.png' });
  });
});
