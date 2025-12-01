import { test, expect } from '@playwright/test';

test('create project and verify sidebar navigation', async ({ page }) => {
  // Navigate to home page
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Click "Create your first project" button
  const createButton = page.locator('button:has-text("Create your first project")');
  await createButton.waitFor({ timeout: 5000 });
  await createButton.click();
  await page.waitForTimeout(1000);

  // Wait for the new project form
  await page.waitForSelector('input#name', { timeout: 5000 });

  // Fill in project name using id selector
  await page.fill('input#name', 'Test Project');
  await page.waitForTimeout(200);

  // Fill in project key using id selector
  await page.fill('input#key', 'TP');
  await page.waitForTimeout(200);

  // Click Create Project button
  await page.click('button[type="submit"]:has-text("Create Project")');
  await page.waitForTimeout(2000);

  // Wait for navigation to board
  await page.waitForURL(/\/project\/TP\/board/, { timeout: 10000 });

  // Verify sidebar now shows full navigation
  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();

  // Verify Planning section
  await expect(page.locator('text=Roadmap')).toBeVisible();
  await expect(page.locator('text=Backlog')).toBeVisible();
  await expect(page.locator('text=Active Sprints')).toBeVisible();

  // Verify Board section
  await expect(page.locator('aside >> text=Board').first()).toBeVisible();

  // Verify Reports section
  await expect(page.locator('text=Burndown Chart')).toBeVisible();
  await expect(page.locator('text=Velocity Chart')).toBeVisible();
  await expect(page.locator('text=Sprint Report')).toBeVisible();

  // Verify Project section
  await expect(page.locator('text=Project Settings')).toBeVisible();
  await expect(page.locator('text=Components')).toBeVisible();
  await expect(page.locator('text=Labels')).toBeVisible();

  // Verify collapse toggle
  await expect(page.locator('text=Collapse')).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-14/test-003-sidebar-with-project.png' });
});
