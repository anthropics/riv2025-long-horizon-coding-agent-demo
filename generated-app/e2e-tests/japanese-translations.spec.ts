import { test, expect } from '@playwright/test';

// Helper to set language to Japanese
async function setJapaneseLanguage(page: any) {
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');
  // Click on Japanese option
  await page.click('text=日本語');
  await page.waitForTimeout(500);
}

test.describe('Japanese translations on individual pages', () => {
  test('About page displays Japanese translations', async ({ page }) => {
    // First set language to Japanese
    await setJapaneseLanguage(page);

    // Navigate to about page
    await page.goto('http://localhost:6174/about');
    await page.waitForLoadState('networkidle');

    // Verify Japanese text is present
    await expect(page.locator('text=Canopyへようこそ')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=私たちのミッション')).toBeVisible();
    await expect(page.locator('text=プロジェクト管理を簡素化')).toBeVisible();
    await expect(page.locator('text=スプリント計画')).toBeVisible();
    await expect(page.locator('text=カンバンボード')).toBeVisible();
    await expect(page.locator('text=バグ報告')).toBeVisible();
    await expect(page.locator('text=機能リクエスト')).toBeVisible();
  });

  test('About page contribution section displays Japanese translations', async ({ page }) => {
    await setJapaneseLanguage(page);
    await page.goto('http://localhost:6174/about');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=リクエストの方法')).toBeVisible();
    await expect(page.locator('text=良いフィードバックのベストプラクティス')).toBeVisible();
    await expect(page.locator('text=始める準備はできましたか？')).toBeVisible();
    await expect(page.locator('text=プロジェクトを作成')).toBeVisible();
  });
});
