import { test, expect } from '@playwright/test';

test('test-268 & test-269: Completion story modal appears when task is marked as Done', async ({ page }) => {
  // Step 1: Navigate to home
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');

  // Step 2: Create a project if needed
  const createProjectBtn = page.locator('button:has-text("Create your first project")');
  if (await createProjectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await createProjectBtn.click();
    await page.waitForLoadState('networkidle');

    // Fill project name
    await page.fill('input#name', 'Story Test Project');
    await page.waitForTimeout(500);

    // Click the Create Project button in main area
    await page.locator('main button[type="submit"]').click();
    await page.waitForTimeout(2000);
  }

  // Step 3: On board page - wait for it to fully load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Step 4: Create an issue
  const createIssueBtn = page.locator('button:has-text("Create Issue")');
  if (await createIssueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await createIssueBtn.click();
    await page.waitForTimeout(500);

    // Fill issue form
    await page.locator('input#summary').fill('Test Bug Fix for Story Modal');
    await page.waitForTimeout(300);

    // Submit using dialog button
    await page.locator('[role="dialog"] button[type="submit"]').click();
    await page.waitForTimeout(2000);
  }

  // Step 5: Wait for board to render with the issue
  await page.waitForTimeout(1000);

  // Find the issue card by its key pattern (TP-1 or similar)
  const issueCard = page.locator('.bg-card.rounded-lg.border').filter({ hasText: 'Test Bug Fix' }).first();

  // Wait for the card to be visible
  await issueCard.waitFor({ state: 'visible', timeout: 5000 });
  console.log('Issue card found');

  // Click on the issue card to open detail panel
  await issueCard.click();
  await page.waitForTimeout(500);

  // Step 6: Find status dropdown in detail panel (right side panel)
  const detailPanel = page.locator('.fixed.inset-y-0.right-0');
  await detailPanel.waitFor({ state: 'visible', timeout: 3000 });

  // Find the status dropdown (first combobox in detail panel showing "To Do")
  const statusDropdown = detailPanel.locator('button[role="combobox"]').first();
  await statusDropdown.waitFor({ state: 'visible', timeout: 3000 });
  await statusDropdown.click();
  await page.waitForTimeout(300);

  // Take screenshot of dropdown
  await page.screenshot({ path: 'screenshots/issue-41/test-268-dropdown-open.png', fullPage: true });

  // Click on "Done" option
  const doneOption = page.locator('[role="option"]:has-text("Done")');
  await doneOption.waitFor({ state: 'visible', timeout: 3000 });
  await doneOption.click();

  // Wait for confetti and modal to appear
  await page.waitForTimeout(1500);

  // Step 7: Verify the completion story modal appears
  const modal = page.locator('[data-testid="completion-story-modal"]');
  await modal.waitFor({ state: 'visible', timeout: 5000 });

  // Take screenshot with modal visible - this is the key screenshot for test-268
  await page.screenshot({ path: 'screenshots/issue-41/test-268-modal-visible.png', fullPage: true });

  // Verify modal elements
  expect(await modal.isVisible()).toBeTruthy();

  // Check for story text
  const storyText = page.locator('[data-testid="completion-story-text"]');
  expect(await storyText.isVisible()).toBeTruthy();

  const storyContent = await storyText.textContent();
  console.log('Story content:', storyContent);
  expect(storyContent).toBeTruthy();
  expect(storyContent!.length).toBeGreaterThan(20); // Should be a meaningful story
  expect(storyContent!.length).toBeLessThan(1000); // Should be concise

  // Check for Continue Conquering button
  const continueBtn = page.locator('button:has-text("Continue Conquering")');
  expect(await continueBtn.isVisible()).toBeTruthy();

  // Step 8: Click button to close modal (test-269 verifies closing works)
  await continueBtn.click();
  await page.waitForTimeout(500);

  // Verify modal is closed
  expect(await modal.isVisible()).toBeFalsy();

  // Take final screenshot
  await page.screenshot({ path: 'screenshots/issue-41/test-269-after-close.png', fullPage: true });
  console.log('Test completed successfully');
});
