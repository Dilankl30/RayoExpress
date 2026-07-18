-- Checkout pricing, address limits, and production-safe customer orders.

alter table public.orders add column if not exists delivery_lat double precision;
alter table public.orders add column if not exists delivery_lng double precision;

alter table public.customers
  add column if not exists user_id uuid references public.profiles(id) on delete cascade;

update public.customers
set user_id = id
where user_id is null;

create unique index if not exists idx_customers_user_id
  on public.customers(user_id)
  where user_id is not null;

insert into public.app_config (key, value)
values ('checkout_pricing', '{"delivery_fee":1.5,"tax_rate":0.12}'::jsonb)
on conflict (key) do nothing;

update public.addresses
set title = 'Direccion guardada'
where title = 'DirecciÃ³n guardada';

create or replace function public.handle_profile_role_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'customer' then
    insert into public.customers (id, user_id)
    values (new.id, new.id)
    on conflict (id) do update
      set user_id = coalesce(public.customers.user_id, excluded.user_id);
  elsif new.role = 'driver' then
    insert into public.drivers (id)
    values (new.id)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_customer_address_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*)
    from public.addresses
    where user_id = new.user_id
  ) >= 3 then
    raise exception 'ADDRESS_LIMIT: Solo puedes guardar hasta 3 ubicaciones.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_customer_address_limit on public.addresses;
create trigger trg_enforce_customer_address_limit
before insert on public.addresses
for each row
execute function public.enforce_customer_address_limit();

drop function if exists public.create_order(
  uuid,
  uuid[],
  integer[],
  text,
  text,
  text,
  text,
  numeric,
  double precision,
  double precision
) cascade;

create or replace function public.create_order(
  p_store_id uuid,
  p_product_ids uuid[],
  p_quantities integer[],
  p_delivery_address text,
  p_payment_method text default 'cash',
  p_coupon_code text default null,
  p_notes text default null,
  p_tip numeric default 0,
  p_delivery_lat double precision default null,
  p_delivery_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_store public.stores;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_delivery_fee numeric := 0;
  v_tax_rate numeric := 0.12;
  v_order_id uuid;
  v_i integer;
  v_product_id uuid;
  v_quantity integer;
  v_product public.products;
  v_product_count integer;
  v_inventory public.inventory;
  v_coupon_record record;
  v_customer_redemptions integer := 0;
  v_pricing jsonb;
begin
  v_customer_id := auth.uid();
  if v_customer_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  insert into public.customers (id, user_id)
  values (v_customer_id, v_customer_id)
  on conflict (id) do update
    set user_id = coalesce(public.customers.user_id, excluded.user_id);

  select * into v_store
  from public.stores
  where id = p_store_id;

  if not found then
    raise exception 'STORE_NOT_FOUND';
  end if;

  if not v_store.is_open then
    raise exception 'STORE_CLOSED: La tienda no esta abierta';
  end if;

  if p_product_ids is null or p_quantities is null then
    raise exception 'INVALID_INPUT: Productos y cantidades son requeridos';
  end if;

  v_product_count := array_length(p_product_ids, 1);

  if v_product_count is null or v_product_count = 0 then
    raise exception 'INVALID_INPUT: Debe incluir al menos un producto';
  end if;

  if v_product_count != array_length(p_quantities, 1) then
    raise exception 'INVALID_INPUT: La longitud de productos y cantidades no coincide';
  end if;

  if v_product_count > 50 then
    raise exception 'INVALID_INPUT: Maximo 50 productos por pedido';
  end if;

  if length(trim(coalesce(p_delivery_address, ''))) < 4 then
    raise exception 'INVALID_INPUT: Direccion de entrega requerida';
  end if;

  if p_payment_method not in ('cash', 'transfer') then
    raise exception 'INVALID_INPUT: Metodo de pago no valido';
  end if;

  for v_i in 1..v_product_count loop
    v_product_id := p_product_ids[v_i];
    v_quantity := p_quantities[v_i];

    if v_quantity is null or v_quantity < 1 or v_quantity > 100 then
      raise exception 'INVALID_QUANTITY: Cantidad invalida para producto %', v_product_id;
    end if;

    select * into v_product
    from public.products
    where id = v_product_id
      and store_id = p_store_id
      and is_active = true;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND: Producto % no encontrado o no pertenece a la tienda', v_product_id;
    end if;

    select * into v_inventory
    from public.inventory
    where product_id = v_product_id
    for update;

    if found and v_inventory.quantity < v_quantity then
      raise exception 'INSUFFICIENT_STOCK: Stock insuficiente para %', v_product.name;
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;

  if v_subtotal < coalesce(v_store.min_order, 0) then
    raise exception 'MIN_ORDER: El pedido minimo es $%', v_store.min_order;
  end if;

  select value into v_pricing
  from public.app_config
  where key = 'checkout_pricing';

  v_delivery_fee := coalesce(nullif(v_pricing->>'delivery_fee', '')::numeric, v_store.delivery_fee, 0);
  v_tax_rate := coalesce(nullif(v_pricing->>'tax_rate', '')::numeric, 0.12);

  if v_tax_rate < 0 or v_tax_rate > 1 then
    v_tax_rate := 0.12;
  end if;

  if p_coupon_code is not null and trim(p_coupon_code) != '' then
    select * into v_coupon_record
    from public.promotions
    where upper(code) = upper(trim(p_coupon_code))
      and active = true
      and coalesce(is_active, true) = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
      and (expires_at is null or expires_at >= now())
    limit 1;

    if found then
      if v_coupon_record.max_uses > 0 and v_coupon_record.uses_count >= v_coupon_record.max_uses then
        raise exception 'COUPON_LIMIT: El cupon alcanzo su limite de usos';
      end if;

      select count(*) into v_customer_redemptions
      from public.promotion_redemptions
      where promotion_id = v_coupon_record.id
        and user_id = v_customer_id;

      if coalesce(v_coupon_record.max_uses_per_customer, 1) > 0
         and v_customer_redemptions >= v_coupon_record.max_uses_per_customer then
        raise exception 'COUPON_USED: Ya usaste este cupon';
      end if;

      if v_subtotal < coalesce(v_coupon_record.min_order, 0) then
        raise exception 'COUPON_MIN: El pedido minimo para este cupon es $%', v_coupon_record.min_order;
      end if;

      if v_coupon_record.discount_type = 'percentage' then
        v_discount := least(v_subtotal * (v_coupon_record.discount_value / 100), v_subtotal);
      else
        v_discount := least(v_coupon_record.discount_value, v_subtotal);
      end if;

      update public.promotions
      set uses_count = uses_count + 1
      where id = v_coupon_record.id;
    end if;
  end if;

  v_subtotal := round(v_subtotal::numeric, 2);
  v_discount := round(v_discount::numeric, 2);
  v_delivery_fee := round(greatest(v_delivery_fee, 0)::numeric, 2);
  v_tax := round(((v_subtotal - v_discount) * v_tax_rate)::numeric, 2);
  v_total := round((v_subtotal - v_discount + v_delivery_fee + v_tax)::numeric, 2);

  insert into public.orders (
    customer_id,
    store_id,
    status,
    payment_method,
    subtotal,
    delivery_fee,
    discount,
    tax,
    tip,
    total,
    delivery_address,
    notes,
    delivery_lat,
    delivery_lng
  ) values (
    v_customer_id,
    p_store_id,
    'pending',
    p_payment_method::public.payment_method,
    v_subtotal,
    v_delivery_fee,
    v_discount,
    v_tax,
    0,
    v_total,
    trim(p_delivery_address),
    nullif(trim(coalesce(p_notes, '')), ''),
    p_delivery_lat,
    p_delivery_lng
  )
  returning id into v_order_id;

  for v_i in 1..v_product_count loop
    v_product_id := p_product_ids[v_i];
    v_quantity := p_quantities[v_i];

    select * into v_product
    from public.products
    where id = v_product_id;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price
    ) values (
      v_order_id,
      v_product_id,
      v_product.name,
      v_quantity,
      v_product.price
    );

    update public.inventory
    set quantity = greatest(quantity - v_quantity, 0),
        updated_at = now()
    where product_id = v_product_id;
  end loop;

  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (
    v_customer_id,
    'create_order',
    'order',
    v_order_id,
    jsonb_build_object(
      'store_id', p_store_id,
      'total', v_total,
      'product_count', v_product_count,
      'payment_method', p_payment_method
    )
  );

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'discount', v_discount,
    'tax', v_tax,
    'tip', 0,
    'total', v_total,
    'status', 'pending'
  );
end;
$$;

revoke all on function public.create_order(
  uuid,
  uuid[],
  integer[],
  text,
  text,
  text,
  text,
  numeric,
  double precision,
  double precision
) from public, anon;

grant execute on function public.create_order(
  uuid,
  uuid[],
  integer[],
  text,
  text,
  text,
  text,
  numeric,
  double precision,
  double precision
) to authenticated;
