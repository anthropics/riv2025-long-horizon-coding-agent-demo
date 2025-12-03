import { test, expect } from '@playwright/test';

test('test-272: User can create an account and access the application', async ({ page }) => {
  // Clear IndexedDB to start fresh
  await page.goto('http://localhost:6174');
  await page.evaluate(() => {
    indexedDB.deleteDatabase('CanopyDB');
  });
  await page.waitForTimeout(500);

  await page.goto('http://localhost:6174/login');
  await page.waitForLoadState('networkidle');

  // Click the Sign up link
  await page.click('[data-testid="auth-toggle-mode"]');
  await page.waitForTimeout(500);

  // Fill in the form
  await page.fill('[data-testid="auth-name-input"]', 'Test User');
  await page.fill('[data-testid="auth-email-input"]', 'test@example.com');
  await page.fill('[data-testid="auth-password-input"]', 'password123');
  await page.fill('[data-testid="auth-confirm-password-input"]', 'password123');

  // Click Create Account button
  await page.click('[data-testid="auth-submit-button"]');

  // Wait for navigation
  await page.waitForURL('http://localhost:6174/', { timeout: 10000 });

  // Verify we're on the home page
  await expect(page).toHaveURL('http://localhost:6174/');

  // Verify Canopy header is visible
  await expect(page.locator('header')).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-42/test-272-after-signup.png' });
});

test('test-273: Authenticated user can sign out', async ({ page }) => {
  // First sign up or sign in
  await page.goto('http://localhost:6174/login');
  await page.waitForLoadState('networkidle');

  // Click the Sign up link
  await page.click('[data-testid="auth-toggle-mode"]');
  await page.waitForTimeout(500);

  // Use unique email to avoid conflicts
  const uniqueEmail = `test${Date.now()}@example.com`;

  // Fill in the form
  await page.fill('[data-testid="auth-name-input"]', 'Test User');
  await page.fill('[data-testid="auth-email-input"]', uniqueEmail);
  await page.fill('[data-testid="auth-password-input"]', 'password123');
  await page.fill('[data-testid="auth-confirm-password-input"]', 'password123');

  // Click Create Account button
  await page.click('[data-testid="auth-submit-button"]');

  // Wait for navigation
  await page.waitForURL('http://localhost:6174/', { timeout: 10000 });

  // Click the user avatar in the header - look for the avatar button in the header
  await page.click('header button.rounded-full');
  await page.waitForTimeout(500);

  // Verify Sign Out option is visible
  await expect(page.locator('[data-testid="sign-out-button"]')).toBeVisible();

  // Click Sign Out
  await page.click('[data-testid="sign-out-button"]');

  // Wait for navigation to login page
  await page.waitForURL('http://localhost:6174/login', { timeout: 10000 });

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-42/test-273-after-signout.png' });
});
