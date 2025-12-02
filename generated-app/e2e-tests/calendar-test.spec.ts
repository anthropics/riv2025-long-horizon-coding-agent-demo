import { test, expect } from '@playwright/test';

// Helper function to create a project if needed
async function ensureProjectExists(page: any) {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');

  // Check if we need to create a project
  const createButton = page.getByRole('button', { name: 'Create your first project' });
  const hasCreateButton = await createButton.isVisible({ timeout: 2000 }).catch(() => false);

  if (hasCreateButton) {
    await createButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Fill in project details
    const nameInput = page.locator('input').first();
    await nameInput.fill('Test Project');
    await page.waitForTimeout(300);

    // Fill project key
    const keyInput = page.locator('input').nth(1);
    await keyInput.fill('TST');
    await page.waitForTimeout(300);

    // Click create button (the submit button in main area, not sidebar)
    await page.getByRole('main').getByRole('button', { name: 'Create Project' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Wait for toast to dismiss and click somewhere neutral to close any dropdowns
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
}

test.describe('Calendar Feature Tests', () => {

  test('test-222: Calendar page displays monthly calendar grid with navigation', async ({ page }) => {
    // First ensure project exists
    await ensureProjectExists(page);

    // Navigate directly to calendar page using URL if we know the project key
    await page.goto('http://localhost:6174/project/TST/calendar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/issue-20/test-222-calendar-page.png' });

    // Verify calendar elements
    await expect(page.locator('h1').filter({ hasText: 'Calendar' })).toBeVisible({ timeout: 5000 });

    // Check for weekday headers
    await expect(page.getByText('Sun').first()).toBeVisible();
    await expect(page.getByText('Mon').first()).toBeVisible();
    await expect(page.getByText('Tue').first()).toBeVisible();
    await expect(page.getByText('Wed').first()).toBeVisible();
    await expect(page.getByText('Thu').first()).toBeVisible();
    await expect(page.getByText('Fri').first()).toBeVisible();
    await expect(page.getByText('Sat').first()).toBeVisible();

    // Check for Today button
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();

    // Take final screenshot
    await page.screenshot({ path: 'screenshots/issue-20/test-222-verified.png' });
  });

  test('test-223: Calendar page shows status legend and stats', async ({ page }) => {
    // Ensure project exists
    await ensureProjectExists(page);

    // Navigate directly to calendar page
    await page.goto('http://localhost:6174/project/TST/calendar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/issue-20/test-223-calendar-page.png' });

    // Verify legend items (use exact match to avoid matching stats text)
    await expect(page.getByText('Overdue', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Due Today', { exact: true })).toBeVisible();
    await expect(page.getByText('Upcoming', { exact: true })).toBeVisible();
    await expect(page.getByText('Completed', { exact: true })).toBeVisible();

    // Verify stats display (items with due dates text)
    await expect(page.getByText(/items with due dates/)).toBeVisible();

    // Take final screenshot
    await page.screenshot({ path: 'screenshots/issue-20/test-223-verified.png' });
  });

  test('test-224: Calendar link appears in sidebar under Planning section', async ({ page }) => {
    // Ensure project exists
    await ensureProjectExists(page);

    // Navigate to board page to see sidebar
    await page.goto('http://localhost:6174/project/TST/board');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/issue-20/test-224-sidebar-view.png' });

    // Verify Planning section exists with Calendar link
    await expect(page.getByText('PLANNING')).toBeVisible({ timeout: 5000 });

    // Verify Calendar link is present in sidebar
    const calendarLink = page.locator('a').filter({ hasText: 'Calendar' }).first();
    await expect(calendarLink).toBeVisible();

    // Verify it has the correct href pattern
    const href = await calendarLink.getAttribute('href');
    expect(href).toMatch(/\/project\/[A-Z]+\/calendar/);

    // Take final screenshot
    await page.screenshot({ path: 'screenshots/issue-20/test-224-verified.png' });
  });
});
