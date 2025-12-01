import { test, expect } from '@playwright/test';

test('check database data', async ({ page }) => {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const result = await page.evaluate(async () => {
    const db = (window as any).__CANOPY_DB__;
    if (!db) return { error: 'DB not found' };

    const projects = await db.projects.toArray();
    const boards = await db.boards.toArray();
    const users = await db.users.toArray();

    return { projects, boards, users };
  });

  console.log('Database contents:', JSON.stringify(result, null, 2));
});
