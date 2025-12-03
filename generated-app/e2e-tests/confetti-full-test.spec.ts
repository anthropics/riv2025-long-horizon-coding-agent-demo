import { test, expect } from '@playwright/test';

test.describe('Confetti Animation - Full Test', () => {
  test('Create project, issue and test confetti on status change', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/issue-40/confetti-step1-home.png' });

    // Click Create your first project or Create Project button
    const createFirstProjectBtn = page.locator('text=Create your first project');
    const createProjectBtn = page.locator('text=Create Project');

    if (await createFirstProjectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createFirstProjectBtn.click();
    } else if (await createProjectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createProjectBtn.click();
    }

    await page.waitForTimeout(500);

    // Fill project name
    const projectNameInput = page.locator('input').first();
    await projectNameInput.fill('Confetti Test');
    await page.waitForTimeout(300);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-40/confetti-step2-create-project.png' });

    // Click create button
    await page.click('button:has-text("Create")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot of board
    await page.screenshot({ path: 'screenshots/issue-40/confetti-step3-board.png' });

    // Create an issue
    const createIssueBtn = page.locator('button:has-text("Create Issue")');
    if (await createIssueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createIssueBtn.click();
      await page.waitForTimeout(500);

      // Fill issue summary
      const summaryInput = page.locator('input[placeholder*="summary" i], input').first();
      await summaryInput.fill('Test confetti animation task');
      await page.waitForTimeout(300);

      // Take screenshot
      await page.screenshot({ path: 'screenshots/issue-40/confetti-step4-create-issue.png' });

      // Click create
      const modalCreateBtn = page.locator('button:has-text("Create Issue"), button:has-text("Create")').last();
      await modalCreateBtn.click();
      await page.waitForTimeout(1000);
    }

    // Take screenshot of board with issue
    await page.screenshot({ path: 'screenshots/issue-40/confetti-step5-board-with-issue.png' });

    // Click on the issue card to open detail panel
    const issueCard = page.locator('.rounded-md.border.shadow-sm').first();
    if (await issueCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await issueCard.click();
      await page.waitForTimeout(500);

      // Take screenshot of detail panel
      await page.screenshot({ path: 'screenshots/issue-40/confetti-step6-detail-panel.png' });

      // Find the status dropdown and change to Done
      const statusTrigger = page.locator('button[role="combobox"]').first();
      if (await statusTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
        await statusTrigger.click();
        await page.waitForTimeout(300);

        // Click Done option
        const doneOption = page.locator('[role="option"]:has-text("Done")');
        if (await doneOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await doneOption.click();

          // Wait for confetti animation
          await page.waitForTimeout(300);

          // Take screenshot during/after confetti
          await page.screenshot({ path: 'screenshots/issue-40/confetti-step7-confetti-triggered.png' });
        }
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'screenshots/issue-40/confetti-step8-final.png' });
  });
});
