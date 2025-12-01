import { test, expect } from '@playwright/test';

test.describe.serial('Take page screenshots', () => {
  test('setup and screenshot all pages', async ({ page }) => {
    // First go to home
    await page.goto('http://localhost:6174');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check if we need to create project
    const welcomeVisible = await page.locator('text=Welcome to Canopy').isVisible().catch(() => false);

    if (welcomeVisible) {
      // Create project via form
      await page.click('text=Create your first project');
      await page.waitForTimeout(500);
      await page.fill('#name', 'Test Project');
      await page.waitForTimeout(300);
      await page.fill('#key', 'TP');
      await page.click('button:has-text("Create Project")');
      await page.waitForTimeout(2000);
    } else {
      // Click on existing project
      const projectCard = page.locator('button:has-text("Test Project")').first();
      if (await projectCard.isVisible()) {
        await projectCard.click();
        await page.waitForTimeout(1000);
      }
    }

    // Now take screenshots of all pages
    // Board (empty state)
    await page.screenshot({ path: 'screenshots/issue-14/page-board.png' });

    // Navigate to Backlog
    await page.click('aside >> text=Backlog');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/page-backlog.png' });

    // Navigate to Roadmap
    await page.click('aside >> text=Roadmap');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/page-roadmap.png' });

    // Navigate to Active Sprints
    await page.click('aside >> text=Active Sprints');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/page-sprints.png' });

    // Navigate to Burndown Chart
    await page.click('aside >> text=Burndown Chart');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/page-burndown.png' });

    // Navigate to Velocity Chart
    await page.click('aside >> text=Velocity Chart');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/page-velocity.png' });

    // Navigate to Sprint Report
    await page.click('aside >> text=Sprint Report');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/page-sprint-report.png' });

    // Navigate to Project Settings
    await page.click('aside >> text=Project Settings');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/page-project-settings.png' });

    // Navigate to Components
    await page.click('aside >> text=Components');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/page-components.png' });

    // Navigate to Labels
    await page.click('aside >> text=Labels');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/page-labels.png' });

    // Go back to Board
    await page.click('aside >> text=Board');
    await page.waitForTimeout(1000);

    // Open search modal via header
    const searchInput = page.locator('header input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/issue-14/page-search-modal.png' });
      await page.keyboard.press('Escape');
    }

    // Go to user settings
    await page.goto('http://localhost:6174/settings');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/issue-14/page-user-settings.png' });
  });
});
