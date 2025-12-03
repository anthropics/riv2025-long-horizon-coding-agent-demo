import { test, expect } from '@playwright/test';

test('Completion story modal appears when task status is changed to Done', async ({ page }) => {
  // Step 1: Navigate to home
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');

  // Step 2: Create a project
  await page.click('button:has-text("Create your first project")');
  await page.waitForLoadState('networkidle');

  // Fill project name (we're on /projects/new)
  await page.fill('input#name', 'Completion Test Project');
  await page.waitForTimeout(500);

  // Click the Create Project button in main area (not sidebar)
  await page.locator('main button[type="submit"]:has-text("Create Project")').click();
  await page.waitForTimeout(2000);

  // Step 3: We should now be on the board page
  await page.waitForLoadState('networkidle');

  // Step 4: Create an issue (we're likely on empty board)
  const createIssueBtn = page.locator('button:has-text("Create Issue")');
  await createIssueBtn.waitFor({ state: 'visible', timeout: 5000 });
  await createIssueBtn.click();
  await page.waitForTimeout(500);

  // Fill issue form
  await page.fill('input#summary', 'Test Bug Fix');
  await page.waitForTimeout(300);

  // Submit - button text is "Create" (not "Create Issue")
  await page.locator('button[type="submit"]:has-text("Create"):not(:has-text("Issue"))').click();
  await page.waitForTimeout(2000);

  // Step 5: Click on the issue card to open detail panel
  const issueCard = page.locator('[draggable="true"]').first();
  await issueCard.waitFor({ state: 'visible', timeout: 5000 });
  await issueCard.click();
  await page.waitForTimeout(500);

  // Step 6: Change status to Done via dropdown
  // The status dropdown should be visible in the detail panel
  const statusDropdown = page.locator('button[role="combobox"]').first();
  await statusDropdown.waitFor({ state: 'visible', timeout: 3000 });
  await statusDropdown.click();
  await page.waitForTimeout(300);

  // Click on "Done" option
  const doneOption = page.locator('[role="option"]:has-text("Done")');
  await doneOption.waitFor({ state: 'visible', timeout: 3000 });
  await doneOption.click();

  // Wait for confetti and modal
  await page.waitForTimeout(1500);

  // Step 7: Verify the completion story modal
  const modal = page.locator('[data-testid="completion-story-modal"]');
  await modal.waitFor({ state: 'visible', timeout: 5000 });

  // Take screenshot with modal visible
  await page.screenshot({ path: 'screenshots/issue-41/test-268-completion-modal.png', fullPage: true });

  // Verify modal elements
  expect(await modal.isVisible()).toBeTruthy();

  const storyText = page.locator('[data-testid="completion-story-text"]');
  expect(await storyText.isVisible()).toBeTruthy();

  const storyContent = await storyText.textContent();
  console.log('Story content:', storyContent);
  expect(storyContent).toBeTruthy();
  expect(storyContent!.length).toBeGreaterThan(20); // Should be a meaningful story
  expect(storyContent!.length).toBeLessThan(1000); // Should be under 200 words

  const continueBtn = page.locator('button:has-text("Continue Conquering")');
  expect(await continueBtn.isVisible()).toBeTruthy();

  // Step 8: Click button to close modal
  await continueBtn.click();
  await page.waitForTimeout(500);

  // Verify modal is closed
  expect(await modal.isVisible()).toBeFalsy();

  // Take final screenshot
  await page.screenshot({ path: 'screenshots/issue-41/test-269-after-close.png', fullPage: true });
});
