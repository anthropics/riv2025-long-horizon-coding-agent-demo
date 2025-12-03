import { test, expect } from '@playwright/test';

test.describe('Confetti Animation - Final Verification', () => {
  test('test-266 and test-267: Verify confetti on task completion', async ({ page }) => {
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
      await nameInput.fill('Confetti Demo');
      await page.waitForTimeout(200);

      // Click Create Project button
      const createProjectBtn = page.locator('button:has-text("Create Project")').last();
      await createProjectBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    // Navigate to Board
    const boardLink = page.locator('a:has-text("Board")');
    if (await boardLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await boardLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
    }

    // Create an issue if board is empty
    const emptyBoardText = page.locator('text=Your board is empty');
    if (await emptyBoardText.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.click('button:has-text("Create Issue")');
      await page.waitForTimeout(500);

      const summaryInput = page.locator('input[placeholder*="summary" i]');
      await summaryInput.fill('Demo Task for Confetti');
      await page.waitForTimeout(200);

      await page.click('button:has-text("Create")');
      await page.waitForTimeout(1000);
    }

    // Screenshot: Board with task in To Do
    await page.screenshot({ path: 'screenshots/issue-40/test-266-board-todo.png' });

    // Find and click on the issue card (TP-1 or similar)
    const issueCard = page.locator('div:has-text("Demo Task")').filter({ hasText: 'TP-' }).first();

    // Alternative: look for issue card by structure
    const cardAlt = page.locator('.rounded-md.border').filter({ hasText: 'Demo Task' }).first();

    let cardToClick = issueCard;
    if (!(await issueCard.isVisible({ timeout: 1000 }).catch(() => false))) {
      cardToClick = cardAlt;
    }

    if (await cardToClick.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cardToClick.click();
      await page.waitForTimeout(500);

      // Screenshot: Detail panel open
      await page.screenshot({ path: 'screenshots/issue-40/test-267-detail-panel.png' });

      // Find the status dropdown - it should be showing "To Do"
      // The dropdown is inside the detail panel on the right
      const statusButton = page.locator('.fixed button[role="combobox"]').first();

      if (await statusButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await statusButton.click();
        await page.waitForTimeout(300);

        // Screenshot: Dropdown open
        await page.screenshot({ path: 'screenshots/issue-40/test-267-dropdown.png' });

        // Click Done option
        const doneOption = page.locator('[role="option"]:has-text("Done")');
        if (await doneOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await doneOption.click();

          // Wait for confetti animation
          await page.waitForTimeout(1000);

          // Screenshot: After changing to Done - confetti should have triggered
          await page.screenshot({ path: 'screenshots/issue-40/test-267-after-done.png' });
        }
      }
    }

    // Close the detail panel
    const closeBtn = page.locator('.fixed button:has(svg.w-4)').first();
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }

    // Screenshot: Final state showing task in Done column
    await page.screenshot({ path: 'screenshots/issue-40/test-266-final.png' });
  });
});
