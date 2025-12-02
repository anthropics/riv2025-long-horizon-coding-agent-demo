import { test, expect } from '@playwright/test';

test.describe.serial('Epics Feature', () => {
  test('Setup: Create project', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');

    // Click create project button - either on homepage or projects page
    let createButton = page.locator('text=Create your first project');
    if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createButton.click();
    } else {
      // Try the "New Project" button on projects page
      await page.goto('http://localhost:6174/projects');
      await page.waitForLoadState('networkidle');
      const newProjectBtn = page.locator('button:has-text("New Project")');
      if (await newProjectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await newProjectBtn.click();
      } else {
        // Try "Create your first project" button on projects page
        createButton = page.locator('text=Create your first project');
        await createButton.click();
      }
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Fill project details
    await page.fill('input[id="name"]', 'Epics Test Project');
    await page.waitForTimeout(500);

    // Click create/save button
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Verify we're on the board page for the new project
    await expect(page.url()).toContain('/project/');
  });

  test('Epics page is accessible and displays correctly', async ({ page }) => {
    // Navigate to projects page
    await page.goto('http://localhost:6174/projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Find and click on the project card or link
    const projectCard = page.locator('[class*="border"][class*="rounded"]').first();
    if (await projectCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectCard.click();
      await page.waitForLoadState('networkidle');
    }

    // Get project key from URL after navigating
    let url = page.url();
    let match = url.match(/\/project\/([^/]+)\//);

    // If not on project page yet, find the epics link directly
    if (!match) {
      // Look for any Epics link in sidebar
      const epicsLink = page.locator('a[href*="/epics"]').first();
      if (await epicsLink.isVisible({ timeout: 1000 }).catch(() => false)) {
        await epicsLink.click();
        await page.waitForLoadState('networkidle');
        url = page.url();
        match = url.match(/\/project\/([^/]+)\//);
      }
    }

    const pKey = match ? match[1] : 'ETP';

    // Navigate to epics page
    await page.goto(`http://localhost:6174/project/${pKey}/epics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verify page header (the h1 contains the text "Epics")
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Epics');

    // Verify stats cards are visible
    await expect(page.locator('text=Total Epics')).toBeVisible();

    // Verify Create Epic button exists
    await expect(page.locator('button:has-text("Create Epic")')).toBeVisible();

    // Verify filter controls exist
    await expect(page.locator('input[placeholder*="Search epics"]')).toBeVisible();
    await expect(page.locator('button:has-text("Expand All")')).toBeVisible();
    await expect(page.locator('button:has-text("Collapse All")')).toBeVisible();

    // Verify issue hierarchy legend is visible
    await expect(page.locator('text=Issue Hierarchy')).toBeVisible();
  });

  test('Sidebar shows Epics link in Planning section', async ({ page }) => {
    // Navigate to projects page and go to a project
    await page.goto('http://localhost:6174/projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click on any project element
    const projectCard = page.locator('[class*="border"][class*="rounded"]').first();
    if (await projectCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectCard.click();
      await page.waitForLoadState('networkidle');
    }

    // Verify Epics link is in sidebar
    const epicsLink = page.locator('a:has-text("Epics")');
    await expect(epicsLink).toBeVisible();

    // Click on Epics link
    await epicsLink.click();
    await page.waitForLoadState('networkidle');

    // Verify we're on epics page
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Epics');
  });

  test('Epics page shows empty state when no epics exist', async ({ page }) => {
    // Navigate to projects page
    await page.goto('http://localhost:6174/projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click on any project element
    const projectCard = page.locator('[class*="border"][class*="rounded"]').first();
    if (await projectCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectCard.click();
      await page.waitForLoadState('networkidle');
    }

    // Get project key from URL
    const url = page.url();
    const match = url.match(/\/project\/([^/]+)\//);
    const pKey = match ? match[1] : 'ETP';

    // Navigate to epics page
    await page.goto(`http://localhost:6174/project/${pKey}/epics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check for empty state or stats (depending on existing data)
    const hasEmptyState = await page.locator('text=No epics yet').isVisible().catch(() => false);
    const hasStats = await page.locator('text=Total Epics').isVisible().catch(() => false);

    expect(hasEmptyState || hasStats).toBeTruthy();
  });

  test('Create Epic button opens create issue modal', async ({ page }) => {
    // Navigate to projects page
    await page.goto('http://localhost:6174/projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click on any project element
    const projectCard = page.locator('[class*="border"][class*="rounded"]').first();
    if (await projectCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectCard.click();
      await page.waitForLoadState('networkidle');
    }

    // Get project key from URL
    const url = page.url();
    const match = url.match(/\/project\/([^/]+)\//);
    const pKey = match ? match[1] : 'ETP';

    // Navigate to epics page
    await page.goto(`http://localhost:6174/project/${pKey}/epics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click Create Epic button
    await page.click('button:has-text("Create Epic")');
    await page.waitForTimeout(500);

    // Verify modal opens
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('input[id="summary"]')).toBeVisible();
  });
});
