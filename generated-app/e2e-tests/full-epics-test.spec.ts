import { test, expect } from '@playwright/test';

test('Full test: Create project and view Epics page in Japanese', async ({ page }) => {
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
  await nameInput.fill('Epic Test Project');

  await page.waitForTimeout(500);

  // Set a simple key
  const keyInput = page.locator('input').nth(1);
  await keyInput.fill('');
  await keyInput.type('EPICJA', { delay: 50 });

  await page.waitForTimeout(500);

  // Click create/submit button
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  console.log('Current URL:', page.url());

  // Now we should be on the project board
  // Click on Epics link in sidebar (エピック)
  await page.click('text=エピック');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Take screenshot of epics page
  await page.screenshot({ path: 'screenshots/issue-36/test-265-epics-success.png' });

  // Verify Japanese text
  const pageContent = await page.content();
  console.log('Epics page URL:', page.url());
  console.log('Page contains エピック:', pageContent.includes('エピック'));
  console.log('Page contains エピックを管理し、進捗を追跡します:', pageContent.includes('エピックを管理し、進捗を追跡します'));
  console.log('Page contains 合計エピック数:', pageContent.includes('合計エピック数'));
  console.log('Page contains オープン:', pageContent.includes('オープン'));
  console.log('Page contains 進行中:', pageContent.includes('進行中'));
  console.log('Page contains 完了:', pageContent.includes('完了'));
  console.log('Page contains すべて展開:', pageContent.includes('すべて展開'));
  console.log('Page contains すべて折りたたむ:', pageContent.includes('すべて折りたたむ'));
});
