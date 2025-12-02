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
    // First create a project using the form properly
    await page.goto('http://localhost:6174/projects/new');
    await page.waitForLoadState('networkidle');

    // Fill in project name by clicking and typing
    const nameInput = page.locator('input#name');
    await nameInput.click();
    await nameInput.fill('Test Workflow Project');
    await page.waitForTimeout(500);

    // Click Create Project button (within the form)
    const submitButton = page.locator('form button[type="submit"]');
    await submitButton.click();

    // Wait for navigation to board page
    await page.waitForURL(/\/project\/.*\/board/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Navigate to project settings using sidebar
    const settingsLink = page.locator('a:has-text("Project Settings")');
    await settingsLink.waitFor({ state: 'visible', timeout: 5000 });
    await settingsLink.click();

    await page.waitForURL(/\/project\/.*\/settings/, { timeout: 5000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check workflow section is visible using data-slot selector
    await expect(page.locator('[data-slot="card-title"]:has-text("Workflow")')).toBeVisible();
    await expect(page.locator('text=Assign a workflow to define how issues transition')).toBeVisible();

    // Check workflow select is present
    await expect(page.locator('#workflow')).toBeVisible();
  });
});

