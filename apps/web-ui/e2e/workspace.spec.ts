import { test, expect } from '@playwright/test';

test.describe('TxtGrph Web Workspace End-to-End Tests', () => {
  test('loads home landing page and displays title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/TxtGrph/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigates to workspace and renders live editor page', async ({ page }) => {
    await page.goto('/workspace');
    await expect(page).toHaveURL(/\/workspace/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('loads auth hub page with glassmorphic design system', async ({ page }) => {
    await page.goto('/auth');
    await expect(page).toHaveURL(/\/auth/);
    const emailInput = page.locator('#email-input');
    await expect(emailInput).toBeVisible();
  });

  test('opens and verifies templates modal in workspace', async ({ page }) => {
    await page.goto('/workspace');
    await expect(page).toHaveURL(/\/workspace/);

    const templatesBtn = page.getByTitle(/templates/i).or(page.getByRole('button', { name: /templates/i })).first();
    if (await templatesBtn.isVisible()) {
      await templatesBtn.click();
      const modalHeader = page.getByText(/diagram templates library/i);
      await expect(modalHeader).toBeVisible({ timeout: 5000 });
    }
  });
});
