import { test, expect } from '@playwright/test';
import * as fs from 'fs';

// Create a persistent storage context
test.use({
  storageState: undefined,
});

test.describe.serial('Calendar Verification Tests', () => {
  test('setup: create project', async ({ page }) => {
    await page.goto('http://localhost:6174/projects/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.locator('input#name').fill('Verify Calendar');
    await page.waitForTimeout(200);
    await page.locator('input#key').fill('VER');
    await page.waitForTimeout(200);

    await page.locator('button[type="submit"]:has-text("Create Project")').click();
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/project/VER/board');
  });

  test('test-222: verify calendar with console log', async ({ page }) => {
    // First create project
    await page.goto('http://localhost:6174/projects/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.locator('input#name').fill('Test 222');
    await page.locator('input#key').fill('T222');
    await page.locator('button[type="submit"]:has-text("Create Project")').click();
    await page.waitForTimeout(2000);

    // Navigate to calendar
    await page.goto('http://localhost:6174/project/T222/calendar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Capture console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-20/test-222-final.png' });

    // Save console log
    const consoleContent = consoleErrors.length === 0 ? 'NO_CONSOLE_ERRORS' : consoleErrors.join('\n');
    fs.writeFileSync('screenshots/issue-20/test-222-final-console.txt', consoleContent);

    // Verify elements
    await expect(page.locator('h1:has-text("Calendar")')).toBeVisible();
    await expect(page.locator('button:has-text("Today")')).toBeVisible();
    await expect(page.locator('text=Sun')).toBeVisible();
    await expect(page.locator('text=Sat')).toBeVisible();
  });

  test('test-223: verify legend and stats with console log', async ({ page }) => {
    // First create project
    await page.goto('http://localhost:6174/projects/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.locator('input#name').fill('Test 223');
    await page.locator('input#key').fill('T223');
    await page.locator('button[type="submit"]:has-text("Create Project")').click();
    await page.waitForTimeout(2000);

    // Navigate to calendar
    await page.goto('http://localhost:6174/project/T223/calendar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Capture console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-20/test-223-final.png' });

    // Save console log
    const consoleContent = consoleErrors.length === 0 ? 'NO_CONSOLE_ERRORS' : consoleErrors.join('\n');
    fs.writeFileSync('screenshots/issue-20/test-223-final-console.txt', consoleContent);

    // Verify legend elements using exact text matching
    await expect(page.getByText('Overdue', { exact: true })).toBeVisible();
    await expect(page.getByText('Due Today', { exact: true })).toBeVisible();
    await expect(page.getByText('Upcoming', { exact: true })).toBeVisible();
    await expect(page.getByText('Completed', { exact: true })).toBeVisible();
    await expect(page.locator('text=/\\d+ items? with due dates/')).toBeVisible();
  });

  test('test-224: verify sidebar calendar link with console log', async ({ page }) => {
    // First create project
    await page.goto('http://localhost:6174/projects/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.locator('input#name').fill('Test 224');
    await page.locator('input#key').fill('T224');
    await page.locator('button[type="submit"]:has-text("Create Project")').click();
    await page.waitForTimeout(2000);

    // Capture console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Take screenshot of board page showing sidebar
    await page.screenshot({ path: 'screenshots/issue-20/test-224-final.png' });

    // Save console log
    const consoleContent = consoleErrors.length === 0 ? 'NO_CONSOLE_ERRORS' : consoleErrors.join('\n');
    fs.writeFileSync('screenshots/issue-20/test-224-final-console.txt', consoleContent);

    // Verify sidebar elements
    await expect(page.locator('text=PLANNING')).toBeVisible();
    await expect(page.locator('a:has-text("Calendar")')).toBeVisible();

    // Verify Calendar link works
    await page.locator('a:has-text("Calendar")').click();
    await page.waitForURL('**/calendar');
    expect(page.url()).toContain('/calendar');
  });
});
