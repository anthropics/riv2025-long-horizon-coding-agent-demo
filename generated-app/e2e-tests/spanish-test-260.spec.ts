import { test, expect } from '@playwright/test';

test('test-260: User can switch to Spanish language and UI updates', async ({ page }) => {
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Spanish language option
  await page.click('[data-testid="language-es"]');
  await page.waitForTimeout(500);

  // Verify Spanish is selected
  const spanishButton = page.locator('[data-testid="language-es"]');
  await expect(spanishButton).toHaveClass(/border-primary/);

  // Verify Settings page heading changes to 'Configuración'
  await expect(page.locator('h1')).toContainText('Configuración');

  // Verify Profile section title changes to 'Perfil' (use first match)
  await expect(page.locator('[data-slot="card-title"]').first()).toContainText('Perfil');

  // Verify Language section title changes to 'Idioma' (use card-title containing Idioma)
  await expect(page.locator('[data-slot="card-title"]:has-text("Idioma")')).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-35/test-260-spanish-ui.png', fullPage: false });
});

test('test-261: Spanish language reflects in sidebar navigation', async ({ page }) => {
  await page.goto('http://localhost:6174/settings');
  await page.waitForLoadState('networkidle');

  // Click on Spanish language option
  await page.click('[data-testid="language-es"]');
  await page.waitForTimeout(500);

  // Verify sidebar shows Spanish labels using role-based selectors
  await expect(page.getByRole('link', { name: 'Proyectos' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Flujos de Trabajo' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sobre Nosotros' })).toBeVisible();

  // Verify Create Project button is visible in Spanish
  await expect(page.getByRole('button', { name: 'Crear Proyecto' })).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'screenshots/issue-35/test-261-spanish-sidebar.png', fullPage: false });
});
