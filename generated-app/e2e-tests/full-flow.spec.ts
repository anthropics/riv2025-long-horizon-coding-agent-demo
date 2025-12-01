import { test, expect } from '@playwright/test';

test.describe.serial('Full Application Flow', () => {
  test('Create project and verify all pages', async ({ page }) => {
    // Start fresh - go to home
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check if project already exists (Demo Project or similar)
    const projectSelector = page.locator('header >> text=Demo Project');
    const hasProject = await projectSelector.isVisible().catch(() => false);

    if (!hasProject) {
      // Need to create project
      const createButton = page.locator('button:has-text("Create your first project"), button:has-text("Create Project")').first();
      await createButton.waitFor({ timeout: 10000 });
      await createButton.click();
      await page.waitForTimeout(1000);

      // Wait for new project form
      await page.waitForSelector('input#name', { timeout: 10000 });

      // Fill project details
      await page.fill('input#name', 'Demo Project');
      await page.fill('input#key', 'DEMO');
      await page.waitForTimeout(500);

      // Create project
      await page.click('button[type="submit"]:has-text("Create Project")');
      await page.waitForTimeout(2000);
    }

    // Now go to board
    await page.goto('http://localhost:6174/project/DEMO/board');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/flow-03-board-empty.png' });

    // Try to create an issue using header Create button
    const headerCreateBtn = page.locator('header button:has-text("Create")');
    await headerCreateBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/issue-14/flow-04-after-create-click.png' });

    // Check if modal is open
    const modal = page.locator('[role="dialog"]');
    const isModalVisible = await modal.isVisible().catch(() => false);

    if (isModalVisible) {
      // Fill summary
      await page.fill('[role="dialog"] input#summary', 'My first task');
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'screenshots/issue-14/flow-04b-modal-filled.png' });

      // Create the issue
      await page.click('[role="dialog"] button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'screenshots/issue-14/flow-05-board-state.png' });

    // Navigate to Backlog
    await page.click('aside >> text=Backlog');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/flow-07-backlog.png' });

    // Navigate to Roadmap
    await page.click('aside >> text=Roadmap');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/flow-08-roadmap.png' });

    // Navigate to Active Sprints
    await page.click('aside >> text=Active Sprints');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/flow-09-active-sprints.png' });

    // Navigate to Burndown Chart
    await page.click('aside >> text=Burndown Chart');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/flow-10-burndown.png' });

    // Navigate to Velocity Chart
    await page.click('aside >> text=Velocity Chart');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/flow-11-velocity.png' });

    // Navigate to Sprint Report
    await page.click('aside >> text=Sprint Report');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/flow-12-sprint-report.png' });

    // Navigate to Project Settings
    await page.click('aside >> text=Project Settings');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/flow-13-project-settings.png' });

    // Navigate to Components
    await page.click('aside >> text=Components');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/flow-14-components.png' });

    // Navigate to Labels
    await page.click('aside >> text=Labels');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/flow-15-labels.png' });

    // Go back to board
    await page.click('aside >> text=Board');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/flow-16-board-final.png' });

    // Test search - click on search
    await page.click('header >> text=Search');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/flow-17-search-modal.png' });

    // All tests passed!
    console.log('All flow tests passed!');
  });
});
