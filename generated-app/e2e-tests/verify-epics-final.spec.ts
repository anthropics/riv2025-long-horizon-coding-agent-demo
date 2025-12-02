import { test, expect } from '@playwright/test';

test.describe('Epics Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');

    // Clear IndexedDB and create a fresh project
    await page.evaluate(async () => {
      const deleteRequest = indexedDB.deleteDatabase('CanopyDB');
      await new Promise((resolve, reject) => {
        deleteRequest.onsuccess = resolve;
        deleteRequest.onerror = reject;
      });
    });

    // Reload and create project
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Click "Create your first project" button
    await page.click('text=Create your first project');
    await page.waitForSelector('[role="dialog"]');

    // Fill in project details
    await page.fill('input[placeholder="My Awesome Project"]', 'Test Project');
    await page.waitForTimeout(300);

    // Click Create button in modal
    await page.click('[role="dialog"] button:has-text("Create")');

    // Wait for redirect to board
    await page.waitForURL(/\/project\/[A-Z]+\/board/);
    await page.waitForLoadState('networkidle');
  });

  test('test-236: Epics page displays with stats overview and hierarchy legend', async ({ page }) => {
    // Get the current project key from URL
    const url = page.url();
    const match = url.match(/\/project\/([A-Z]+)\//);
    const projectKey = match ? match[1] : 'TP';

    // Navigate to Epics page
    await page.goto(`http://localhost:6174/project/${projectKey}/epics`);
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Epics")');

    // Verify page header shows 'Epics' with Layers icon
    const header = page.locator('h1:has-text("Epics")');
    await expect(header).toBeVisible();

    // Verify stats cards display: Total Epics, Open, In Progress, Done
    await expect(page.locator('text=Total Epics')).toBeVisible();
    await expect(page.locator('text=Open')).toBeVisible();
    await expect(page.locator('text=In Progress')).toBeVisible();
    await expect(page.locator('text=Done')).toBeVisible();

    // Verify 'Create Epic' button is visible
    await expect(page.locator('button:has-text("Create Epic")')).toBeVisible();

    // Verify filter controls
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    await expect(page.locator('button:has-text("Expand All")')).toBeVisible();
    await expect(page.locator('button:has-text("Collapse All")')).toBeVisible();

    // Verify Issue Hierarchy legend
    await expect(page.locator('text=Issue Hierarchy')).toBeVisible();
    await expect(page.locator('text=Epic (parent)')).toBeVisible();
    await expect(page.locator('text=Child Issues')).toBeVisible();
    await expect(page.locator('text=Sub-tasks')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-27/test-236-verified.png' });
  });

  test('test-237: Epics link appears in sidebar under Planning section', async ({ page }) => {
    // Verify sidebar shows Planning section
    await expect(page.locator('text=PLANNING')).toBeVisible();

    // Verify 'Epics' link appears in sidebar
    const epicsLink = page.locator('a:has-text("Epics")');
    await expect(epicsLink).toBeVisible();

    // Verify Epics link has Zap icon (check it's in sidebar section)
    const sidebar = page.locator('[class*="sidebar"], nav, aside').first();
    await expect(sidebar.locator('text=Epics')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-27/test-237-verified.png' });
  });

  test('test-238: Epics page shows empty state when no epics exist', async ({ page }) => {
    // Get the current project key from URL
    const url = page.url();
    const match = url.match(/\/project\/([A-Z]+)\//);
    const projectKey = match ? match[1] : 'TP';

    // Navigate to Epics page
    await page.goto(`http://localhost:6174/project/${projectKey}/epics`);
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Epics")');

    // Verify empty state message 'No epics yet' is displayed
    await expect(page.locator('text=No epics yet')).toBeVisible();

    // Verify empty state shows description
    await expect(page.locator('text=Epics help you organize related issues into larger initiatives')).toBeVisible();

    // Verify 'Create your first Epic' button is visible
    await expect(page.locator('button:has-text("Create your first Epic")')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-27/test-238-verified.png' });
  });

  test('test-239: Create Epic button opens create issue modal', async ({ page }) => {
    // Get the current project key from URL
    const url = page.url();
    const match = url.match(/\/project\/([A-Z]+)\//);
    const projectKey = match ? match[1] : 'TP';

    // Navigate to Epics page
    await page.goto(`http://localhost:6174/project/${projectKey}/epics`);
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Epics")');

    // Click 'Create Epic' button
    await page.click('button:has-text("Create Epic")');

    // Verify Create Issue modal opens
    await page.waitForSelector('[role="dialog"]');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Verify modal has 'Create Issue' heading
    await expect(page.locator('[role="dialog"] h2:has-text("Create Issue")')).toBeVisible();

    // Verify modal has summary input field
    await expect(page.locator('[role="dialog"] input[placeholder*="summary"], [role="dialog"] input#summary')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-27/test-239-verified.png' });
  });
});
