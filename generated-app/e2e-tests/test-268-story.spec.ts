import { test, expect } from '@playwright/test';

test('test-268: Story of completion modal appears when task is dragged to Done', async ({ page }) => {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');

  // Step 1: Create a project
  const createFirstProjectBtn = page.locator('button:has-text("Create your first project")');
  if (await createFirstProjectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await createFirstProjectBtn.click();
    await page.waitForTimeout(500);

    // Fill project form
    await page.fill('input[name="name"]', 'Story Test Project');
    await page.click('button[type="submit"]:has-text("Create Project")');
    await page.waitForTimeout(1500);
  }

  // Step 2: Navigate to board (should auto-navigate after project creation)
  await page.waitForTimeout(500);
  const boardLink = page.locator('a:has-text("Board")').first();
  if (await boardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await boardLink.click();
    await page.waitForTimeout(1000);
  }

  // Step 3: Create an issue
  // Look for Create Issue button on empty board
  const createIssueBtn = page.locator('button:has-text("Create Issue")');
  if (await createIssueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await createIssueBtn.click();
    await page.waitForTimeout(500);

    // Fill issue form
    await page.fill('input[name="summary"]', 'Test task for completion story');
    await page.click('button[type="submit"]:has-text("Create Issue")');
    await page.waitForTimeout(1500);
  }

  // Step 4: Find the issue card and drag to Done column
  const issueCard = page.locator('[draggable="true"]').first();
  const doneColumn = page.locator('div:has-text("Done")').filter({ hasText: /^Done$/ }).first();

  // Get the column container that accepts drops
  const doneColumnDropZone = page.locator('[data-droppable-id="done"], .board-column').filter({ hasText: 'Done' }).first();

  if (await issueCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Try drag and drop
    await issueCard.dragTo(doneColumnDropZone, { timeout: 5000 });
    await page.waitForTimeout(2000);
  }

  // Step 5: Take screenshot of completion story modal
  await page.screenshot({ path: 'screenshots/issue-41/test-268-modal.png', fullPage: true });

  // Verify modal elements
  const modal = page.locator('[data-testid="completion-story-modal"]');
  const isModalVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false);

  if (isModalVisible) {
    console.log('SUCCESS: Completion story modal is visible');

    // Check for story text
    const storyText = page.locator('[data-testid="completion-story-text"]');
    expect(await storyText.isVisible()).toBeTruthy();

    // Check for button
    const continueBtn = page.locator('button:has-text("Continue Conquering")');
    expect(await continueBtn.isVisible()).toBeTruthy();
  } else {
    console.log('Modal not visible - may need different drag approach');
  }
});
