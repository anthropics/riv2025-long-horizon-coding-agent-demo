import { test, expect } from '@playwright/test';

test.describe('Issue #22 - Create issue after navigating from All Projects', () => {
  test('should be able to create issue after clicking project from All Projects', async ({ page }) => {
    test.setTimeout(90000);

    // Navigate to the app
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');

    // First, create a project if none exists
    // Click "Create your first project" button or go to create project page
    const createFirstProjectBtn = page.getByRole('button', { name: /create your first project/i });
    if (await createFirstProjectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createFirstProjectBtn.click();
      await page.waitForURL('**/projects/new');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Fill in project details
      await page.fill('input[id="name"]', 'Test Project');
      await page.waitForTimeout(500); // Wait for auto-key generation

      // Click create project button and wait for navigation to board
      await page.click('button:has-text("Create Project")');
      await page.waitForURL('**/board');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
    }

    // Take a screenshot of where we are now
    await page.screenshot({ path: 'screenshots/issue-22/after-project-creation.png' });

    // Now navigate to All Projects by clicking it in sidebar
    await page.click('text=All Projects');
    await page.waitForURL('**/projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Take screenshot of All Projects page
    await page.screenshot({ path: 'screenshots/issue-22/all-projects-list.png' });

    // Check if we see the Projects page
    const projectsHeading = page.getByRole('heading', { name: 'Projects' });
    await expect(projectsHeading).toBeVisible({ timeout: 5000 });

    // Click on the first project card
    const projectCard = page.locator('[class*="hover-lift"]').first();
    await expect(projectCard).toBeVisible({ timeout: 5000 });
    await projectCard.click();
    await page.waitForURL('**/board');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Take screenshot of project board
    await page.screenshot({ path: 'screenshots/issue-22/project-board-after-click.png' });

    // Now try clicking the Create button in header
    const createBtn = page.locator('header button:has-text("Create")');
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    // Wait for modal to appear
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/issue-22/create-modal-after-click.png' });

    // Check if the Create Issue modal appeared
    const modalTitle = page.getByRole('heading', { name: /Create Issue/i });
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // Fill in the issue summary
    await page.fill('input[id="summary"]', 'Test Issue from All Projects flow');
    await page.waitForTimeout(300);

    // Take screenshot before submitting
    await page.screenshot({ path: 'screenshots/issue-22/before-submit.png' });

    // Click the Create button in the modal
    await page.click('button[type="submit"]:has-text("Create")');

    // Wait for issue to be created
    await page.waitForTimeout(1000);

    // Take final screenshot
    await page.screenshot({ path: 'screenshots/issue-22/after-submit.png' });

    // Check if we're still on board and modal closed
    const board = page.locator('text=To Do');
    await expect(board).toBeVisible({ timeout: 5000 });
  });
});
