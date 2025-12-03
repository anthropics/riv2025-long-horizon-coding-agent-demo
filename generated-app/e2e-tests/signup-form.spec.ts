import { test, expect } from '@playwright/test';

test('test-271: Signup form displays when clicking Sign up link', async ({ page }) => {
  await page.goto('http://localhost:6174/login');
  await page.waitForLoadState('networkidle');

  // Click the Sign up link
  await page.click('[data-testid="auth-toggle-mode"]');

  // Wait for form to update
  await page.waitForTimeout(500);

  // Verify Create Account heading is displayed
  await expect(page.locator('[data-slot="card-title"]')).toContainText('Create Account');

  // Verify name input field
  await expect(page.locator('[data-testid="auth-name-input"]')).toBeVisible();

  // Verify email input field
  await expect(page.locator('[data-testid="auth-email-input"]')).toBeVisible();

  // Verify password input field
  await expect(page.locator('[data-testid="auth-password-input"]')).toBeVisible();

  // Verify confirm password input field
  await expect(page.locator('[data-testid="auth-confirm-password-input"]')).toBeVisible();

  // Verify Create Account button is visible
  await expect(page.locator('[data-testid="auth-submit-button"]')).toContainText('Create Account');
});
