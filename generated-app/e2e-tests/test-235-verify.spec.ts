import { test, expect } from '@playwright/test';

test.describe('Test 235 - Empty Board Create Issue Fix', () => {
  test('Create Issue button on empty board opens modal', async ({ page }) => {
    // Navigate to home and clear data
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');

    // Clear IndexedDB
    await page.evaluate(async () => {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    });

    // Navigate to create new project
    await page.goto('http://localhost:6174/projects/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Fill in project name
    const projectNameInput = page.locator('input').first();
    await projectNameInput.fill('Empty Board Test');
    await page.waitForTimeout(300);

    // Take screenshot of project form
    await page.screenshot({ path: 'screenshots/issue-26/test-235-step1-project-form.png' });

    // Click Create Project button in main content (not sidebar)
    const createProjectBtn = page.locator('main button[type="submit"], main button:has-text("Create Project")');
    await createProjectBtn.click();
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle');

    // Get current URL
    const url = page.url();
    console.log('Current URL after create:', url);

    // Extract project key from URL or navigate to board
    const projectKeyMatch = url.match(/project\/([^/]+)/);
    const projectKey = projectKeyMatch?.[1] || 'EBT';

    // Navigate to board
    await page.goto(`http://localhost:6174/project/${projectKey}/board`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verify empty board message
    const emptyMessage = page.locator('text=Your board is empty');
    await expect(emptyMessage).toBeVisible({ timeout: 5000 });

    // Take screenshot of empty board
    await page.screenshot({ path: 'screenshots/issue-26/test-235-step2-empty-board.png' });

    // Click Create Issue button
    const createIssueBtn = page.locator('button:has-text("Create Issue")');
    await expect(createIssueBtn).toBeVisible();
    await createIssueBtn.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const dialogHeading = page.getByRole('heading', { name: 'Create Issue' });
    await expect(dialogHeading).toBeVisible({ timeout: 3000 });

    // Verify summary input is visible
    const summaryInput = page.locator('input#summary, input[placeholder*="summary"]');
    await expect(summaryInput).toBeVisible();

    // Take screenshot of modal
    await page.screenshot({ path: 'screenshots/issue-26/test-235-step3-modal-open.png' });

    console.log('TEST PASSED: Create Issue modal opens from empty board');
  });
});
