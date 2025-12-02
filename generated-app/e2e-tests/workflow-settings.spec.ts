import { test, expect } from '@playwright/test';

test('Project settings shows workflow section', async ({ page }) => {
  // First create a project using the form
  await page.goto('http://localhost:6174/projects/new');
  await page.waitForLoadState('networkidle');

  // Fill in project name by typing
  const nameInput = page.locator('input#name');
  await nameInput.click();
  await nameInput.fill('Workflow Test Project');

  // Wait for key to be auto-generated
  await page.waitForTimeout(500);

  // Click Create Project button (within the form)
  const submitButton = page.locator('form button[type="submit"]');
  await submitButton.click();

  // Wait for navigation to board page
  await page.waitForURL(/\/project\/.*\/board/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // Take screenshot to see where we are
  await page.screenshot({ path: 'screenshots/issue-23/debug-after-create.png' });

  console.log('Current URL after create:', page.url());

  // Navigate to project settings using sidebar
  const settingsLink = page.locator('a:has-text("Project Settings")');
  await settingsLink.waitFor({ state: 'visible', timeout: 5000 });
  await settingsLink.click();

  await page.waitForURL(/\/project\/.*\/settings/, { timeout: 5000 });
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/issue-23/debug-settings-page.png' });

  // Check workflow section is visible - look for the card with GitBranch icon
  await expect(page.getByText('Workflow', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Assign a workflow')).toBeVisible();

  // Check workflow select is present
  await expect(page.locator('#workflow')).toBeVisible();
});
