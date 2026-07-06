import { test, expect } from '@playwright/test';

test('login renders Google and email access options', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('button', { name: /Continuar con Google/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Correo electronico/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Crear cuenta nueva/i })).toBeVisible();
});

test('email access requests a verification code', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('button', { name: /Correo electronico/i }).click();
  await expect(page.getByPlaceholder('correo@ejemplo.com')).toBeVisible();
  await page.getByPlaceholder('correo@ejemplo.com').fill('customer@rayo.com');
  await page.getByRole('button', { name: /Enviar codigo/i }).click();

  await expect(page.getByPlaceholder('123456')).toBeVisible();
  await expect(page.getByRole('button', { name: /Verificar codigo/i })).toBeVisible();
});

test('invalid email code shows an error', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('button', { name: /Correo electronico/i }).click();
  await page.getByPlaceholder('correo@ejemplo.com').fill('customer@rayo.com');
  await page.getByRole('button', { name: /Enviar codigo/i }).click();
  await page.getByPlaceholder('123456').fill('000000');
  await page.getByRole('button', { name: /Verificar codigo/i }).click();

  await expect(page.getByText(/incorrecto/i)).toBeVisible();
});

test('demo email code redirects to home', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('button', { name: /Correo electronico/i }).click();
  await page.getByPlaceholder('correo@ejemplo.com').fill('customer@rayo.com');
  await page.getByRole('button', { name: /Enviar codigo/i }).click();
  await page.getByPlaceholder('123456').fill('123456');
  await page.getByRole('button', { name: /Verificar codigo/i }).click();

  await page.waitForURL('**/home');
  await expect(page).toHaveURL(/\/home$/);
});
