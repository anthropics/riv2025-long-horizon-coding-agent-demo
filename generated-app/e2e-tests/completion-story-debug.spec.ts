import { test, expect } from '@playwright/test';

test('Debug: Step by step completion story test', async ({ page }) => {
  // Step 1: Navigate to home
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/issue-41/debug-01-home.png' });

  // Step 2: Create a project
  const createProjectBtn = page.locator('button:has-text("Create your first project")');
  if (await createProjectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await createProjectBtn.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/issue-41/debug-02-new-project.png' });

    // Fill project name
    await page.fill('input#name', 'Test Project');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/issue-41/debug-03-filled-name.png' });

    // Click the Create Project button in main area
    const mainCreateBtn = page.locator('main button[type="submit"]');
    console.log('Main button count:', await mainCreateBtn.count());
    await mainCreateBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/issue-41/debug-04-after-create.png' });
  }

  // Check current URL
  console.log('Current URL:', page.url());

  // Step 3: On board page
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/issue-41/debug-05-board.png' });

  // Step 4: Create an issue
  const createIssueBtn = page.locator('button:has-text("Create Issue")');
  if (await createIssueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Create Issue button visible');
    await createIssueBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/issue-41/debug-06-modal-open.png' });

    // Fill issue form
    const summaryInput = page.locator('input#summary');
    if (await summaryInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await summaryInput.fill('Test Bug Fix');
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'screenshots/issue-41/debug-07-filled-issue.png' });

      // Submit - use exact button in dialog
      const dialog = page.locator('[role="dialog"]');
      const createBtn = dialog.locator('button[type="submit"]');
      console.log('Create button in dialog count:', await createBtn.count());
      await createBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/issue-41/debug-08-after-issue-create.png' });
    }
  } else {
    console.log('Create Issue button NOT visible');
  }

  // Check for issue card
  const cards = page.locator('[draggable="true"]');
  const cardCount = await cards.count();
  console.log('Draggable cards found:', cardCount);

  if (cardCount > 0) {
    // Click on first issue card
    await cards.first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/issue-41/debug-09-detail-panel.png' });

    // Find status dropdown in detail panel
    const panel = page.locator('.fixed.inset-y-0.right-0');
    const statusDropdown = panel.locator('button[role="combobox"]').first();

    if (await statusDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusDropdown.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'screenshots/issue-41/debug-10-dropdown-open.png' });

      // Select Done
      const doneOption = page.locator('[role="option"]:has-text("Done")');
      if (await doneOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await doneOption.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: 'screenshots/issue-41/debug-11-after-done.png' });

        // Check for modal
        const modal = page.locator('[data-testid="completion-story-modal"]');
        const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
        console.log('Modal visible:', modalVisible);

        if (modalVisible) {
          await page.screenshot({ path: 'screenshots/issue-41/debug-12-modal-visible.png' });

          // Verify story text
          const storyText = page.locator('[data-testid="completion-story-text"]');
          const storyContent = await storyText.textContent();
          console.log('Story content:', storyContent);

          // Click continue
          await page.locator('button:has-text("Continue Conquering")').click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'screenshots/issue-41/debug-13-after-close.png' });
        }
      }
    }
  }
});
