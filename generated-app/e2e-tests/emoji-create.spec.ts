import { test, expect } from '@playwright/test';

test('User can create a custom emoji', async ({ page }) => {
  await page.goto('http://localhost:6174/emoji-creator');
  await page.waitForLoadState('networkidle');

  // Click the Create Emoji button
  const createButton = page.locator('[data-testid="create-emoji-button"]');
  await expect(createButton).toBeVisible();
  await createButton.click();

  // Wait for dialog
  await page.waitForSelector('[data-testid="create-emoji-dialog"]', { timeout: 5000 });

  // Fill in the form
  const nameInput = page.locator('[data-testid="emoji-name-input"]');
  await nameInput.fill('Happy Sun');

  // Click a shape option (Circle is default, let's click square for variety)
  const shapeSelect = page.locator('[data-testid="shape-select"]');
  await shapeSelect.click();
  await page.locator('text=Star').click();

  // Change expression
  const expressionSelect = page.locator('[data-testid="expression-select"]');
  await expressionSelect.click();
  await page.locator('text=Cool').click();

  // Change accessory
  const accessorySelect = page.locator('[data-testid="accessory-select"]');
  await accessorySelect.click();
  await page.locator('text=Sunglasses').click();

  // Click Create Emoji button
  const saveButton = page.locator('[data-testid="save-emoji-button"]');
  await saveButton.click();

  // Wait for dialog to close and emoji to appear
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-45/test-278-created.png' });

  // Verify the emoji appears in the gallery
  const emojiName = page.locator('text=Happy Sun');
  await expect(emojiName).toBeVisible();
});
