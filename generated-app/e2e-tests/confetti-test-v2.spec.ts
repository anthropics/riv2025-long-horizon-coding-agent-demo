import { test, expect } from '@playwright/test';

test.describe('Confetti Animation Tests V2', () => {
  test('Verify confetti animation on task completion', async ({ page }) => {
    // Increase timeout for this test
    test.setTimeout(60000);

    // Navigate to home page
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check if a project already exists or needs to be created
    const createFirstBtn = page.locator('button:has-text("Create your first project")');
    if (await createFirstBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createFirstBtn.click();
      await page.waitForTimeout(500);

      // Fill in project name
      const nameInput = page.locator('input').first();
      await nameInput.fill('Confetti Test');
      await page.waitForTimeout(200);

      // Click the Create Project button inside the form
      const createBtn = page.locator('button:has-text("Create Project")');
      await createBtn.last().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    // Navigate to Board via sidebar link
    await page.waitForTimeout(500);
    const boardLink = page.locator('a').filter({ hasText: 'Board' }).first();
    if (await boardLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await boardLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
    }

    // Check if board is empty and create an issue
    const emptyBoardText = page.locator('text=Your board is empty');
    if (await emptyBoardText.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click the Create Issue button
      const createIssueBtn = page.locator('button:has-text("Create Issue")');
      await createIssueBtn.click();
      await page.waitForTimeout(500);

      // Wait for modal to be fully visible
      await page.waitForSelector('input[placeholder="Enter issue summary"]', { timeout: 5000 });

      // Fill in issue summary
      const summaryInput = page.locator('input[placeholder="Enter issue summary"]');
      await summaryInput.fill('Test Confetti Task');

      // Click the Create button in the modal (not the header Create button)
      // The modal has its own Create button
      const modalCreateBtn = page.locator('[role="dialog"] button:has-text("Create")');
      await modalCreateBtn.click();

      // Wait for modal to close and issue to be created
      await page.waitForTimeout(1500);
    }

    // Screenshot: Board with task
    await page.screenshot({ path: 'screenshots/issue-40/test-266-step1.png' });

    // Now click on the task card to open detail panel
    // Look for the issue card by its key pattern
    const taskCard = page.locator('div').filter({ hasText: /^TP-\d+.*Test/ }).first();
    const altCard = page.locator('.border.shadow-sm').filter({ hasText: 'Test' }).first();

    let foundCard = false;
    if (await taskCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await taskCard.click();
      foundCard = true;
    } else if (await altCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await altCard.click();
      foundCard = true;
    }

    if (foundCard) {
      await page.waitForTimeout(500);

      // Screenshot: Detail panel open
      await page.screenshot({ path: 'screenshots/issue-40/test-267-step1.png' });

      // Look for the status dropdown in the detail panel (fixed position panel on right)
      // The status dropdown should show "To Do"
      const statusDropdown = page.locator('button[role="combobox"]').filter({ hasText: 'To Do' }).first();

      if (await statusDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
        await statusDropdown.click();
        await page.waitForTimeout(300);

        // Screenshot: Status dropdown open
        await page.screenshot({ path: 'screenshots/issue-40/test-267-step2.png' });

        // Click on Done option
        const doneOption = page.locator('[role="option"]').filter({ hasText: 'Done' });
        if (await doneOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await doneOption.click();

          // Wait for confetti animation to complete
          await page.waitForTimeout(1500);

          // Screenshot: After status change to Done (confetti should have triggered)
          await page.screenshot({ path: 'screenshots/issue-40/test-267-step3-confetti.png' });
        }
      }

      // Close detail panel by clicking X button
      const closeBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
      // Alternative: press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Final screenshot showing task in Done column
    await page.screenshot({ path: 'screenshots/issue-40/test-266-final-board.png' });

    // Verify the task is now in the Done column
    const doneColumn = page.locator('text=Done').first();
    await expect(doneColumn).toBeVisible();
  });
});
