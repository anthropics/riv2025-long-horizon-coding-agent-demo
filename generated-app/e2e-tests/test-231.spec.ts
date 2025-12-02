import { test, expect } from '@playwright/test';

test('test-231: Project settings shows workflow assignment section', async ({ page }) => {
  // First create a project
  await page.goto('http://localhost:6174/projects/new');
  await page.waitForLoadState('networkidle');

  // Fill in project name
  const nameInput = page.locator('input#name');
  await nameInput.click();
  await nameInput.fill('Test Project 231');
  await page.waitForTimeout(500);

  // Create the project
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/project\/.*\/board/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // Navigate to settings
  await page.locator('a:has-text("Project Settings")').click();
  await page.waitForURL(/\/project\/.*\/settings/, { timeout: 5000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({
    path: 'screenshots/issue-23/test-231-94712.png',
    fullPage: true
  });

  // Verify workflow section elements using more specific selectors
  await expect(page.locator('[data-slot="card-title"]:has-text("Workflow")')).toBeVisible();
  await expect(page.getByText('Assign a workflow to define how issues transition')).toBeVisible();
  await expect(page.locator('#workflow')).toBeVisible();
});
