import { test, expect } from '@playwright/test';

test('Japanese sidebar navigation', async ({ page }) => {
  // Navigate to settings and set Japanese
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');
  await page.click('[data-testid="language-ja"]');
  await page.waitForTimeout(500);

  // Create a project if needed
  await page.goto('http://localhost:6174/projects/new');
  await page.waitForLoadState('networkidle');

  // Fill in project form
  const nameInput = page.locator('input[placeholder*="project"]').first();
  if (await nameInput.isVisible()) {
    await nameInput.fill('Test Project');
    await page.waitForTimeout(300);

    // Submit the form
    const createButton = page.locator('button:has-text("Create"), button:has-text("作成")').first();
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }
  }

  // Navigate to a project board
  await page.goto('http://localhost:6174/projects');
  await page.waitForLoadState('networkidle');

  // Click on first project if available
  const projectLink = page.locator('a[href*="/project/"]').first();
  if (await projectLink.isVisible()) {
    await projectLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  }

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-29/test-242-sidebar.png', fullPage: true });
});
