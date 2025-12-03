import { test, expect } from '@playwright/test';

test('Create project and test Team page Japanese translations', async ({ page }) => {
  // First set Japanese
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');
  await page.click('text=日本語');
  await page.waitForTimeout(1000);

  // Go to projects page
  await page.goto('http://localhost:6174/projects');
  await page.waitForLoadState('networkidle');

  // Take screenshot of projects page
  await page.screenshot({ path: 'screenshots/issue-36/projects-page-ja.png' });

  // Click create project button
  await page.click('button:has-text("プロジェクトを作成"), a:has-text("プロジェクトを作成"), button:has-text("Create Project")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Take screenshot of create project page
  await page.screenshot({ path: 'screenshots/issue-36/create-project-ja.png' });

  // Fill in the form
  const nameInput = page.locator('input').first();
  await nameInput.fill('日本語テスト');

  // Wait for key to auto-populate or fill it
  await page.waitForTimeout(500);

  const keyInput = page.locator('input').nth(1);
  const keyValue = await keyInput.inputValue();
  if (!keyValue) {
    await keyInput.fill('JATEST');
  }

  // Take screenshot before submit
  await page.screenshot({ path: 'screenshots/issue-36/create-project-filled-ja.png' });

  // Click submit button
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // Take screenshot after creation
  await page.screenshot({ path: 'screenshots/issue-36/after-create-ja.png' });

  console.log('Current URL after create:', page.url());

  // Get the project key from URL
  const url = page.url();
  const keyMatch = url.match(/\/projects\/([^\/]+)/);
  const projectKey = keyMatch ? keyMatch[1] : 'JATEST';

  console.log('Project key:', projectKey);

  // Navigate to team page
  await page.goto(`http://localhost:6174/projects/${projectKey}/team`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-36/test-264-team-final.png' });

  // Verify Japanese text
  const pageContent = await page.content();
  console.log('Team page URL:', page.url());
  console.log('Page contains チーム:', pageContent.includes('チーム'));
  console.log('Page contains チームメンバーを追加:', pageContent.includes('チームメンバーを追加'));
});
