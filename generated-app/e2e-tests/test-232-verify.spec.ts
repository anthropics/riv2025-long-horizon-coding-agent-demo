import { test, expect } from '@playwright/test';

test('verify all 7 themes are displayed', async ({ page }) => {
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Check all themes are visible (they may require scrolling within the theme grid)
  const themes = ['Ruby', 'Ocean', 'Forest', 'Sunset', 'Lavender', 'Cyberpunk', 'Retro'];

  for (const theme of themes) {
    const themeButton = page.locator(`button:has-text("${theme}")`);
    // Scroll the button into view if needed
    await themeButton.scrollIntoViewIfNeeded();
    await expect(themeButton).toBeVisible();
    console.log(`✓ ${theme} theme is visible`);
  }

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-25/test-232-all-themes.png', fullPage: true });
});
