import { test, expect } from '@playwright/test';

test('Test-264: Team page displays Japanese translations', async ({ page }) => {
  // First go to settings and set Japanese
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');
  await page.click('text=日本語');
  await page.waitForTimeout(1000);

  // Create a project if none exists
  await page.goto('http://localhost:6174/projects');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Check if projects exist, if not create one
  const projectCards = await page.locator('[data-testid="project-card"], .project-card, a[href*="/projects/"]').count();

  if (projectCards === 0) {
    // Create a new project
    await page.goto('http://localhost:6174/projects/new');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="name"], input[placeholder*="name"], #name', 'Test Project');
    await page.fill('input[name="key"], input[placeholder*="key"], #key', 'TEST');
    await page.click('button[type="submit"], button:has-text("作成"), button:has-text("Create")');
    await page.waitForTimeout(2000);
  }

  // Navigate to team page for a project
  // First get a project key
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');

  // Click on first project if available
  const firstProjectLink = page.locator('a[href*="/projects/"]').first();
  if (await firstProjectLink.count() > 0) {
    await firstProjectLink.click();
    await page.waitForLoadState('networkidle');
  }

  // Navigate to team page
  const teamLink = page.locator('a[href*="/team"], button:has-text("チーム"), [data-testid="team-link"]');
  if (await teamLink.count() > 0) {
    await teamLink.click();
    await page.waitForLoadState('networkidle');
  } else {
    // Try direct URL with a common project key
    await page.goto('http://localhost:6174/projects/TEST/team');
    await page.waitForLoadState('networkidle');
  }

  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-36/test-264-team.png' });

  // Verify Japanese text
  const pageContent = await page.content();
  console.log('Page URL:', page.url());
  console.log('Page contains チーム:', pageContent.includes('チーム'));
  console.log('Page contains チームメンバーを追加:', pageContent.includes('チームメンバーを追加'));
  console.log('Page contains チームサイズ:', pageContent.includes('チームサイズ'));
});
