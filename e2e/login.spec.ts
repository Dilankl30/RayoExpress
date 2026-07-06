import { test, expect } from '@playwright/test';

test('login renders Google and email access options', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('button', { name: /Continuar con Google/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Correo electronico/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Crear cuenta nueva/i })).toBeVisible();
});

test('email login requires configured Supabase in real mode', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('button', { name: /Correo electronico/i }).click();
  await expect(page.getByPlaceholder('correo@ejemplo.com')).toBeVisible();
  await page.getByPlaceholder('correo@ejemplo.com').fill('customer@rayo.com');
  await page.getByPlaceholder('Minimo 6 caracteres').fill('customer123');
  await page.getByRole('button', { name: /Iniciar sesion/i }).click();

  await expect(page.getByText(/Supabase no esta configurado para iniciar sesion real/i)).toBeVisible();
});

test('registration form validates matching passwords before requesting code', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('button', { name: /Crear cuenta nueva/i }).click();
  await page.getByPlaceholder('Tu nombre completo').fill('Cliente Rayo');
  await page.getByPlaceholder('correo@ejemplo.com').fill('nuevo@rayo.com');
  await page.getByPlaceholder('Minimo 6 caracteres').fill('cliente123');
  await page.getByPlaceholder('Repite tu clave').fill('cliente321');
  await expect(page.getByRole('button', { name: /Enviar codigo/i })).toBeDisabled();
  await page.getByPlaceholder('Repite tu clave').fill('cliente123');
  await expect(page.getByRole('button', { name: /Enviar codigo/i })).toBeEnabled();
  await page.getByRole('button', { name: /Enviar codigo/i }).click();

  await expect(page.getByText(/Supabase no esta configurado para enviar codigos reales/i)).toBeVisible();
});
