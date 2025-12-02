import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test('test-250: expandable tables with record data', async ({ page }) => {
    await page.goto('http://localhost:6174/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for tables to load
    await page.waitForSelector('text=users');

    // Click on the users table row to expand it (it has 2 records)
    const usersRow = page.locator('text=users').first();
    await usersRow.click();

    // Wait for expansion
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-32/test-250-expanded.png', fullPage: true });

    // Verify records are shown
    const records = page.locator('text=#1');
    await expect(records).toBeVisible();
  });

  test('test-251: Record Inspector shows selected record', async ({ page }) => {
    await page.goto('http://localhost:6174/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for tables to load
    await page.waitForSelector('text=users');

    // Click on users table to expand
    await page.locator('text=users').first().click();
    await page.waitForTimeout(500);

    // Click on the first record
    const firstRecord = page.locator('text=#1').first();
    await firstRecord.click();
    await page.waitForTimeout(500);

    // Take screenshot showing the Record Inspector with data
    await page.screenshot({ path: 'screenshots/issue-32/test-251-inspector.png', fullPage: true });

    // Verify Record Inspector shows JSON data
    const inspector = page.locator('text=Record Inspector');
    await expect(inspector).toBeVisible();
  });
});
