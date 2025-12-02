import { test, expect } from '@playwright/test';

test('Create a project and navigate to team page', async ({ page }) => {
  // Go directly to new project page
  await page.goto('http://localhost:6174/projects/new');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Fill in project details - use placeholder text to find inputs
  const nameInput = page.locator('input[placeholder="e.g., Canopy Development"]');
  await nameInput.waitFor({ state: 'visible', timeout: 5000 });
  await nameInput.fill('Test Project');
  await page.waitForTimeout(300);

  const keyInput = page.locator('input[placeholder="e.g., CAN"]');
  await keyInput.fill('TP');
  await page.waitForTimeout(300);

  // Click create button in main area (not sidebar)
  const createButton = page.getByRole('main').getByRole('button', { name: 'Create Project' });
  await createButton.click();

  // Wait for navigation after project creation
  await page.waitForURL(/\/project\/TP\//, { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Now navigate to team page using sidebar or direct URL
  await page.goto('http://localhost:6174/project/TP/team');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-30/test-244-team-page-final.png' });
});
