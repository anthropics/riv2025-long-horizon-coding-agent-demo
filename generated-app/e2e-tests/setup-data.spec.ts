import { test, expect } from '@playwright/test';

test('setup test data via IndexedDB', async ({ page }) => {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');

  // Wait for app to initialize
  await page.waitForTimeout(1000);

  // Create project and data via the app's database
  const result = await page.evaluate(async () => {
    // Access Dexie from window - we need to wait for React to mount
    const waitForDb = async () => {
      let attempts = 0;
      while (attempts < 10) {
        // @ts-ignore - accessing the db from the app
        const db = (window as any).__CANOPY_DB__;
        if (db) return db;
        await new Promise(r => setTimeout(r, 500));
        attempts++;
      }
      return null;
    };

    const db = await waitForDb();
    if (!db) {
      return { success: false, error: 'DB not found' };
    }

    try {
      // Create a project
      const projectId = crypto.randomUUID();
      const project = {
        id: projectId,
        name: 'Canopy Core',
        key: 'CAN',
        description: 'Main project for testing',
        color: '#1B4332',
        icon: '',
        isArchived: false,
        issueCounter: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.projects.add(project);

      // Create default board
      const board = {
        id: crypto.randomUUID(),
        projectId: projectId,
        name: 'Board',
        columns: [
          { id: 'todo', name: 'To Do', statusCategory: 'todo', sortOrder: 0 },
          { id: 'in-progress', name: 'In Progress', statusCategory: 'in_progress', sortOrder: 1 },
          { id: 'in-review', name: 'In Review', statusCategory: 'in_progress', sortOrder: 2 },
          { id: 'done', name: 'Done', statusCategory: 'done', sortOrder: 3 },
        ],
        swimlaneBy: 'none',
      };
      await db.boards.add(board);

      return { success: true, projectId, projectKey: 'CAN' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  console.log('Setup result:', result);

  // Reload page to see the project
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-14/after-setup.png' });
});
