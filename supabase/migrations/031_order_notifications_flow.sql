-- Trigger for new order notifications
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
    insert into public.notifications (user_id, title, body, type)
    values (v_store_owner_id, 'Nuevo pedido recibido', 'Has recibido un nuevo pedido en tu tienda. Confirma el recibo para comenzar.', 'order');
  end if;

  -- 2. Notify all admin users
  insert into public.notifications (user_id, title, body, type)
  select id, 'Nuevo pedido solicitado', 'Se ha ingresado un nuevo pedido (' || substring(new.id::text, 1, 8) || ') en el sistema.', 'order'
  from public.profiles
  where role = 'admin';

  -- 3. Notify all online and approved drivers
  insert into public.notifications (user_id, title, body, type)
  select p.id, 'Pedido disponible', 'Hay un pedido disponible para entrega. ¡El primero en aceptar lo toma!', 'order'
  from public.profiles p
  join public.drivers d on d.id = p.id
  where p.role = 'driver'
    and d.is_online = true
    and coalesce(d.approved, false) = true;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_created_notify on public.orders;
create trigger on_order_created_notify
  after insert on public.orders
  for each row
  execute function public.notify_new_order();

-- Custom friendly notifications on order status updates
create or replace function public.notify_order_status()
returns trigger as $$
declare
  v_body text;
begin
  -- Define custom human-readable messages for status updates
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

  -- Notify customer
  insert into public.notifications (user_id, title, body, type)
  values (new.customer_id, 'Estado de tu pedido', v_body, 'order');

  -- If driver assigned, notify driver too
  if new.driver_id is not null and (old.driver_id is null or new.driver_id is distinct from old.driver_id) then
    insert into public.notifications (user_id, title, body, type)
    values (new.driver_id, 'Nuevo pedido asignado', 'Has sido asignado para entregar el pedido ' || substring(new.id::text, 1, 8), 'order');
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_notify on public.orders;
create trigger on_order_notify
  after update on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.notify_order_status();
