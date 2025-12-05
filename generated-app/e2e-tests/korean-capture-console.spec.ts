import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test('Capture console for Korean UI (test-280)', async ({ page }) => {
  const consoleMessages: string[] = [];
  page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', error => consoleMessages.push(`[error] ${error.message}`));

  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Korean option
  await page.click('text=한국어');
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-46/test-280-korean-settings.png' });

  // Write console log
  const hasErrors = consoleMessages.some(m => m.includes('[error]'));
  const consoleContent = hasErrors ? consoleMessages.join('\n') : 'NO_CONSOLE_ERRORS';
  fs.writeFileSync('screenshots/issue-46/test-280-console.txt', consoleContent);

  // Verify Korean text is visible
  await expect(page.locator('h1:has-text("설정")')).toBeVisible();
});

test('Capture console for Korean sidebar (test-281)', async ({ page }) => {
  const consoleMessages: string[] = [];
  page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', error => consoleMessages.push(`[error] ${error.message}`));

  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Korean option
  await page.click('text=한국어');
  await page.waitForTimeout(1000);

  // Navigate to home
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-46/test-281-korean-home.png' });

  // Write console log
  const hasErrors = consoleMessages.some(m => m.includes('[error]'));
  const consoleContent = hasErrors ? consoleMessages.join('\n') : 'NO_CONSOLE_ERRORS';
  fs.writeFileSync('screenshots/issue-46/test-281-console.txt', consoleContent);

  // Verify Korean text is visible
  await expect(page.locator('a:has-text("프로젝트")').first()).toBeVisible();
});
