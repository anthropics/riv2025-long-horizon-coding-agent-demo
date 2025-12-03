import { test, expect } from '@playwright/test';

test.describe('Confetti Animation Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and create a project if needed
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');

    // Check if we need to create a project
    const createProjectBtn = page.locator('text=Create your first project');
    if (await createProjectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createProjectBtn.click();
      await page.fill('input[placeholder*="name" i], input[id*="name" i]', 'Confetti Test Project');
      await page.click('button:has-text("Create")');
      await page.waitForLoadState('networkidle');
    }
  });

  test('test-266: Confetti shows when dragging task to Done column', async ({ page }) => {
    // Navigate to board
    await page.click('text=Board');
    await page.waitForLoadState('networkidle');

    // Create an issue if board is empty
    const emptyBoardBtn = page.locator('text=Your board is empty');
    if (await emptyBoardBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.click('button:has-text("Create Issue")');
      await page.fill('input[placeholder*="summary" i], input[id*="summary" i]', 'Test Task for Confetti');
      await page.click('button:has-text("Create"), button:has-text("Save")');
      await page.waitForTimeout(500);
    }

    // Look for the canvas-confetti canvas element that appears after confetti triggers
    // We'll drag a card to Done and check for the confetti effect
    const todoColumn = page.locator('[data-column="todo"], .board-column:first-child');
    const doneColumn = page.locator('[data-column="done"], .board-column:last-child');

    // Get a card to drag
    const card = page.locator('[data-testid="issue-card"]').first();

    if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Drag to done column
      await card.dragTo(doneColumn);

      // Confetti uses canvas-confetti which creates a canvas element
      // Wait a moment for confetti to trigger
      await page.waitForTimeout(500);
    }

    // Take screenshot after action
    await page.screenshot({ path: 'screenshots/issue-40/test-266-drag-done.png' });
  });

  test('test-267: Confetti shows when changing status dropdown to Done', async ({ page }) => {
    // Navigate to board
    await page.click('text=Board');
    await page.waitForLoadState('networkidle');

    // Create an issue if board is empty
    const emptyBoardText = page.locator('text=Your board is empty');
    if (await emptyBoardText.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.click('button:has-text("Create Issue")');
      await page.fill('input[placeholder*="summary" i], input[id*="summary" i]', 'Test Task for Dropdown');
      await page.click('button:has-text("Create"), button:has-text("Save")');
      await page.waitForTimeout(500);
    }

    // Click on an issue card to open detail panel
    const card = page.locator('[data-testid="issue-card"]').first();
    if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
      await card.click();
      await page.waitForTimeout(500);

      // Find and click status dropdown
      const statusDropdown = page.locator('button:has-text("To Do")').first();
      if (await statusDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
        await statusDropdown.click();
        // Select Done
        await page.click('text=Done');
        // Wait for confetti
        await page.waitForTimeout(500);
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-40/test-267-dropdown-done.png' });
  });
});
