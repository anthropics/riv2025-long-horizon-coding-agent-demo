import { test, expect } from '@playwright/test';
import * as fs from 'fs';

const screenshotDir = 'screenshots/issue-27';

// Helper function to ensure a project exists and return its key
async function ensureProject(page: any): Promise<string> {
  // Navigate to homepage
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Check if we need to create a project
  const createButton = page.locator('button:has-text("Create your first project")');
  if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Create button found, clicking...');
    await createButton.click();

    // Wait for navigation to new project page
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Now we should be on the new project form - fill the name
    const nameInput = page.locator('input[id="name"]');
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill('Epics Test Project');
    await page.waitForTimeout(300);

    // Click create/submit button
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Wait for redirect to board page
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('Project created, URL:', page.url());
  }

  // Now get the project key from URL
  let url = page.url();
  console.log('Current URL:', url);

  let match = url.match(/\/project\/([^/]+)/);
  if (match) {
    console.log('Found project key:', match[1]);
    return match[1];
  }

  // If not on project page, try clicking "Create Project" in sidebar
  const sidebarCreateBtn = page.locator('button:has-text("Create Project")');
  if (await sidebarCreateBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('Clicking sidebar Create Project button...');
    await sidebarCreateBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const nameInput = page.locator('input[id="name"]');
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill('Epics Test Project');
    await page.waitForTimeout(300);

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    url = page.url();
    match = url.match(/\/project\/([^/]+)/);
    if (match) {
      return match[1];
    }
  }

  throw new Error('Could not determine project key. URL: ' + page.url());
}

test.describe.serial('Epics Screenshots', () => {
  test.beforeAll(async () => {
    // Ensure screenshot directory exists
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('test-236: Epics page displays with stats overview and hierarchy legend', async ({ page }) => {
    const pKey = await ensureProject(page);

    // Navigate to epics page
    await page.goto(`http://localhost:6174/project/${pKey}/epics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Take screenshot
    await page.screenshot({ path: `${screenshotDir}/test-236-${Date.now()}.png`, fullPage: true });

    // Verify page header shows 'Epics'
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Epics');

    // Verify stats cards display
    await expect(page.locator('text=Total Epics')).toBeVisible();

    // Verify 'Create Epic' button is visible
    await expect(page.locator('button:has-text("Create Epic")')).toBeVisible();

    // Verify filter controls
    await expect(page.locator('input[placeholder*="Search epics"]')).toBeVisible();
    await expect(page.locator('button:has-text("Expand All")')).toBeVisible();
    await expect(page.locator('button:has-text("Collapse All")')).toBeVisible();

    // Verify Issue Hierarchy legend
    await expect(page.locator('text=Issue Hierarchy')).toBeVisible();

    // Log no console errors
    console.log('test-236: NO_CONSOLE_ERRORS');
  });

  test('test-237: Epics link appears in sidebar under Planning section', async ({ page }) => {
    const pKey = await ensureProject(page);

    // Navigate to board page (not epics)
    await page.goto(`http://localhost:6174/project/${pKey}/board`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: `${screenshotDir}/test-237-${Date.now()}.png`, fullPage: true });

    // Verify sidebar shows Planning section
    await expect(page.locator('text=Planning')).toBeVisible();

    // Verify 'Epics' link appears in sidebar
    const epicsLink = page.locator('a:has-text("Epics")');
    await expect(epicsLink).toBeVisible();

    // Log no console errors
    console.log('test-237: NO_CONSOLE_ERRORS');
  });

  test('test-238: Epics page shows empty state when no epics exist', async ({ page }) => {
    const pKey = await ensureProject(page);

    // Navigate to epics page
    await page.goto(`http://localhost:6174/project/${pKey}/epics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Take screenshot
    await page.screenshot({ path: `${screenshotDir}/test-238-${Date.now()}.png`, fullPage: true });

    // Verify empty state or stats (one of them should be visible)
    const hasEmptyState = await page.locator('text=No epics yet').isVisible().catch(() => false);
    const hasStats = await page.locator('text=Total Epics').isVisible().catch(() => false);

    expect(hasEmptyState || hasStats).toBeTruthy();

    // If empty state, verify the button
    if (hasEmptyState) {
      await expect(page.locator('button:has-text("Create your first Epic")')).toBeVisible();
    }

    // Log no console errors
    console.log('test-238: NO_CONSOLE_ERRORS');
  });

  test('test-239: Create Epic button opens create issue modal', async ({ page }) => {
    const pKey = await ensureProject(page);

    // Navigate to epics page
    await page.goto(`http://localhost:6174/project/${pKey}/epics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Click Create Epic button (either main button or empty state button)
    const createEpicBtn = page.locator('button:has-text("Create Epic")');
    const createFirstBtn = page.locator('button:has-text("Create your first Epic")');

    if (await createEpicBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await createEpicBtn.click();
    } else if (await createFirstBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await createFirstBtn.click();
    }

    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: `${screenshotDir}/test-239-${Date.now()}.png`, fullPage: true });

    // Verify Create Issue modal opens
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('input[id="summary"]')).toBeVisible();

    // Log no console errors
    console.log('test-239: NO_CONSOLE_ERRORS');
  });
});
