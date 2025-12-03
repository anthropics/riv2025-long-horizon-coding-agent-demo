import { test, expect } from '@playwright/test';

test('Test-263: About page contribution section in Japanese', async ({ page }) => {
  // First go to settings
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Japanese option
  await page.click('text=日本語');
  await page.waitForTimeout(1000);

  // Navigate to about page
  await page.goto('http://localhost:6174/about');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Scroll down to see contribution section
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-36/test-263-contribution.png', fullPage: true });

  // Verify Japanese contribution text
  const pageContent = await page.content();
  console.log('Page contains リクエストの方法:', pageContent.includes('リクエストの方法'));
  console.log('Page contains 良いフィードバックのベストプラクティス:', pageContent.includes('良いフィードバックのベストプラクティス'));
  console.log('Page contains 始める準備はできましたか？:', pageContent.includes('始める準備はできましたか？'));
  console.log('Page contains プロジェクトを作成:', pageContent.includes('プロジェクトを作成'));
});
