import pg from 'pg';
import { readFileSync, existsSync } from 'fs';

let envPassword = process.env.SUPABASE_DB_PASSWORD;
if (!envPassword && existsSync('.env')) {
  const envContent = readFileSync('.env', 'utf8');
  const match = envContent.match(/^SUPABASE_DB_PASSWORD\s*=\s*["']?([^"'\s#]+)["']?/m);
  if (match) {
    envPassword = match[1];
  }
}

const clientConfig = {
  host: 'db.bxhnlwkhoeeqpifqvqxs.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: envPassword,
  ssl: { rejectUnauthorized: false },
};

const sql = `
DROP FUNCTION IF EXISTS public.create_order(uuid, uuid[], integer[], text, text, text, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.create_order(uuid, uuid[], integer[], text, public.payment_method, text, text, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.create_order(uuid, uuid[], integer[], text, text, text, text, numeric, double precision, double precision) CASCADE;

CREATE OR REPLACE FUNCTION public.create_order(
  p_store_id uuid,
  p_product_ids uuid[],
  p_quantities integer[],
  p_delivery_address text,
  p_payment_method text default 'cash',
  p_coupon_code text default null,
  p_notes text default null,
  p_tip numeric default 0,
  p_delivery_lat float default null,
  p_delivery_lng float default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id uuid;
  v_customer_record record;
  v_store public.stores;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_delivery_fee numeric := 0;
  v_order_id uuid;
  v_i integer;
  v_product_id uuid;
  v_quantity integer;
  v_product public.products;
  v_product_count integer;
  v_tax_rate numeric := 0.15; -- 15% IVA Ecuador 2025
  v_inventory public.inventory;
  v_coupon_record record;
BEGIN
  -- 1. Validate customer
  v_customer_id := auth.uid();
  if v_customer_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select id into v_customer_record from public.customers where user_id = v_customer_id;
  if not found then
    raise exception 'PERMISSION_DENIED: Solo clientes pueden crear pedidos';
  end if;

  -- 2. Validate store
  select * into v_store from public.stores where id = p_store_id;
  if not found then
    raise exception 'STORE_NOT_FOUND';
  end if;

  if not v_store.is_open then
    raise exception 'STORE_CLOSED: La tienda no esta abierta';
  end if;

  -- 3. Validate input arrays
  if p_product_ids is null or p_quantities is null then
    raise exception 'INVALID_INPUT: Productos y cantidades son requeridos';
  end if;

  v_product_count := array_length(p_product_ids, 1);
  if v_product_count != array_length(p_quantities, 1) then
    raise exception 'INVALID_INPUT: La longitud de productos y cantidades no coincide';
  end if;

  if v_product_count = 0 then
    raise exception 'INVALID_INPUT: Debe incluir al menos un producto';
  end if;

  if v_product_count > 50 then
    raise exception 'INVALID_INPUT: Maximo 50 productos por pedido';
  end if;

  -- 4. Validate delivery address
  if coalesce(p_delivery_address, '') = '' then
    raise exception 'INVALID_INPUT: Direccion de entrega requerida';
  end if;

  -- 5. Validate payment method
  if p_payment_method not in ('cash', 'transfer', 'card') then
    raise exception 'INVALID_INPUT: Metodo de pago no valido';
  end if;

  -- 6. Validate tip
  if p_tip < 0 then
    raise exception 'INVALID_INPUT: La propina no puede ser negativa';
  end if;

  if p_tip > 100 then
    raise exception 'INVALID_INPUT: La propina no puede exceder $100';
  end if;

  -- 7. Validate products and calculate total
  for v_i in 1..v_product_count loop
    v_product_id := p_product_ids[v_i];
    v_quantity := p_quantities[v_i];

    -- Validate quantity
    if v_quantity < 1 or v_quantity != floor(v_quantity) then
      raise exception 'INVALID_QUANTITY: Cantidad invalida para producto %', v_product_id;
    end if;

    -- Get product from DB
    select * into v_product
    from public.products
    where id = v_product_id and store_id = p_store_id and is_active = true;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND: Producto % no encontrado o no pertenece a la tienda', v_product_id;
    end if;

    -- Check inventory
    select * into v_inventory
    from public.inventory
    where product_id = v_product_id
    for update;

    if found and v_inventory.quantity < v_quantity then
      raise exception 'INSUFFICIENT_STOCK: Stock insuficiente para %', v_product.name;
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;

  -- 8. Validate minimum order
  v_delivery_fee := coalesce(v_store.delivery_fee, 0);
  if v_subtotal < coalesce(v_store.min_order, 0) then
    raise exception 'MIN_ORDER: El pedido minimo es $%', v_store.min_order;
  end if;

  -- 8.5 Apply coupon discount if provided
  if p_coupon_code is not null and p_coupon_code != '' then
    select * into v_coupon_record from public.promotions
    where code = p_coupon_code and active = true;
    if found then
      if v_coupon_record.max_uses > 0 and v_coupon_record.uses_count >= v_coupon_record.max_uses then
        raise exception 'COUPON_LIMIT: El cupón ha alcanzado el límite de usos';
      end if;
      if v_subtotal < v_coupon_record.min_order then
        raise exception 'COUPON_MIN: El pedido mínimo para este cupón es $%', v_coupon_record.min_order;
      end if;
      if v_coupon_record.discount_type = 'percentage' then
        v_discount := least(v_subtotal * (v_coupon_record.discount_value / 100), v_subtotal);
      else
        v_discount := least(v_coupon_record.discount_value, v_subtotal);
      end if;
      update public.promotions set uses_count = uses_count + 1 where id = v_coupon_record.id;
    end if;
  end if;

  -- 9. Calculate totals server-side
  v_tax := round(((v_subtotal - v_discount) * v_tax_rate)::numeric, 2);
  v_total := v_subtotal - v_discount + v_delivery_fee + v_tax + p_tip;

  -- 10. Create order
  insert into public.orders (
    customer_id, store_id, status, payment_method,
    subtotal, delivery_fee, discount, tax, tip, total,
    delivery_address, notes, delivery_lat, delivery_lng
  ) values (
    v_customer_id, p_store_id, 'pending', p_payment_method::public.payment_method,
    v_subtotal, v_delivery_fee, v_discount, v_tax, p_tip, v_total,
    p_delivery_address, p_notes, p_delivery_lat, p_delivery_lng
  )
  returning id into v_order_id;

  -- 11. Insert order items
  for v_i in 1..v_product_count loop
    v_product_id := p_product_ids[v_i];
    v_quantity := p_quantities[v_i];

    select price into v_product
    from public.products
    where id = v_product_id;

    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
    values (v_order_id, v_product_id,
      (select name from public.products where id = v_product_id),
      v_quantity, v_product.price);
  end loop;

  -- 13. Log audit
  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (v_customer_id, 'create_order', 'order', v_order_id,
    jsonb_build_object('store_id', p_store_id, 'total', v_total, 'product_count', v_product_count));

  return jsonb_build_object('ok', true, 'order_id', v_order_id, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.create_order FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_order TO authenticated;
`;

const client = new pg.Client(clientConfig);
await client.connect();

try {
  await client.query(sql);
  console.log('Successfully dropped old functions and deployed the new 10-parameter create_order!');
} catch (err) {
  console.error('Error applying deploy script:', err.message);
} finally {
  await client.end();
}
