-- RayoExpress | Migration 002: Triggers and Functions

-- 1. Auto-update updated_at for profiles
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'profiles_updated_at') then
    create trigger profiles_updated_at before update on public.profiles
      for each row execute function public.handle_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'stores_updated_at') then
    create trigger stores_updated_at before update on public.stores
      for each row execute function public.handle_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'products_updated_at') then
    create trigger products_updated_at before update on public.products
      for each row execute function public.handle_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'orders_updated_at') then
    create trigger orders_updated_at before update on public.orders
      for each row execute function public.handle_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'password_recovery_updated_at') then
    create trigger password_recovery_updated_at before update on public.password_recovery_questions
      for each row execute function public.handle_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'inventory_updated_at') then
    create trigger inventory_updated_at before update on public.inventory
      for each row execute function public.handle_updated_at();
  end if;
end $$;

-- 2. Create profile on signup (trigger on auth.users)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_role text;
  raw_full_name text;
  raw_security_question text;
  raw_security_answer_hash text;
begin
  raw_role := coalesce(new.raw_user_meta_data ->> 'role', 'customer');
  raw_full_name := new.raw_user_meta_data ->> 'full_name';
  raw_security_question := new.raw_user_meta_data ->> 'security_question';
  raw_security_answer_hash := new.raw_user_meta_data ->> 'security_answer_hash';

  insert into public.profiles (id, role, full_name, phone, avatar_url)
  values (
    new.id,
    raw_role::public.app_role,
    raw_full_name,
    new.phone,
    new.raw_user_meta_data ->> 'avatar_url'
  );

  -- If security question provided, store in dedicated table (NOT in user_metadata)
  if raw_security_question is not null and raw_security_answer_hash is not null then
    insert into public.password_recovery_questions (user_id, question, answer_hash)
    values (new.id, raw_security_question, raw_security_answer_hash);
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Auto-create customer/driver/store records based on role
create or replace function public.handle_profile_role_insert()
returns trigger as $$
begin
  if new.role = 'customer' then
    insert into public.customers (id) values (new.id) on conflict (id) do nothing;
  elsif new.role = 'driver' then
    insert into public.drivers (id) values (new.id) on conflict (id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_role_insert on public.profiles;
create trigger on_profile_role_insert
  after insert on public.profiles
  for each row execute function public.handle_profile_role_insert();

-- 4. Generate delivery code when order is accepted
create or replace function public.generate_delivery_code()
returns trigger as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.delivery_codes (order_id, code, created_by)
    values (new.id, upper(substr(md5(random()::text), 1, 8)), new.customer_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_accepted on public.orders;
create trigger on_order_accepted
  after update on public.orders
  for each row when (old.status = 'pending' and new.status = 'accepted')
  execute function public.generate_delivery_code();

-- 5. Log order status changes
create or replace function public.log_order_status_change()
returns trigger as $$
begin
  insert into public.order_status_history (order_id, status, changed_by)
  values (new.id, new.status, auth.uid());
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_status_change on public.orders;
create trigger on_order_status_change
  after update on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.log_order_status_change();

-- 6. Validate order status transitions (STATE MACHINE)
create or replace function public.validate_order_status()
returns trigger as $$
begin
  -- State machine: allowed transitions
  if old.status = 'pending' and new.status not in ('accepted', 'cancelled') then
    raise exception 'Invalid transition: pending -> %', new.status;
  end if;
  if old.status = 'accepted' and new.status not in ('preparing', 'cancelled') then
    raise exception 'Invalid transition: accepted -> %', new.status;
  end if;
  if old.status = 'preparing' and new.status not in ('picked_up', 'cancelled') then
    raise exception 'Invalid transition: preparing -> %', new.status;
  end if;
  if old.status = 'picked_up' and new.status not in ('on_the_way') then
    raise exception 'Invalid transition: picked_up -> %', new.status;
  end if;
  if old.status = 'on_the_way' and new.status not in ('arrived', 'delivered') then
    raise exception 'Invalid transition: on_the_way -> %', new.status;
  end if;
  if old.status = 'arrived' and new.status not in ('delivered') then
    raise exception 'Invalid transition: arrived -> %', new.status;
  end if;
  if old.status in ('delivered', 'cancelled', 'refunded') then
    raise exception 'Cannot change status from final state: %', old.status;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_status_validate on public.orders;
create trigger on_order_status_validate
  before update on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.validate_order_status();

-- 7. Create notification on order status change
create or replace function public.notify_order_status()
returns trigger as $$
begin
  -- Notify customer
  insert into public.notifications (user_id, title, body, type)
  values (new.customer_id, 'Pedido actualizado', 'Tu pedido ha cambiado a: ' || new.status, 'order');

  -- If driver assigned, notify driver too
  if new.driver_id is not null and new.driver_id is distinct from old.driver_id then
    insert into public.notifications (user_id, title, body, type)
    values (new.driver_id, 'Nuevo pedido asignado', 'Tienes un nuevo pedido para entregar', 'order');
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_notify on public.orders;
create trigger on_order_notify
  after update on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.notify_order_status();

-- 8. Auto-create inventory when product is created
create or replace function public.handle_new_product()
returns trigger as $$
begin
  insert into public.inventory (product_id, quantity)
  values (new.id, 0)
  on conflict (product_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_product_created on public.products;
create trigger on_product_created
  after insert on public.products
  for each row execute function public.handle_new_product();

-- 9. Decrement inventory on order acceptance
create or replace function public.decrement_inventory_on_accept()
returns trigger as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    update public.inventory i
    set quantity = i.quantity - oi.quantity
    from public.order_items oi
    where oi.order_id = new.id and i.product_id = oi.product_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_accept_inventory on public.orders;
create trigger on_order_accept_inventory
  after update on public.orders
  for each row when (old.status = 'pending' and new.status = 'accepted')
  execute function public.decrement_inventory_on_accept();

-- 10. Function: validate and create order (server-side total calculation)
create or replace function public.create_order(
  p_store_id uuid,
  p_product_ids uuid[],
  p_quantities int[],
  p_delivery_address text,
  p_payment_method public.payment_method,
  p_coupon_code text default null,
  p_notes text default null,
  p_tip numeric(10,2) default 0
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_customer_id uuid;
  v_store_record record;
  v_product record;
  v_subtotal numeric(10,2) := 0;
  v_delivery_fee numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_tax numeric(10,2) := 0;
  v_total numeric(10,2) := 0;
  v_order_id uuid;
  v_i int;
  v_product_id uuid;
  v_qty int;
  v_inventory_qty int;
  v_coupon_record record;
begin
  -- Get current user
  v_customer_id := auth.uid();
  if v_customer_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  -- Validate store exists and is open
  select * into v_store_record from public.stores where id = p_store_id;
  if not found then
    raise exception 'La tienda no existe';
  end if;
  if not v_store_record.is_open then
    raise exception 'La tienda está cerrada';
  end if;

  v_delivery_fee := coalesce(v_store_record.delivery_fee, 0);

  -- Validate products and calculate subtotal
  for v_i in 1 .. array_length(p_product_ids, 1) loop
    v_product_id := p_product_ids[v_i];
    v_qty := p_quantities[v_i];

    if v_qty <= 0 then
      raise exception 'Cantidad inválida para producto %', v_product_id;
    end if;

    select * into v_product from public.products where id = v_product_id and is_active = true;
    if not found then
      raise exception 'Producto no encontrado o inactivo: %', v_product_id;
    end if;

    -- Check inventory
    select quantity into v_inventory_qty from public.inventory where product_id = v_product_id;
    if v_inventory_qty is not null and v_inventory_qty < v_qty then
      raise exception 'Stock insuficiente para %', v_product.name;
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_qty);
  end loop;

  if v_subtotal <= 0 then
    raise exception 'El subtotal debe ser mayor a 0';
  end if;

  -- Validate minimum order
  if v_subtotal < v_store_record.min_order then
    raise exception 'El pedido mínimo es $%', v_store_record.min_order;
  end if;

  -- Apply coupon if provided
  if p_coupon_code is not null then
    select * into v_coupon_record from public.promotions
    where code = p_coupon_code and active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
      and (store_id is null or store_id = p_store_id);

    if found then
      if v_coupon_record.max_uses > 0 and v_coupon_record.uses_count >= v_coupon_record.max_uses then
        raise exception 'El cupón ha alcanzado su límite de usos';
      end if;
      if v_subtotal < v_coupon_record.min_order then
        raise exception 'El pedido mínimo para este cupón es $%', v_coupon_record.min_order;
      end if;

      if v_coupon_record.discount_type = 'percentage' then
        v_discount := least(v_subtotal * (v_coupon_record.discount_value / 100), v_subtotal);
      else
        v_discount := least(v_coupon_record.discount_value, v_subtotal);
      end if;

      -- Increment uses
      update public.promotions set uses_count = uses_count + 1 where id = v_coupon_record.id;
    end if;
  end if;

  -- Calculate tax (12% IVA)
  v_tax := round((v_subtotal - v_discount) * 0.12, 2);

  -- Calculate total
  v_total := v_subtotal + v_delivery_fee + v_tax - v_discount + coalesce(p_tip, 0);
  v_total := round(greatest(v_total, 0), 2);

  -- Create order
  insert into public.orders (
    customer_id, store_id, status, payment_method,
    subtotal, delivery_fee, discount, tax, tip, total,
    delivery_address, notes
  ) values (
    v_customer_id, p_store_id, 'pending', p_payment_method,
    v_subtotal, v_delivery_fee, v_discount, v_tax, coalesce(p_tip, 0), v_total,
    p_delivery_address, p_notes
  ) returning id into v_order_id;

  -- Create order items
  for v_i in 1 .. array_length(p_product_ids, 1) loop
    v_product_id := p_product_ids[v_i];
    v_qty := p_quantities[v_i];

    select price, name, emoji into v_product
    from public.products where id = v_product_id;

    insert into public.order_items (order_id, product_id, product_name, product_emoji, quantity, unit_price)
    values (v_order_id, v_product_id, v_product.name, v_product.emoji, v_qty, v_product.price);
  end loop;

  -- Return order data
  return jsonb_build_object(
    'order_id', v_order_id,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'discount', v_discount,
    'tax', v_tax,
    'tip', coalesce(p_tip, 0),
    'total', v_total,
    'status', 'pending'
  );
end;
$$;

-- Nota: Requires Supabase to grant execute:
-- grant execute on function public.create_order to authenticated;
