import { test, expect } from '@playwright/test';

test('Full test: Create project and view Team page in Japanese', async ({ page }) => {
  // First set Japanese
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');
  await page.click('text=日本語');
  await page.waitForTimeout(1000);

  // Click "Create Project" button in sidebar
  await page.click('text=プロジェクトを作成');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Fill in the form - use English key to avoid encoding issues
  const nameInput = page.locator('input').first();
  await nameInput.fill('Test Project JA');

  await page.waitForTimeout(500);

  // Set a simple key
  const keyInput = page.locator('input').nth(1);
  await keyInput.fill('');
  await keyInput.type('TESTJA', { delay: 50 });

  await page.waitForTimeout(500);

  // Take screenshot before submit
  await page.screenshot({ path: 'screenshots/issue-36/before-create-project.png' });

  // Click create/submit button
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // Take screenshot after creation
  await page.screenshot({ path: 'screenshots/issue-36/after-project-create.png' });

  console.log('Current URL:', page.url());

  // Now we should be on the project board
  // Click on Team link in sidebar
  await page.click('text=チーム');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Take screenshot of team page
  await page.screenshot({ path: 'screenshots/issue-36/test-264-team-success.png' });

  // Verify Japanese text
  const pageContent = await page.content();
  console.log('Team page URL:', page.url());
  console.log('Page contains チーム:', pageContent.includes('チーム'));
  console.log('Page contains チームメンバーを追加:', pageContent.includes('チームメンバーを追加'));
  console.log('Page contains チームサイズ:', pageContent.includes('チームサイズ'));
  console.log('Page contains 合計稼働週数:', pageContent.includes('合計稼働週数'));
  console.log('Page contains 総稼働時間:', pageContent.includes('総稼働時間'));
  console.log('Page contains チームメンバーがまだいません:', pageContent.includes('チームメンバーがまだいません'));
});
