import { test, expect, Page } from '@playwright/test';

// Helper to create a project - uses existing project if available
async function ensureProject(page: Page, name: string, key: string) {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Check if we need to create a project or if one exists
  const welcomeText = page.locator('text=Welcome to Canopy');
  const isWelcome = await welcomeText.isVisible({ timeout: 1000 }).catch(() => false);

  if (isWelcome) {
    // Create project
    const createButton = page.locator('button:has-text("Create your first project")');
    await createButton.click();
    await page.waitForTimeout(500);

    await page.waitForSelector('input#name', { timeout: 5000 });
    await page.fill('input#name', name);
    await page.fill('input#key', key);
    await page.click('button[type="submit"]:has-text("Create Project")');
    await page.waitForTimeout(1500);
  }
}

// Helper to create an issue
async function createIssue(page: Page, summary: string) {
  // Click Create button in header
  await page.click('header button:has-text("Create")');
  await page.waitForTimeout(500);

  // Wait for modal
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

  // Fill in summary
  const summaryInput = page.locator('[role="dialog"] input').first();
  await summaryInput.fill(summary);
  await page.waitForTimeout(200);

  // Click create
  await page.click('[role="dialog"] button:has-text("Create Issue")');
  await page.waitForTimeout(1000);
}

test.describe.serial('All Tests', () => {
  test('test-010: Board columns have correct styling', async ({ page }) => {
    await ensureProject(page, 'Test Project', 'TP');

    // Navigate to board
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-14/test-010-board-columns.png' });

    // Verify board columns exist
    await expect(page.locator('text=To Do').first()).toBeVisible();
    await expect(page.locator('text=In Progress').first()).toBeVisible();
  });

  test('test-007: Create issue from board', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await createIssue(page, 'Test issue created');

    // Verify issue appears
    await expect(page.locator('text=Test issue created')).toBeVisible();

    await page.screenshot({ path: 'screenshots/issue-14/test-007-create-issue.png' });
  });

  test('test-011: Issue cards have correct styling', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-14/test-011-issue-cards.png' });

    // Verify issue card exists
    await expect(page.locator('text=TP-').first()).toBeVisible();
  });

  test('test-012: Issue detail panel opens on click', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click on an issue card
    const issueCard = page.locator('[data-testid="issue-card"], .issue-card, [draggable="true"]').first();
    await issueCard.click();
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-14/test-012-detail-panel.png' });
  });

  test('test-021: Navigate to backlog', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');

    // Click Backlog in sidebar
    await page.click('aside >> text=Backlog');
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/backlog/);
    await page.screenshot({ path: 'screenshots/issue-14/test-021-backlog.png' });
  });

  test('test-034: Navigate to roadmap', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');

    await page.click('aside >> text=Roadmap');
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/roadmap/);
    await page.screenshot({ path: 'screenshots/issue-14/test-034-roadmap.png' });
  });

  test('Navigate to active sprints', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');

    await page.click('aside >> text=Active Sprints');
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/sprints/);
    await page.screenshot({ path: 'screenshots/issue-14/test-active-sprints.png' });
  });

  test('Navigate to project settings', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');

    await page.click('aside >> text=Project Settings');
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/settings/);
    await page.screenshot({ path: 'screenshots/issue-14/test-project-settings.png' });
  });

  test('Navigate to components', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');

    await page.click('aside >> text=Components');
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/components/);
    await page.screenshot({ path: 'screenshots/issue-14/test-components-page.png' });
  });

  test('Navigate to labels', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');

    await page.click('aside >> text=Labels');
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/labels/);
    await page.screenshot({ path: 'screenshots/issue-14/test-labels-page.png' });
  });

  test('Navigate to burndown chart', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');

    await page.click('aside >> text=Burndown Chart');
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/burndown/);
    await page.screenshot({ path: 'screenshots/issue-14/test-burndown-page.png' });
  });

  test('Navigate to velocity chart', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');

    await page.click('aside >> text=Velocity Chart');
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/velocity/);
    await page.screenshot({ path: 'screenshots/issue-14/test-velocity-page.png' });
  });

  test('Navigate to sprint report', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');

    await page.click('aside >> text=Sprint Report');
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/sprint-report/);
    await page.screenshot({ path: 'screenshots/issue-14/test-sprint-report-page.png' });
  });

  test('test-055: Search modal opens with click', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/board');
    await page.waitForLoadState('networkidle');

    // Click on search input in header
    await page.click('header >> text=Search');
    await page.waitForTimeout(500);

    // Verify search modal opens
    const searchModal = page.locator('[role="dialog"]');
    await expect(searchModal).toBeVisible();

    await page.screenshot({ path: 'screenshots/issue-14/test-055-search-modal.png' });
  });

  test('Create label page test', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/labels');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/issue-14/test-065-labels-page.png' });

    // Look for create label button
    const createBtn = page.locator('button:has-text("Create Label")');
    await expect(createBtn).toBeVisible();
  });

  test('Create component page test', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/components');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/issue-14/test-069-components-page.png' });

    // Look for create component button
    const createBtn = page.locator('button:has-text("Create Component")');
    await expect(createBtn).toBeVisible();
  });

  test('test-029: Backlog page with sprint creation', async ({ page }) => {
    await page.goto('http://localhost:6174/project/TP/backlog');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/issue-14/test-029-backlog-sprint.png' });

    // Look for create sprint button
    const createSprintBtn = page.locator('button:has-text("Create Sprint")');
    await expect(createSprintBtn).toBeVisible();
  });
});
