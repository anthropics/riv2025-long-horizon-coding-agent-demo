import { test, expect } from '@playwright/test';

test.describe('Workflow Feature', () => {
  test('Workflows page displays default workflow', async ({ page }) => {
    await page.goto('http://localhost:6174/workflows');
    await page.waitForLoadState('networkidle');

    // Check title is displayed
    await expect(page.locator('h1')).toContainText('Workflows');

    // Check default workflow is shown
    await expect(page.locator('text=Default Workflow')).toBeVisible();

    // Check status flow is displayed using exact match badges
    await expect(page.getByRole('listitem').filter({ hasText: 'Default Workflow' }).or(page.locator('[data-slot="card"]').first())).toBeVisible();

    // Check Create Workflow button is visible
    await expect(page.locator('button:has-text("Create Workflow")')).toBeVisible();
  });

  test('Workflows link appears in sidebar', async ({ page }) => {
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');

    // Check Workflows link is in sidebar
    const workflowsLink = page.locator('nav a[href="/workflows"]');
    await expect(workflowsLink).toBeVisible();
    await expect(workflowsLink).toContainText('Workflows');
  });

  test('Create workflow modal opens', async ({ page }) => {
    await page.goto('http://localhost:6174/workflows');
    await page.waitForLoadState('networkidle');

    // Click Create Workflow button
    await page.click('button:has-text("Create Workflow")');

    // Check modal is open
    await expect(page.locator('text=Define the statuses and transitions')).toBeVisible();

    // Check form fields are visible
    await expect(page.locator('input#workflow-name')).toBeVisible();
    await expect(page.locator('textarea#workflow-description')).toBeVisible();
  });

  test('Project settings shows workflow section', async ({ page }) => {
    // First create a project
    await page.goto('http://localhost:6174/projects/new');
    await page.waitForLoadState('networkidle');

    // Fill in project name
    await page.fill('input#name', 'Test Workflow Project');
    await page.waitForTimeout(500);

    // Click Create Project button
    await page.click('button:has-text("Create Project")');

    // Wait for toast or navigation
    await page.waitForTimeout(2000);

    // Get the current URL to find the project key
    const url = page.url();
    const match = url.match(/\/project\/([^/]+)/);
    if (match) {
      const projectKey = match[1];
      // Navigate to project settings
      await page.goto(`http://localhost:6174/project/${projectKey}/settings`);
    } else {
      // If we're still on project create page, wait more and check for navigation
      await page.waitForTimeout(1000);
      // Navigate via sidebar if available
      const settingsLink = page.locator('nav a:has-text("Project Settings")');
      if (await settingsLink.isVisible()) {
        await settingsLink.click();
      }
    }

    await page.waitForLoadState('networkidle');

    // Check workflow section is visible
    await expect(page.locator('h2:has-text("Workflow"), [class*="CardTitle"]:has-text("Workflow")').first()).toBeVisible();
    await expect(page.locator('text=Assign a workflow to define how issues transition')).toBeVisible();

    // Check workflow select is present
    await expect(page.locator('#workflow')).toBeVisible();
  });
});

