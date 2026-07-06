import { test, expect } from '@playwright/test';

test('login form renders with email, password, and submit button', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByPlaceholder('correo@ejemplo.com')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /ingresar/i })).toBeVisible();
});

test('login with invalid credentials shows error', async ({ page }) => {
  await page.goto('/login');

  await page.getByPlaceholder('correo@ejemplo.com').fill('wrong@email.com');
  await page.locator('input[type="password"]').fill('wrongpass');
  await page.getByRole('button', { name: /ingresar/i }).click();

  await expect(page.getByText(/Credenciales/i)).toBeVisible();
});

test('login with customer credentials redirects to home', async ({ page }) => {
  await page.goto('/login');

  await page.getByPlaceholder('correo@ejemplo.com').fill('customer@rayo.com');
  await page.locator('input[type="password"]').fill('customer123');
  await page.getByRole('button', { name: /ingresar/i }).click();

  await page.waitForURL('**/home');
  await expect(page.getByText('Populares ahora')).toBeVisible();
});
