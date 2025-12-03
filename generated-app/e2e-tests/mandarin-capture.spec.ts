import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Mandarin Language Screenshots', () => {
  const outputDir = 'screenshots/issue-33';

  test.beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  test('test-256: Capture Mandarin settings page', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:6174/settings');
    await page.waitForLoadState('networkidle');

    // Click on Mandarin language option
    await page.click('[data-testid="language-zh"]');
    await page.waitForTimeout(500);

    // Verify UI is in Mandarin
    await expect(page.locator('h1')).toContainText('设置');

    // Take screenshot
    await page.screenshot({ path: path.join(outputDir, 'test-256-mandarin-ui.png') });

    // Save console log
    const consoleLog = consoleErrors.length === 0 ? 'NO_CONSOLE_ERRORS' : consoleErrors.join('\n');
    fs.writeFileSync(path.join(outputDir, 'test-256-console.txt'), consoleLog + '\n');

    expect(consoleErrors.length).toBe(0);
  });

  test('test-257: Capture Mandarin sidebar navigation', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:6174/settings');
    await page.waitForLoadState('networkidle');

    // Click on Mandarin language option
    await page.click('[data-testid="language-zh"]');
    await page.waitForTimeout(500);

    // Verify sidebar is in Mandarin
    await expect(page.getByRole('link', { name: '项目' })).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: path.join(outputDir, 'test-257-mandarin-sidebar.png') });

    // Save console log
    const consoleLog = consoleErrors.length === 0 ? 'NO_CONSOLE_ERRORS' : consoleErrors.join('\n');
    fs.writeFileSync(path.join(outputDir, 'test-257-console.txt'), consoleLog + '\n');

    expect(consoleErrors.length).toBe(0);
  });
});
