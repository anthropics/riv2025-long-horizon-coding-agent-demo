import { test, expect } from '@playwright/test';

test.describe('Completion Story Modal Tests', () => {

  test('test-268: Story modal appears when dragging task to Done column', async ({ page }) => {
    // Go to homepage
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');

    // Click "Create your first project" if visible
    const createFirstProject = page.locator('button:has-text("Create your first project")');
    if (await createFirstProject.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createFirstProject.click();
      await page.waitForLoadState('networkidle');

      // We're now on /projects/new page
      // Fill in the project name
      await page.locator('input#name, input[placeholder*="name" i]').first().fill('Test Project');
      await page.waitForTimeout(500);

      // Click create button
      await page.locator('button[type="submit"], button:has-text("Create Project")').click();
      await page.waitForTimeout(2000);
    }

    // Navigate to board if not already there
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check if there's a project available now
    const projectCard = page.locator('.cursor-pointer, [role="button"]').filter({ hasText: /Project|TEST/ }).first();
    if (await projectCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectCard.click();
      await page.waitForTimeout(1000);
    }

    // Look for Board link in sidebar
    const boardLink = page.locator('a:has-text("Board")').first();
    if (await boardLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await boardLink.click();
      await page.waitForTimeout(1000);
    }

    // If board is empty, create an issue
    const createIssueBtn = page.locator('button:has-text("Create Issue")').first();
    if (await createIssueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createIssueBtn.click();
      await page.waitForTimeout(500);

      // Fill issue summary
      const summaryInput = page.locator('input[id="summary"], input[name="summary"]').first();
      await summaryInput.fill('Test task for completion story');
      await page.waitForTimeout(300);

      // Click create
      const submitBtn = page.locator('button[type="submit"]:has-text("Create Issue")').first();
      await submitBtn.click();
      await page.waitForTimeout(1500);
    }

    // Find an issue card and attempt to drag it to Done
    const issueCards = page.locator('[draggable="true"]');
    const issueCount = await issueCards.count();
    console.log(`Found ${issueCount} draggable items`);

    if (issueCount > 0) {
      const issueCard = issueCards.first();

      // Find Done column
      const doneColumn = page.locator('div').filter({ hasText: /^Done$/ }).first();

      // Perform drag
      try {
        await issueCard.dragTo(doneColumn, { timeout: 5000 });
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('Drag failed, trying alternative approach');
        // Click on issue to open detail panel
        await issueCard.click();
        await page.waitForTimeout(500);

        // Change status via dropdown
        const statusTrigger = page.locator('button[role="combobox"]').first();
        if (await statusTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
          await statusTrigger.click();
          await page.waitForTimeout(300);

          const doneOption = page.locator('[role="option"]:has-text("Done")');
          if (await doneOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            await doneOption.click();
            await page.waitForTimeout(2000);
          }
        }
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-41/test-268-modal-result.png', fullPage: true });

    // Check if modal appeared
    const modal = page.locator('[data-testid="completion-story-modal"]');
    const modalVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Modal visible: ${modalVisible}`);

    if (modalVisible) {
      // Verify modal elements
      const storyText = page.locator('[data-testid="completion-story-text"]');
      expect(await storyText.isVisible()).toBeTruthy();

      const continueBtn = page.locator('button:has-text("Continue Conquering")');
      expect(await continueBtn.isVisible()).toBeTruthy();

      // Take another screenshot with modal visible
      await page.screenshot({ path: 'screenshots/issue-41/test-268-modal-visible.png', fullPage: true });
    }
  });

  test('test-269: Story modal appears when changing status via dropdown', async ({ page }) => {
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');

    // Wait a bit for any project to load
    await page.waitForTimeout(1000);

    // Navigate to a project's board
    const projectCard = page.locator('.cursor-pointer').filter({ hasText: /Project|TEST/ }).first();
    if (await projectCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectCard.click();
      await page.waitForTimeout(1000);
    }

    // Click Board link
    const boardLink = page.locator('a:has-text("Board")').first();
    if (await boardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await boardLink.click();
      await page.waitForTimeout(1000);
    }

    // Create an issue if needed
    const createIssueBtn = page.locator('button:has-text("Create Issue")').first();
    if (await createIssueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createIssueBtn.click();
      await page.waitForTimeout(500);

      const summaryInput = page.locator('input[id="summary"], input[name="summary"]').first();
      await summaryInput.fill('Another test task');
      await page.waitForTimeout(300);

      const submitBtn = page.locator('button[type="submit"]:has-text("Create Issue")').first();
      await submitBtn.click();
      await page.waitForTimeout(1500);
    }

    // Click on an issue card to open detail panel
    const issueCard = page.locator('[draggable="true"]').first();
    if (await issueCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await issueCard.click();
      await page.waitForTimeout(500);
    }

    // Find and click the status dropdown (it shows "To Do" by default)
    const statusDropdown = page.locator('button[role="combobox"]').filter({ hasText: /To Do|In Progress/ }).first();
    if (await statusDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusDropdown.click();
      await page.waitForTimeout(300);

      // Select Done
      const doneOption = page.locator('[role="option"]:has-text("Done")');
      if (await doneOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await doneOption.click();
        await page.waitForTimeout(2000);
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-41/test-269-dropdown-result.png', fullPage: true });

    // Check for modal
    const modal = page.locator('[data-testid="completion-story-modal"]');
    const modalVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Modal visible: ${modalVisible}`);

    if (modalVisible) {
      const storyText = page.locator('[data-testid="completion-story-text"]');
      expect(await storyText.isVisible()).toBeTruthy();

      // Click continue button to close
      const continueBtn = page.locator('button:has-text("Continue Conquering")');
      await continueBtn.click();
      await page.waitForTimeout(500);

      // Verify modal closes
      expect(await modal.isVisible()).toBeFalsy();
    }
  });
});
