import { test, expect } from '@playwright/test';

test('landing page loads with branding elements', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('img[alt="RayoExpress"]').first()).toBeVisible();
  await expect(page.getByText('RayoExpress').first()).toBeVisible();
  await expect(page.getByText('Tu comida favorita,')).toBeVisible();
});

test('landing page has Iniciar Sesión button', async ({ page }) => {
  await page.goto('/');

  const loginBtn = page.getByRole('button', { name: /iniciar sesión/i });
  await expect(loginBtn.first()).toBeVisible();
});

test('landing page has Registrarse button', async ({ page }) => {
  await page.goto('/');

  const registerBtn = page.getByRole('button', { name: /registrarse/i });
  await expect(registerBtn.first()).toBeVisible();
});
