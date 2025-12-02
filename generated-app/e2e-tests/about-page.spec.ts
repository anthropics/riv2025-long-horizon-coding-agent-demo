import { test, expect } from '@playwright/test';

test.describe('About Us Page', () => {
  test('about page displays hero section with Canopy description', async ({ page }) => {
    await page.goto('http://localhost:6174/about');
    await page.waitForLoadState('networkidle');

    // Verify hero section
    await expect(page.locator('h1')).toContainText('Welcome to Canopy');
    await expect(page.locator('text=JIRA-like project management tool')).toBeVisible();

    // Verify tree icon is present (the large one in hero)
    await expect(page.locator('svg.lucide-tree-deciduous.w-16')).toBeVisible();
  });

  test('sidebar shows About Us link with Info icon', async ({ page }) => {
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');

    // Verify About Us link is present in sidebar
    const aboutLink = page.locator('a[href="/about"]');
    await expect(aboutLink).toBeVisible();
    await expect(aboutLink).toContainText('About Us');

    // Verify Info icon
    await expect(aboutLink.locator('svg.lucide-info')).toBeVisible();

    // Click and verify navigation
    await aboutLink.click();
    await expect(page).toHaveURL(/\/about/);
  });

  test('about page shows How to Make Requests section', async ({ page }) => {
    await page.goto('http://localhost:6174/about');
    await page.waitForLoadState('networkidle');

    // Scroll down to How to Make Requests section
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(300);

    // Verify How to Make Requests section
    await expect(page.locator('h2:has-text("How to Make Requests")')).toBeVisible();

    // Verify Bug Reports card
    await expect(page.locator('h3:has-text("Bug Reports")')).toBeVisible();

    // Verify Feature Requests card
    await expect(page.locator('h3:has-text("Feature Requests")')).toBeVisible();

    // Verify Pull Requests card
    await expect(page.locator('h3:has-text("Pull Requests")')).toBeVisible();
  });
});
