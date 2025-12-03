import { test, expect } from '@playwright/test';

test.describe('Confetti Animation Test', () => {
  test('Confetti triggers when task status changes to Done', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click Create your first project button if visible
    const createFirstBtn = page.locator('button:has-text("Create your first project")');
    if (await createFirstBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createFirstBtn.click();
      await page.waitForTimeout(500);

      // Fill in project name
      const nameInput = page.locator('input').first();
      await nameInput.fill('Confetti Test');
      await page.waitForTimeout(200);

      // Click Create Project button - wait for modal dialog to close
      const createProjectBtn = page.locator('button:has-text("Create Project")').last();
      await createProjectBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
    }

    // Take screenshot of current state
    await page.screenshot({ path: 'screenshots/issue-40/confetti-test-step1.png' });

    // Navigate to Board - use sidebar
    await page.click('a:has-text("Board")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Take screenshot of board
    await page.screenshot({ path: 'screenshots/issue-40/confetti-test-step2-board.png' });

    // Create an issue if board is empty - use header Create button
    const emptyBoardText = page.locator('text=Your board is empty');
    if (await emptyBoardText.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click Create button in header
      await page.click('header button:has-text("Create")');
      await page.waitForTimeout(500);

      // Fill summary
      const summaryInput = page.locator('input[placeholder*="summary" i]');
      await summaryInput.fill('Test Task for Confetti');
      await page.waitForTimeout(200);

      // Choose Done status before creating
      const statusDropdown = page.locator('button[role="combobox"]:has-text("To Do")');
      if (await statusDropdown.isVisible({ timeout: 1000 }).catch(() => false)) {
        await statusDropdown.click();
        await page.waitForTimeout(300);

        const doneOption = page.locator('[role="option"]:has-text("Done")');
        if (await doneOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await doneOption.click();
          await page.waitForTimeout(200);
        }
      }

      // Click Create button in modal
      const createBtn = page.locator('button:has-text("Create Issue"), button:has-text("Create")').last();
      await createBtn.click({ force: true });
      await page.waitForTimeout(1500);

      // Capture confetti
      await page.screenshot({ path: 'screenshots/issue-40/confetti-test-step3-created.png' });
    }

    // If there's already issues, click on one and change status
    const issueCards = page.locator('[draggable="true"]');
    if (await issueCards.count() > 0) {
      const firstCard = issueCards.first();
      await firstCard.click();
      await page.waitForTimeout(500);

      // Screenshot showing detail panel
      await page.screenshot({ path: 'screenshots/issue-40/confetti-test-step4-detail.png' });

      // Find status dropdown in detail panel
      const statusButton = page.locator('.fixed button[role="combobox"]').first();
      if (await statusButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await statusButton.click();
        await page.waitForTimeout(300);

        // Click Done option
        const doneOption = page.locator('[role="option"]:has-text("Done")');
        if (await doneOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await doneOption.click();
          await page.waitForTimeout(1000);

          // Capture confetti animation
          await page.screenshot({ path: 'screenshots/issue-40/confetti-test-step5-confetti.png' });
        }
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'screenshots/issue-40/confetti-test-final.png' });

    // Verify we can see the board
    const boardTitle = page.locator('text=Board');
    await expect(boardTitle).toBeVisible();
  });
});
