import { test, expect } from '@playwright/test';

test('Test Team page by clicking sidebar link', async ({ page }) => {
  // First set Japanese
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');
  await page.click('text=日本語');
  await page.waitForTimeout(1000);

  // Go to projects page
  await page.goto('http://localhost:6174/projects');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Click on the first project card/link
  const projectLink = page.locator('a[href*="/projects/"]').first();
  if (await projectLink.count() > 0) {
    await projectLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  }

  // Take screenshot to see current state
  await page.screenshot({ path: 'screenshots/issue-36/project-board-ja.png' });

  // Now click on Team link in sidebar
  // The Japanese text for Team is チーム
  const teamLink = page.locator('a:has-text("チーム"), [href*="/team"]').first();
  console.log('Team link count:', await teamLink.count());

  if (await teamLink.count() > 0) {
    await teamLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  }

  // Take screenshot of team page
  await page.screenshot({ path: 'screenshots/issue-36/test-264-team-via-sidebar.png' });

  // Verify Japanese text
  const pageContent = await page.content();
  console.log('Team page URL:', page.url());
  console.log('Page contains チーム:', pageContent.includes('チーム'));
  console.log('Page contains チームメンバーを追加:', pageContent.includes('チームメンバーを追加'));
  console.log('Page contains チームサイズ:', pageContent.includes('チームサイズ'));
  console.log('Page contains 合計稼働週数:', pageContent.includes('合計稼働週数'));
  console.log('Page contains 総稼働時間:', pageContent.includes('総稼働時間'));
});
