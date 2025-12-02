import { test, expect } from '@playwright/test';

test.describe('Issue #22 Debug', () => {
  test('debug create issue flow', async ({ page }) => {
    test.setTimeout(120000);

    // Listen to console logs
    page.on('console', msg => {
      console.log('BROWSER CONSOLE:', msg.type(), msg.text());
    });

    // Navigate to the app
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/issue-22/debug-01-initial.png' });

    // Click "Create Project" button in sidebar (look for button with "Create Project" text)
    const sidebarCreateBtn = page.locator('aside button:has-text("Create Project")');
    await sidebarCreateBtn.waitFor({ state: 'visible', timeout: 5000 });
    await sidebarCreateBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-22/debug-02-new-project-page.png' });

    // Fill in project name using proper locator
    const nameInput = page.locator('input#name');
    await nameInput.fill('Debug Project');
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-22/debug-03-filled-form.png' });

    // Click create project - find the button that's type=submit or in a form
    const createProjectBtn = page.locator('button:has-text("Create Project")').last();
    await createProjectBtn.waitFor({ state: 'visible' });
    console.log('Create Project button found');
    await createProjectBtn.click();

    // Wait for navigation
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-22/debug-04-after-create.png' });

    // Check current URL
    console.log('Current URL after creating project:', page.url());

    // Check if a project was created by going to All Projects
    await page.click('text=All Projects');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-22/debug-05-all-projects.png' });

    // Check if project card exists
    const projectCards = page.locator('[class*="hover-lift"]');
    const count = await projectCards.count();
    console.log('Number of project cards found:', count);

    if (count > 0) {
      // Click on first project card
      await projectCards.first().click();
      await page.waitForTimeout(1000);

      // Take screenshot
      await page.screenshot({ path: 'screenshots/issue-22/debug-06-project-board.png' });
      console.log('Current URL after clicking project:', page.url());

      // Now click Create in header
      const createBtn = page.locator('header button:has-text("Create")');
      console.log('Create button visible:', await createBtn.isVisible());
      await createBtn.click();
      await page.waitForTimeout(500);

      // Take screenshot
      await page.screenshot({ path: 'screenshots/issue-22/debug-07-create-modal.png' });

      // Check if modal is open
      const modalTitle = page.getByRole('heading', { name: /Create Issue/i });
      const isModalVisible = await modalTitle.isVisible();
      console.log('Create Issue modal visible:', isModalVisible);

      if (isModalVisible) {
        // Fill in summary
        await page.fill('input[id="summary"]', 'Test Bug Issue');
        await page.waitForTimeout(300);

        // Take screenshot
        await page.screenshot({ path: 'screenshots/issue-22/debug-08-filled-summary.png' });

        // Check if Create button is disabled
        const submitBtn = page.locator('button[type="submit"]:has-text("Create")');
        const isDisabled = await submitBtn.isDisabled();
        console.log('Submit button disabled:', isDisabled);

        // Click the Create button
        await submitBtn.click();
        await page.waitForTimeout(1000);

        // Take screenshot
        await page.screenshot({ path: 'screenshots/issue-22/debug-09-after-submit.png' });

        // Check if toast appeared
        const toastSuccess = page.locator('text=Issue created successfully');
        const toastError = page.locator('text=Please fill in required fields');

        console.log('Success toast visible:', await toastSuccess.isVisible().catch(() => false));
        console.log('Error toast visible:', await toastError.isVisible().catch(() => false));
      }
    } else {
      console.log('NO PROJECTS FOUND - BUG: Project creation failed');
    }
  });
});
