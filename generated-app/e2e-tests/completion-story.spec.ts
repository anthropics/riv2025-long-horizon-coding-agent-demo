import { test, expect } from '@playwright/test';

test.describe('Completion Story Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing data and start fresh
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');
  });

  test('test-268: Story of completion modal appears when task is dragged to Done column', async ({ page }) => {
    // Create a project if none exists
    const createProjectButton = page.locator('button:has-text("Create your first project"), button:has-text("Create Project")');
    if (await createProjectButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createProjectButton.click();
      await page.fill('input[name="name"], input[placeholder*="name"]', 'Test Project');
      await page.click('button:has-text("Create")');
      await page.waitForTimeout(1000);
    }

    // Navigate to board
    const boardLink = page.locator('a[href*="/board"], button:has-text("Board")').first();
    if (await boardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await boardLink.click();
      await page.waitForTimeout(500);
    }

    // Create an issue if board is empty
    const createIssueButton = page.locator('button:has-text("Create Issue")');
    if (await createIssueButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createIssueButton.click();
      await page.waitForTimeout(500);

      // Fill issue form
      const summaryInput = page.locator('input[name="summary"], input[placeholder*="summary"], input[placeholder*="Summary"]');
      if (await summaryInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await summaryInput.fill('Fix login bug');
      }

      // Submit the form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create")').last();
      await submitButton.click();
      await page.waitForTimeout(1000);
    }

    // Find an issue card and drag to Done column
    const issueCard = page.locator('[data-testid="issue-card"], .issue-card, [draggable="true"]').first();
    const doneColumn = page.locator('[data-testid="column-done"], .board-column:has-text("Done"), div:has-text("Done")').first();

    if (await issueCard.isVisible({ timeout: 2000 }).catch(() => false) && await doneColumn.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Perform drag and drop
      await issueCard.dragTo(doneColumn);
      await page.waitForTimeout(1500);
    }

    // Take screenshot to capture completion story modal
    await page.screenshot({ path: 'screenshots/issue-41/test-268-completion-story.png', fullPage: true });

    // Verify the modal appears
    const modal = page.locator('[data-testid="completion-story-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify story text is present
    const storyText = page.locator('[data-testid="completion-story-text"]');
    await expect(storyText).toBeVisible();

    // Verify Continue Conquering button
    const continueButton = page.locator('button:has-text("Continue Conquering")');
    await expect(continueButton).toBeVisible();
  });

  test('test-269: Story of completion modal appears when status changed via dropdown', async ({ page }) => {
    // Navigate to board page
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');

    // Create a project if none exists
    const createProjectButton = page.locator('button:has-text("Create your first project"), button:has-text("Create Project")');
    if (await createProjectButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createProjectButton.click();
      await page.fill('input[name="name"], input[placeholder*="name"]', 'Test Project 2');
      await page.click('button:has-text("Create")');
      await page.waitForTimeout(1000);
    }

    // Navigate to board
    const boardLink = page.locator('a[href*="/board"], button:has-text("Board")').first();
    if (await boardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await boardLink.click();
      await page.waitForTimeout(500);
    }

    // Create an issue if board is empty
    const createIssueButton = page.locator('button:has-text("Create Issue")');
    if (await createIssueButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createIssueButton.click();
      await page.waitForTimeout(500);

      const summaryInput = page.locator('input[name="summary"], input[placeholder*="summary"], input[placeholder*="Summary"]');
      if (await summaryInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await summaryInput.fill('Implement user auth');
      }

      const submitButton = page.locator('button[type="submit"], button:has-text("Create")').last();
      await submitButton.click();
      await page.waitForTimeout(1000);
    }

    // Click on issue to open detail panel
    const issueCard = page.locator('[data-testid="issue-card"], .issue-card').first();
    if (await issueCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await issueCard.click();
      await page.waitForTimeout(500);
    }

    // Change status dropdown to Done
    const statusDropdown = page.locator('button:has-text("To Do"), select').first();
    if (await statusDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusDropdown.click();
      await page.waitForTimeout(300);

      const doneOption = page.locator('[role="option"]:has-text("Done"), option:has-text("Done")');
      if (await doneOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await doneOption.click();
        await page.waitForTimeout(1500);
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-41/test-269-completion-dropdown.png', fullPage: true });

    // Verify modal appears
    const modal = page.locator('[data-testid="completion-story-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify story text
    const storyText = page.locator('[data-testid="completion-story-text"]');
    await expect(storyText).toBeVisible();

    // Verify button
    const continueButton = page.locator('button:has-text("Continue Conquering")');
    await expect(continueButton).toBeVisible();

    // Click button to close
    await continueButton.click();
    await page.waitForTimeout(500);

    // Verify modal is closed
    await expect(modal).not.toBeVisible();
  });
});
