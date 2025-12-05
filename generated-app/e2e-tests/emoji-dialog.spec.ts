import { test, expect } from '@playwright/test';

test('Create Emoji dialog opens when clicking Create Emoji button', async ({ page }) => {
  await page.goto('http://localhost:6174/emoji-creator');
  await page.waitForLoadState('networkidle');

  // Click the Create Emoji button
  const createButton = page.locator('[data-testid="create-emoji-button"]');
  await expect(createButton).toBeVisible();
  await createButton.click();

  // Wait for dialog
  await page.waitForSelector('[data-testid="create-emoji-dialog"]', { timeout: 5000 });

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-45/test-277-dialog.png' });

  // Verify dialog elements
  const dialog = page.locator('[data-testid="create-emoji-dialog"]');
  await expect(dialog).toBeVisible();

  const nameInput = page.locator('[data-testid="emoji-name-input"]');
  await expect(nameInput).toBeVisible();

  const shapeSelect = page.locator('[data-testid="shape-select"]');
  await expect(shapeSelect).toBeVisible();

  const expressionSelect = page.locator('[data-testid="expression-select"]');
  await expect(expressionSelect).toBeVisible();

  const accessorySelect = page.locator('[data-testid="accessory-select"]');
  await expect(accessorySelect).toBeVisible();

  const preview = page.locator('[data-testid="emoji-preview"]');
  await expect(preview).toBeVisible();

  const saveButton = page.locator('[data-testid="save-emoji-button"]');
  await expect(saveButton).toBeVisible();
});
