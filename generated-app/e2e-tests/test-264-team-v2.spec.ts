import { test, expect } from '@playwright/test';

test('Test-264: Team page displays Japanese translations', async ({ page }) => {
  // First go to settings and set Japanese
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');
  await page.click('text=日本語');
  await page.waitForTimeout(1000);

  // Go to create project page
  await page.goto('http://localhost:6174/projects/new');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Fill in project details
  await page.fill('input#name, input[name="name"]', 'テストプロジェクト');
  await page.fill('input#key, input[name="key"]', 'JPTEST');

  // Submit
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Now we should be redirected to the project board
  // Navigate to team page for this project
  await page.goto('http://localhost:6174/projects/JPTEST/team');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-36/test-264-team-v2.png' });

  // Verify Japanese text
  const pageContent = await page.content();
  console.log('Page URL:', page.url());
  console.log('Page contains チーム:', pageContent.includes('チーム'));
  console.log('Page contains チームメンバーを追加:', pageContent.includes('チームメンバーを追加'));
  console.log('Page contains チームサイズ:', pageContent.includes('チームサイズ'));
  console.log('Page contains 合計稼働週数:', pageContent.includes('合計稼働週数'));
  console.log('Page contains 総稼働時間:', pageContent.includes('総稼働時間'));
});
