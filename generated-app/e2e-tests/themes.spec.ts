import { test, expect } from '@playwright/test';

test.describe('Theme Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:6174/settings');
    await page.waitForLoadState('networkidle');
  });

  test('settings page displays color theme picker with all themes', async ({ page }) => {
    // Check Color Theme section exists
    await expect(page.locator('text=Color Theme')).toBeVisible();

    // Check all themes are visible
    const themes = ['Ruby', 'Ocean', 'Forest', 'Sunset', 'Lavender', 'Cyberpunk', 'Retro'];
    for (const theme of themes) {
      await expect(page.locator(`text=${theme}`).first()).toBeVisible();
    }
  });

  test('can switch to Ocean theme', async ({ page }) => {
    // Click on Ocean theme
    await page.click('button:has-text("Ocean")');

    // Wait for theme to apply
    await page.waitForTimeout(500);

    // Verify the html element has the theme class
    const html = page.locator('html');
    await expect(html).toHaveClass(/theme-ocean/);
  });

  test('can switch to Forest theme', async ({ page }) => {
    await page.click('button:has-text("Forest")');
    await page.waitForTimeout(500);
    const html = page.locator('html');
    await expect(html).toHaveClass(/theme-forest/);
  });

  test('can switch to Cyberpunk theme', async ({ page }) => {
    await page.click('button:has-text("Cyberpunk")');
    await page.waitForTimeout(500);
    const html = page.locator('html');
    await expect(html).toHaveClass(/theme-cyberpunk/);
  });

  test('can toggle between light and dark mode', async ({ page }) => {
    // Click Dark mode
    await page.click('button:has-text("Dark")');
    await page.waitForTimeout(500);

    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    // Click Light mode
    await page.click('button:has-text("Light")');
    await page.waitForTimeout(500);
    await expect(html).toHaveClass(/light/);
  });

  test('theme persists after page reload', async ({ page }) => {
    // Select Ocean theme
    await page.click('button:has-text("Ocean")');
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify theme is still Ocean
    const html = page.locator('html');
    await expect(html).toHaveClass(/theme-ocean/);
  });
});
