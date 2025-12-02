import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

const screenshotDir = 'screenshots/issue-27';

// Helper function to ensure a project exists and return its key
async function ensureProject(page: Page): Promise<string> {
  // Navigate to homepage
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Check if we need to create a project
  const createButton = page.locator('button:has-text("Create your first project")');
  if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await createButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.fill('input[id="name"]', 'Epics Test Project');
    await page.waitForTimeout(300);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  }

  // Get project key from URL
  const url = page.url();
  const match = url.match(/\/project\/([^/]+)/);
  if (match) {
    return match[1];
  }

  // Fallback: use sidebar
  const sidebarCreateBtn = page.locator('button:has-text("Create Project")');
  if (await sidebarCreateBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await sidebarCreateBtn.click();
    await page.waitForLoadState('networkidle');
    await page.fill('input[id="name"]', 'Epics Test Project');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const newUrl = page.url();
    const newMatch = newUrl.match(/\/project\/([^/]+)/);
    if (newMatch) return newMatch[1];
  }

  throw new Error('Could not create project');
}

// Helper to save console log
function saveConsoleLog(testId: string, hasErrors: boolean) {
  const content = hasErrors ? 'CONSOLE_ERRORS_FOUND' : 'NO_CONSOLE_ERRORS';
  fs.writeFileSync(`${screenshotDir}/${testId}-console.txt`, content);
}

test.describe.serial('Epics Final Tests', () => {
  let projectKey: string;
  let consoleErrors: string[] = [];

  test.beforeAll(async () => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test('test-236: Epics page displays correctly', async ({ page }) => {
    projectKey = await ensureProject(page);

    await page.goto(`http://localhost:6174/project/${projectKey}/epics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Screenshot
    await page.screenshot({ path: `${screenshotDir}/test-236-final.png`, fullPage: true });
    saveConsoleLog('test-236', consoleErrors.length > 0);

    // Assertions
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Epics');
    await expect(page.locator('text=Total Epics')).toBeVisible();
    await expect(page.locator('button:has-text("Create Epic")')).toBeVisible();
    await expect(page.locator('input[placeholder*="Search epics"]')).toBeVisible();
    await expect(page.locator('text=Issue Hierarchy')).toBeVisible();

    expect(consoleErrors.length).toBe(0);
  });

  test('test-237: Sidebar shows Epics link', async ({ page }) => {
    projectKey = await ensureProject(page);

    await page.goto(`http://localhost:6174/project/${projectKey}/board`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Screenshot
    await page.screenshot({ path: `${screenshotDir}/test-237-final.png`, fullPage: true });
    saveConsoleLog('test-237', consoleErrors.length > 0);

    // Assertions
    await expect(page.locator('text=Planning')).toBeVisible();
    await expect(page.locator('a:has-text("Epics")')).toBeVisible();

    expect(consoleErrors.length).toBe(0);
  });

  test('test-238: Epics empty state', async ({ page }) => {
    projectKey = await ensureProject(page);

    await page.goto(`http://localhost:6174/project/${projectKey}/epics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Screenshot
    await page.screenshot({ path: `${screenshotDir}/test-238-final.png`, fullPage: true });
    saveConsoleLog('test-238', consoleErrors.length > 0);

    // Assertions - either empty state or stats
    const hasEmptyState = await page.locator('text=No epics yet').isVisible().catch(() => false);
    const hasStats = await page.locator('text=Total Epics').isVisible().catch(() => false);
    expect(hasEmptyState || hasStats).toBeTruthy();

    expect(consoleErrors.length).toBe(0);
  });

  test('test-239: Create Epic modal opens', async ({ page }) => {
    projectKey = await ensureProject(page);

    await page.goto(`http://localhost:6174/project/${projectKey}/epics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Click Create Epic button
    const createBtn = page.locator('button:has-text("Create Epic")');
    const createFirstBtn = page.locator('button:has-text("Create your first Epic")');

    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
    } else if (await createFirstBtn.isVisible().catch(() => false)) {
      await createFirstBtn.click();
    }
    await page.waitForTimeout(500);

    // Screenshot
    await page.screenshot({ path: `${screenshotDir}/test-239-final.png`, fullPage: true });
    saveConsoleLog('test-239', consoleErrors.length > 0);

    // Assertions
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('input[id="summary"]')).toBeVisible();

    expect(consoleErrors.length).toBe(0);
  });
});
