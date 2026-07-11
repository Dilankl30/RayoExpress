-- Migration 027: Catalog Secure RPCs
-- This migration moves product and category creation to server-side RPCs
-- to ensure atomic operations (Product + Inventory) and bypass RLS restrictions.

-- 1. Secure Product Creation RPC
create or replace function public.create_product_secure(
  p_store_id uuid,
  p_name text,
  p_price numeric,
  p_emoji text,
  p_description text default null,
  p_category_id uuid default null,
  p_image_url text default null
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
begin
  -- Validate store ownership
  if not exists (select 1 from public.stores where id = p_store_id and owner_id = auth.uid()) then
    raise exception 'No tienes permiso para crear productos en esta tienda';
  end if;

  -- Insert product
  insert into public.products (store_id, name, price, emoji, description, category_id, image_url, is_active)
  values (p_store_id, p_name, p_price, p_emoji, p_description, p_category_id, p_image_url, true)
  returning * into v_product;

  -- Initialize inventory
  insert into public.inventory (product_id, quantity, low_stock_threshold)
  values (v_product.id, 0, 10)
  on conflict (product_id) do nothing;

  return v_product;
end;
$$;

-- 2. Secure Category Creation RPC
create or replace function public.create_category_secure(
  p_name text,
  p_emoji text,
  p_bg_color text
)
returns public.categories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category public.categories;
begin
  -- Allow any authenticated user to create a category (or restrict to admin if preferred)
  -- Here we allow authenticated users as per the request for "functionality".
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  insert into public.categories (name, emoji, bg_color)
  values (p_name, p_emoji, p_bg_color)
  returning * into v_category;

  return v_category;
end;
$$;

grant execute on function public.create_product_secure to authenticated;
grant execute on function public.create_category_secure to authenticated;
