-- Add data column for metadata (like order_id)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'data'
  ) then
    alter table public.notifications
      add column data jsonb;
  end if;
end $$;

-- Update notify_new_order: only notify store and admin on order creation
create or replace function public.notify_new_order()
returns trigger as $$
declare
  v_store_owner_id uuid;
begin
  -- 1. Notify store owner
  select owner_id into v_store_owner_id
  from public.stores
  where id = new.store_id;

  if v_store_owner_id is not null then
    insert into public.notifications (user_id, title, body, type, data)
    values (v_store_owner_id, 'Nuevo pedido recibido', 'Has recibido un nuevo pedido en tu tienda. Confirma el recibo para comenzar.', 'order', jsonb_build_object('order_id', new.id));
  end if;

  -- 2. Notify all admin users
  insert into public.notifications (user_id, title, body, type, data)
  select id, 'Nuevo pedido solicitado', 'Se ha ingresado un nuevo pedido (' || substring(new.id::text, 1, 8) || ') en el sistema.', 'order', jsonb_build_object('order_id', new.id)
  from public.profiles
  where role = 'admin';

  return new;
end;
$$ language plpgsql security definer;

-- Update notify_order_status: notify customer, driver when assigned, AND notify all online drivers ONLY when the store accepts the order
create or replace function public.notify_order_status()
returns trigger as $$
declare
  v_body text;
begin
  v_body := case new.status
    when 'accepted' then 'Tu pedido fue aceptado por la tienda y pronto iniciará su preparación.'
    when 'preparing' then 'La tienda está armando tu pedido.'
    when 'picked_up' then 'El repartidor ha retirado tu pedido de la tienda.'
    when 'on_the_way' then 'Tu pedido ya está en camino a tu domicilio. ¡Síguelo en el mapa!'
    when 'arrived' then 'El repartidor ha llegado a tu ubicación.'
    when 'delivered' then 'Tu pedido fue entregado con éxito. ¡Gracias por elegir RayoExpress!'
    when 'cancelled' then 'Tu pedido ha sido cancelado.'
    when 'refunded' then 'Tu pedido ha sido reembolsado.'
    else 'Tu pedido ha cambiado al estado: ' || new.status
  end;

  -- 1. Notify customer
  insert into public.notifications (user_id, title, body, type, data)
  values (new.customer_id, 'Estado de tu pedido', v_body, 'order', jsonb_build_object('order_id', new.id));

  -- 2. If driver assigned, notify the assigned driver
  if new.driver_id is not null and (old.driver_id is null or new.driver_id is distinct from old.driver_id) then
    insert into public.notifications (user_id, title, body, type, data)
    values (new.driver_id, 'Nuevo pedido asignado', 'Has sido asignado para entregar el pedido ' || substring(new.id::text, 1, 8), 'order', jsonb_build_object('order_id', new.id));
  end if;

  -- 3. If the store accepts the order (pending -> accepted), dispatch to all online and approved drivers
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.notifications (user_id, title, body, type, data)
    select p.id, 'Pedido disponible', 'Hay un nuevo pedido de ' || (select name from public.stores where id = new.store_id) || ' disponible. ¡Sé el primero en aceptar!', 'order', jsonb_build_object('order_id', new.id)
    from public.profiles p
    join public.drivers d on d.id = p.id
    where p.role = 'driver'
      and d.is_online = true
      and coalesce(d.approved, false) = true;
  end if;

  return new;
end;
$$ language plpgsql security definer;
