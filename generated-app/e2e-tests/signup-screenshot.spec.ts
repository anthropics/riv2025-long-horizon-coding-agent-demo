import { test, expect } from '@playwright/test';

test('screenshot signup form', async ({ page }) => {
  await page.goto('http://localhost:6174/login');
  await page.waitForLoadState('networkidle');

  // Click the Sign up link
  await page.click('[data-testid="auth-toggle-mode"]');

  // Wait for form to update
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-42/test-271-signup.png' });

  // Verify no console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console error:', msg.text());
    }
  });
});
