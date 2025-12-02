import { test, expect } from '@playwright/test';

test.describe('Verify Epics Tests with Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Go to home page and create a project
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');

    // Check if we need to create a project
    const createFirstProject = page.locator('text=Create your first project');
    if (await createFirstProject.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createFirstProject.click();
      await page.waitForTimeout(500);

      // Fill project form
      await page.locator('input[placeholder*="project name"]').fill('Test Project');
      await page.waitForTimeout(200);

      // Click create
      const createButton = page.locator('button:has-text("Create Project")');
      await createButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('test-237: Sidebar shows Epics link under Planning', async ({ page }) => {
    // Navigate to a project board
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot showing sidebar with Epics
    await page.screenshot({ path: 'screenshots/issue-27/test-237-sidebar.png', fullPage: true });

    // Verify Epics link in sidebar
    const epicsLink = page.locator('text=Epics');
    await expect(epicsLink).toBeVisible();
  });

  test('test-236: Epics page displays with stats', async ({ page }) => {
    // Navigate to epics page
    await page.goto('http://localhost:6174/project/TP/epics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-27/test-236-epics-page.png', fullPage: true });

    // Verify key elements
    await expect(page.locator('h1:has-text("Epics")')).toBeVisible();
    await expect(page.locator('text=Total Epics')).toBeVisible();
    await expect(page.locator('text=Open')).toBeVisible();
    await expect(page.locator('text=In Progress')).toBeVisible();
    await expect(page.locator('text=Done')).toBeVisible();
  });

  test('test-238: Epics page shows empty state', async ({ page }) => {
    // Navigate to epics page
    await page.goto('http://localhost:6174/project/TP/epics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-27/test-238-empty-state.png', fullPage: true });

    // Verify empty state
    await expect(page.locator('text=No epics yet')).toBeVisible();
    await expect(page.locator('text=Create your first Epic')).toBeVisible();
  });

  test('test-239: Create Epic button opens modal', async ({ page }) => {
    // Navigate to epics page
    await page.goto('http://localhost:6174/project/TP/epics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click Create Epic button
    const createEpicButton = page.locator('button:has-text("Create Epic")');
    await createEpicButton.click();
    await page.waitForTimeout(500);

    // Take screenshot showing modal
    await page.screenshot({ path: 'screenshots/issue-27/test-239-modal.png', fullPage: true });

    // Verify modal is open
    await expect(page.locator('text=Create Issue')).toBeVisible();
  });
});
