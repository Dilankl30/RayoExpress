-- RayoExpress | Migration 003: Seed Data for Development
-- Categorías, tiendas de ejemplo, productos

-- 1. Categories
insert into public.categories (name, emoji, bg_color) values
  ('Restaurantes', '🍔', '#FFF3E0'),
  ('Súper', '🛒', '#E8F5E9'),
  ('Farmacias', '💊', '#E3F2FD'),
  ('Bebidas', '🥤', '#FFF8E1'),
  ('Mascotas', '🐾', '#FCE4EC'),
  ('Mensajería', '📦', '#EDE7F6'),
  ('Tecnología', '📱', '#E0F7FA'),
  ('Regalos', '🎁', '#FFEBEE')
on conflict (name) do nothing;

-- 2. Store owners (require real auth.users to exist)
-- These need an admin to create stores through the UI
-- Sample stores will be inserted when an owner registers

-- 3. Promotions
insert into public.promotions (code, title, discount_type, discount_value, min_order, max_uses) values
  ('RAYO15', '15% de descuento', 'percentage', 15, 5.00, 1000),
  ('RAYO1', 'Envío gratis primer pedido', 'fixed', 1.50, 0, 500)
on conflict (code) do nothing;
