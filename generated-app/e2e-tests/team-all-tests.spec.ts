import { test, expect } from '@playwright/test';

test.describe('Team Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create a project first if it doesn't exist
    await page.goto('http://localhost:6174/projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check if project already exists
    const projectLink = page.locator('text=Test Project');
    if (await projectLink.count() === 0) {
      // Create a new project
      await page.goto('http://localhost:6174/projects/new');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const nameInput = page.locator('input[placeholder="e.g., Canopy Development"]');
      await nameInput.fill('Test Project');
      await page.waitForTimeout(200);

      const keyInput = page.locator('input[placeholder="e.g., CAN"]');
      await keyInput.fill('TP');
      await page.waitForTimeout(200);

      const createButton = page.getByRole('main').getByRole('button', { name: 'Create Project' });
      await createButton.click();
      await page.waitForURL(/\/project\/TP\//, { timeout: 10000 });
      await page.waitForTimeout(500);
    }
  });

  test('test-244: Team page displays with stats overview', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/team');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify Team page elements
    await expect(page.locator('h1:has-text("Team")')).toBeVisible();
    await expect(page.locator('text=Team Size')).toBeVisible();
    await expect(page.locator('text=Total Available Weeks')).toBeVisible();
    await expect(page.locator('text=Total Capacity (Hours)')).toBeVisible();
    // Use button selector for Add Team Member
    await expect(page.getByRole('button', { name: 'Add Team Member' })).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-30/test-244-final.png' });
  });

  test('test-245: Team link appears in sidebar', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify Team link in sidebar
    const sidebar = page.locator('aside');
    await expect(sidebar.getByRole('link', { name: 'Team' })).toBeVisible();

    // Verify PROJECT section header
    await expect(sidebar.getByRole('heading', { name: 'Project' })).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-30/test-245-final.png' });
  });

  test('test-246: User can add a team member', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/team');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click Add Team Member button
    await page.getByRole('button', { name: 'Add Team Member' }).click();
    await page.waitForTimeout(500);

    // Verify dialog appears - look for the dialog header
    await expect(page.getByRole('heading', { name: 'Add Team Member' })).toBeVisible();

    // Fill in team member details
    await page.fill('input#name', 'John Doe');
    await page.waitForTimeout(200);

    // Click Add Member button
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.waitForTimeout(1000);

    // Verify team member appears in list
    await expect(page.locator('p:has-text("John Doe")')).toBeVisible();
    await expect(page.locator('text=4 weeks')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-30/test-246-final.png' });
  });

  test('test-247: Team member can be assigned to tasks', async ({ page }) => {
    // First ensure there's a team member
    await page.goto('http://localhost:6174/project/TP/team');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Add team member if not exists
    const janeSmith = page.locator('p:has-text("Jane Smith")');
    if (await janeSmith.count() === 0) {
      await page.getByRole('button', { name: 'Add Team Member' }).click();
      await page.waitForTimeout(500);
      await page.fill('input#name', 'Jane Smith');
      await page.waitForTimeout(200);
      await page.getByRole('button', { name: 'Add Member' }).click();
      await page.waitForTimeout(1000);
    }

    // Open Create Issue modal from header - use exact match
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.waitForTimeout(500);

    // Verify Create Issue dialog
    await expect(page.getByRole('heading', { name: 'Create Issue' })).toBeVisible();

    // Click on Assignee dropdown
    await page.locator('button:has-text("Unassigned")').click();
    await page.waitForTimeout(500);

    // Take screenshot showing Team Members section in dropdown
    await page.screenshot({ path: 'screenshots/issue-30/test-247-final.png' });

    // Verify Team Members section exists - use exact text match
    await expect(page.getByText('Team Members', { exact: true })).toBeVisible();
    // Verify Jane Smith is in the list
    const janeInDropdown = page.locator('[role="option"]:has-text("Jane Smith")');
    await expect(janeInDropdown).toBeVisible();
  });
});
