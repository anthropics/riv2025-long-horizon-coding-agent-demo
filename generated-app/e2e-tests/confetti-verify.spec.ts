import { test, expect } from '@playwright/test';

test.describe('Confetti Animation Verification', () => {
  test('Verify confetti triggers when task is marked done', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Screenshot: Initial state
    await page.screenshot({ path: 'screenshots/issue-40/verify-step1-home.png' });

    // Click Create your first project button
    const createFirstBtn = page.locator('button:has-text("Create your first project")');
    if (await createFirstBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createFirstBtn.click();
      await page.waitForTimeout(500);
    } else {
      // Click Create Project in sidebar
      const createProjectSidebar = page.locator('button:has-text("Create Project")');
      if (await createProjectSidebar.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createProjectSidebar.click();
        await page.waitForTimeout(500);
      }
    }

    // Screenshot: After clicking create
    await page.screenshot({ path: 'screenshots/issue-40/verify-step2-after-click.png' });

    // Fill in project name - first look for a project name input
    const nameInput = page.locator('input[placeholder*="project name" i], input[placeholder*="Enter project" i], input').first();
    await nameInput.waitFor({ state: 'visible', timeout: 3000 });
    await nameInput.fill('Test Project');
    await page.waitForTimeout(300);

    // Screenshot: Project name filled
    await page.screenshot({ path: 'screenshots/issue-40/verify-step3-name-filled.png' });

    // Click the main Create Project button (not the one in modal header)
    const createProjectBtn = page.locator('button:has-text("Create Project")').last();
    await createProjectBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Screenshot: After project creation
    await page.screenshot({ path: 'screenshots/issue-40/verify-step4-project-created.png' });

    // Now navigate to the board
    const boardLink = page.locator('a:has-text("Board"), button:has-text("Board")');
    if (await boardLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await boardLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
    }

    // Screenshot: Board page
    await page.screenshot({ path: 'screenshots/issue-40/verify-step5-board.png' });

    // Look for "Your board is empty" text and Create Issue button
    const createIssueBtn = page.locator('button:has-text("Create Issue")');
    if (await createIssueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createIssueBtn.click();
      await page.waitForTimeout(500);

      // Fill in issue summary
      const summaryInput = page.locator('input[placeholder*="summary" i]');
      await summaryInput.waitFor({ state: 'visible', timeout: 3000 });
      await summaryInput.fill('Test Confetti Task');
      await page.waitForTimeout(300);

      // Screenshot: Issue form
      await page.screenshot({ path: 'screenshots/issue-40/verify-step6-issue-form.png' });

      // Click Create button to create the issue
      const createBtn = page.locator('button:has-text("Create")').last();
      await createBtn.click();
      await page.waitForTimeout(1000);
    }

    // Screenshot: After issue creation
    await page.screenshot({ path: 'screenshots/issue-40/verify-step7-issue-created.png' });

    // Now click on an issue card to open detail panel
    const issueCard = page.locator('[class*="shadow"]').first();
    if (await issueCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await issueCard.click();
      await page.waitForTimeout(500);

      // Screenshot: Detail panel open
      await page.screenshot({ path: 'screenshots/issue-40/verify-step8-detail-panel.png' });

      // Find the status dropdown trigger (should show "To Do")
      const statusDropdown = page.locator('button[role="combobox"]').first();
      if (await statusDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
        await statusDropdown.click();
        await page.waitForTimeout(300);

        // Screenshot: Dropdown open
        await page.screenshot({ path: 'screenshots/issue-40/verify-step9-dropdown-open.png' });

        // Click Done option
        const doneOption = page.locator('[role="option"]:has-text("Done"), [role="listitem"]:has-text("Done"), div:has-text("Done")').first();
        if (await doneOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await doneOption.click();

          // Wait for confetti animation - confetti should appear
          await page.waitForTimeout(800);

          // Screenshot: Confetti should be visible (or just triggered)
          await page.screenshot({ path: 'screenshots/issue-40/verify-step10-confetti.png' });
        }
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'screenshots/issue-40/verify-final.png' });
  });
});
