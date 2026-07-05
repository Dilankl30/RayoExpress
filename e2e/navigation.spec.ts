import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('correo@ejemplo.com').fill('customer@rayo.com');
  await page.getByPlaceholder('••••••••').fill('customer123');
  await page.getByRole('button', { name: /ingresar/i }).click();
  await page.waitForURL('**/home');
});

test('home screen shows stores after login', async ({ page }) => {
  await expect(page.getByText('Populares ahora')).toBeVisible();
  await expect(page.getByText('tiendas').first()).toBeVisible();
});

test('clicking a store navigates to store detail', async ({ page }) => {
  const storeCard = page.locator('button').filter({ has: page.locator('text=Burger King') }).first();
  await storeCard.click();

  await page.waitForURL('**/store-detail/**');
  await expect(page.getByText('Burger King').first()).toBeVisible();
});

test('navigating to cart renders cart page', async ({ page }) => {
  const cartButton = page.locator('a, button').filter({ has: page.locator('svg.lucide-shopping-cart') }).first();
  await cartButton.click();

  await page.waitForURL('**/cart');
  await expect(page.getByText('Mi Carrito')).toBeVisible();
});
