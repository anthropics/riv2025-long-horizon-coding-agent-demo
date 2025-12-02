import { test, expect } from '@playwright/test';

test.describe('Issue #26 - Empty Board Create Issue Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home and setup
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');

    // Clear IndexedDB to start fresh
    await page.evaluate(async () => {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    });

    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');
  });

  test('Create Issue button on empty board opens modal', async ({ page }) => {
    // First create a project
    const createProjectBtn = page.locator('button:has-text("Create your first project"), button:has-text("New Project")');
    if (await createProjectBtn.isVisible({ timeout: 2000 })) {
      await createProjectBtn.click();
    } else {
      // Navigate to new project page directly
      await page.goto('http://localhost:6174/projects/new');
    }
    await page.waitForTimeout(500);

    // Fill in project details
    await page.fill('input[name="name"], input[placeholder*="project name"], #name', 'Test Project');
    await page.waitForTimeout(300);

    // Click create button - target the main form submit button
    const submitBtn = page.locator('main button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(1000);

    // Now we should be on the board page which should be empty
    await page.waitForURL('**/board**', { timeout: 5000 }).catch(() => {
      // Try navigating to board manually
    });

    // Check if we're on an empty board page
    const emptyBoardMessage = page.locator('text=Your board is empty');
    const isEmptyBoard = await emptyBoardMessage.isVisible({ timeout: 3000 }).catch(() => false);

    if (!isEmptyBoard) {
      // Navigate to board directly
      const url = page.url();
      const projectKey = url.match(/project\/([^/]+)/)?.[1] || 'TP';
      await page.goto(`http://localhost:6174/project/${projectKey}/board`);
      await page.waitForLoadState('networkidle');
    }

    // Take screenshot of empty board
    await page.screenshot({ path: 'screenshots/issue-26/empty-board-initial.png' });

    // Find and click the Create Issue button on empty board
    const createIssueBtn = page.locator('button:has-text("Create Issue")');
    await expect(createIssueBtn).toBeVisible({ timeout: 5000 });
    await createIssueBtn.click();

    // Verify modal opens
    await page.waitForTimeout(500);
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Verify it's the create issue modal by checking for the dialog heading
    const modalTitle = page.getByRole('heading', { name: 'Create Issue' });
    await expect(modalTitle).toBeVisible();

    // Take screenshot of modal open
    await page.screenshot({ path: 'screenshots/issue-26/create-issue-modal-opened.png' });
  });

  test('Can actually create an issue from empty board', async ({ page }) => {
    // Create a project first
    await page.goto('http://localhost:6174/projects/new');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="name"], input[placeholder*="project name"], #name', 'Bug Fix Project');
    await page.waitForTimeout(300);

    const submitBtn = page.locator('main button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');

    // Get the URL to extract project key
    const url = page.url();
    const projectKey = url.match(/project\/([^/]+)/)?.[1] || 'BFP';

    // Navigate to board page
    await page.goto(`http://localhost:6174/project/${projectKey}/board`);
    await page.waitForLoadState('networkidle');

    // Click the Create Issue button
    const createIssueBtn = page.locator('button:has-text("Create Issue")');
    await createIssueBtn.waitFor({ timeout: 5000 });
    await createIssueBtn.click();

    // Wait for modal to open
    await page.waitForTimeout(500);

    // Fill in the summary
    const summaryInput = page.locator('input#summary, input[placeholder*="summary"]');
    await summaryInput.fill('Test Issue from Empty Board');

    // Click Create button in modal
    const modalCreateBtn = page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Create"):not(:has-text("Create another"))');
    await modalCreateBtn.click();

    // Wait for modal to close and issue to be created
    await page.waitForTimeout(1000);

    // Verify issue was created - board should now show the issue or not show empty state
    await page.screenshot({ path: 'screenshots/issue-26/after-issue-created.png' });

    // Check that the empty board message is gone OR there's a success toast
    const emptyBoardMessage = page.locator('text=Your board is empty');
    const isStillEmpty = await emptyBoardMessage.isVisible({ timeout: 1000 }).catch(() => false);

    // Either empty message is gone OR we see the issue
    if (isStillEmpty) {
      // If still empty, check for toast success message
      const toast = page.locator('text=Issue created successfully');
      await expect(toast).toBeVisible({ timeout: 3000 });
    }
  });
});
