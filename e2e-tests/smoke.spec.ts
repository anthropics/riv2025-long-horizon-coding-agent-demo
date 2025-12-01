import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {

  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check title exists
    await expect(page).toHaveTitle(/./);

    // No console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });

  test('no network errors', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('response', response => {
      if (!response.ok() && response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(failedRequests).toHaveLength(0);
  });

  test('basic interaction works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to find any interactive element
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();

    expect(buttons + inputs).toBeGreaterThan(0);
  });
});
