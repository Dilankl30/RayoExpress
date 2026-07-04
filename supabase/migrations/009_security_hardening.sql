-- 009_security_hardening.sql
-- Comprehensive RLS hardening: policies faltantes, correcciones de seguridad,
-- funciones SECURITY DEFINER para inserciones que deben ser solo del servidor.

-- ============================================================
-- 1. AUDIT_LOG — prohibir INSERT directo desde el cliente
--    Motivo: WITH CHECK (true) permite a cualquier usuario
--    autenticado escribir registros de auditoría falsos.
-- ============================================================
drop policy if exists "Service can insert audit logs" on public.audit_log;

-- Deniega cualquier INSERT directo; solo se inserta vía función segura.
create policy "audit_log_insert_deny" on public.audit_log
  for insert with check (false);

-- Función SECURITY DEFINER para insertar auditoría desde el servidor.
create or replace function public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_details jsonb default null,
  p_ip_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.audit_log (user_id, action, entity_type, entity_id, details, ip_address)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_details, p_ip_address)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.log_audit_event from anon, public;
grant execute on function public.log_audit_event to authenticated;


-- ============================================================
-- 2. CUSTOMERS — políticas faltantes
--    El cliente ve/su perfil. Admin ve todo.
--    El INSERT lo hace el trigger handle_profile_role_insert.
-- ============================================================
drop policy if exists "customers_select_self" on public.customers;
drop policy if exists "customers_insert_self" on public.customers;
drop policy if exists "customers_update_self" on public.customers;

-- El cliente solo ve su propio registro de customer.
-- Los administradores pueden ver todos.
create policy "customers_select_self" on public.customers
  for select using (
    auth.uid() = id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- El trigger handle_profile_role_insert inserta automáticamente;
-- esta política permite que el trigger (SECURITY DEFINER) pase,
-- y también permite al propio usuario si necesita insertar su registro.
create policy "customers_insert_self" on public.customers
  for insert with check (auth.uid() = id);

-- El usuario puede actualizar sus propios datos (default_address).
create policy "customers_update_self" on public.customers
  for update using (auth.uid() = id)
  with check (auth.uid() = id);


-- ============================================================
-- 3. DRIVERS — políticas faltantes
-- ============================================================
drop policy if exists "drivers_select_self" on public.drivers;
drop policy if exists "drivers_insert_self" on public.drivers;
drop policy if exists "drivers_update_self" on public.drivers;

create policy "drivers_select_self" on public.drivers
  for select using (
    auth.uid() = id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "drivers_insert_self" on public.drivers
  for insert with check (auth.uid() = id);

create policy "drivers_update_self" on public.drivers
  for update using (auth.uid() = id)
  with check (auth.uid() = id);


-- ============================================================
-- 4. DRIVER_DOCUMENTS — políticas faltantes
--    driver_id = auth.uid() porque drivers(id) = profiles(id).
-- ============================================================
drop policy if exists "driver_documents_select_self" on public.driver_documents;
drop policy if exists "driver_documents_insert_self" on public.driver_documents;
drop policy if exists "driver_documents_admin_all" on public.driver_documents;

create policy "driver_documents_select_self" on public.driver_documents
  for select using (
    driver_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "driver_documents_insert_self" on public.driver_documents
  for insert with check (driver_id = auth.uid());

create policy "driver_documents_admin_all" on public.driver_documents
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- 5. CATEGORIES — políticas faltantes
--    Cualquiera puede leer categorías. Solo admin puede modificar.
-- ============================================================
drop policy if exists "categories_select_all" on public.categories;
drop policy if exists "categories_admin_all" on public.categories;

create policy "categories_select_all" on public.categories
  for select using (true);

create policy "categories_admin_all" on public.categories
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- 6. INVENTORY — políticas faltantes
--    El dueño de la tienda ve/actualiza su inventario.
--    Admin puede todo.
--    Ruta: inventory → product → store → owner
-- ============================================================
drop policy if exists "inventory_select_store" on public.inventory;
drop policy if exists "inventory_update_store" on public.inventory;
drop policy if exists "inventory_admin_all" on public.inventory;

create policy "inventory_select_store" on public.inventory
  for select using (
    exists (
      select 1 from public.products p
      join public.stores s on s.id = p.store_id
      where p.id = product_id and s.owner_id = auth.uid()
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "inventory_update_store" on public.inventory
  for update using (
    exists (
      select 1 from public.products p
      join public.stores s on s.id = p.store_id
      where p.id = product_id and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products p
      join public.stores s on s.id = p.store_id
      where p.id = product_id and s.owner_id = auth.uid()
    )
  );

create policy "inventory_admin_all" on public.inventory
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- 7. PROMOTIONS — políticas incompletas (solo SELECT existía)
--    Store owner crea/edita sus promociones. Admin todo.
-- ============================================================
drop policy if exists "promotions_select_active" on public.promotions;

create policy "promotions_select_visible" on public.promotions
  for select using (
    active = true
    or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "promotions_insert_store" on public.promotions;
create policy "promotions_insert_store" on public.promotions
  for insert with check (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

drop policy if exists "promotions_update_store" on public.promotions;
create policy "promotions_update_store" on public.promotions
  for update using (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

drop policy if exists "promotions_admin_all" on public.promotions;
create policy "promotions_admin_all" on public.promotions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- 8. ORDER_STATUS_HISTORY — políticas faltantes
--    Solo SELECT para los involucrados en la orden.
--    INSERT solo desde el trigger (log_order_status_change).
-- ============================================================
drop policy if exists "order_status_history_select" on public.order_status_history;

create policy "order_status_history_select" on public.order_status_history
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
      and (
        o.customer_id = auth.uid()
        or o.driver_id = auth.uid()
        or exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid())
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
    )
  );

-- Denegar INSERT directo desde el cliente; solo el trigger debe insertar.
drop policy if exists "order_status_history_insert_deny" on public.order_status_history;
create policy "order_status_history_insert_deny" on public.order_status_history
  for insert with check (false);


-- ============================================================
-- 9. DELIVERY_CODES — políticas faltantes
--    SELECT solo para customer/driver/admin de la orden.
--    INSERT solo desde el trigger (generate_delivery_code).
-- ============================================================
drop policy if exists "delivery_codes_select" on public.delivery_codes;

create policy "delivery_codes_select_participant" on public.delivery_codes
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
      and (
        o.customer_id = auth.uid()
        or o.driver_id = auth.uid()
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
    )
  );

-- Denegar INSERT directo; solo el trigger generate_delivery_code.
drop policy if exists "delivery_codes_insert_deny" on public.delivery_codes;
create policy "delivery_codes_insert_deny" on public.delivery_codes
  for insert with check (false);


-- ============================================================
-- 10. STORE_SCHEDULES — políticas faltantes
--     Cualquiera lee horarios. El dueño de la tienda administra.
--     Admin puede todo.
-- ============================================================
drop policy if exists "store_schedules_select_all" on public.store_schedules;

create policy "store_schedules_select_all" on public.store_schedules
  for select using (true);

drop policy if exists "store_schedules_insert_owner" on public.store_schedules;
create policy "store_schedules_insert_owner" on public.store_schedules
  for insert with check (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

drop policy if exists "store_schedules_update_owner" on public.store_schedules;
create policy "store_schedules_update_owner" on public.store_schedules
  for update using (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

drop policy if exists "store_schedules_delete_owner" on public.store_schedules;
create policy "store_schedules_delete_owner" on public.store_schedules
  for delete using (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

drop policy if exists "store_schedules_admin_all" on public.store_schedules;
create policy "store_schedules_admin_all" on public.store_schedules
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- 11. NOTIFICATIONS — prohibir INSERT directo desde el cliente
--     Solo el servidor debe crear notificaciones vía trigger/función.
-- ============================================================
drop policy if exists "notifications_select_self" on public.notifications;
drop policy if exists "notifications_update_self" on public.notifications;

create policy "notifications_select_self" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_update_self" on public.notifications
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notifications_insert_deny" on public.notifications;
create policy "notifications_insert_deny" on public.notifications
  for insert with check (false);

-- Función SECURITY DEFINER para crear notificaciones desde el servidor.
create or replace function public.send_notification(
  p_user_id uuid,
  p_title text,
  p_body text default null,
  p_type text default 'info'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, title, body, type)
  values (p_user_id, p_title, p_body, p_type)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.send_notification from anon, public;
grant execute on function public.send_notification to authenticated;


-- ============================================================
-- 12. CHATS — corregir RLS
--     La migración 006 verifica `chats.store_id = auth.uid()`
--     pero store_id es un UUID de tienda, no de perfil.
--     La verificación correcta es contra el dueño de la tienda.
-- ============================================================
drop policy if exists "Users can view their own chats" on public.chats;
drop policy if exists "Users can insert chats" on public.chats;
drop policy if exists "chats_select" on public.chats;

create policy "chats_select_participant" on public.chats
  for select using (
    auth.uid() = customer_id
    or auth.uid() = driver_id
    or (store_id is not null and exists (
      select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()
    ))
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "chats_insert_customer" on public.chats
  for insert with check (auth.uid() = customer_id);


-- ============================================================
-- 13. MESSAGES — corregir RLS (mismo problema que chats)
-- ============================================================
drop policy if exists "Users can view messages in their chats" on public.messages;
drop policy if exists "Users can insert messages in their chats" on public.messages;
drop policy if exists "messages_select" on public.messages;
drop policy if exists "messages_insert" on public.messages;

create policy "messages_select_participant" on public.messages
  for select using (
    exists (
      select 1 from public.chats c
      where c.id = chat_id
      and (
        c.customer_id = auth.uid()
        or c.driver_id = auth.uid()
        or (c.store_id is not null and exists (
          select 1 from public.stores s where s.id = c.store_id and s.owner_id = auth.uid()
        ))
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
    )
  );

create policy "messages_insert_participant" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.chats c
      where c.id = chat_id
      and (
        c.customer_id = auth.uid()
        or c.driver_id = auth.uid()
        or (c.store_id is not null and exists (
          select 1 from public.stores s where s.id = c.store_id and s.owner_id = auth.uid()
        ))
      )
    )
  );


-- ============================================================
-- 14. DELIVERY_EVIDENCE — agregar UPDATE/DELETE para admin
-- ============================================================
drop policy if exists "delivery_evidence_update_admin" on public.delivery_evidence;
create policy "delivery_evidence_update_admin" on public.delivery_evidence
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "delivery_evidence_delete_admin" on public.delivery_evidence;
create policy "delivery_evidence_delete_admin" on public.delivery_evidence
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- 15. CHATS updated_at trigger
--     La migración 006 agregó la columna updated_at pero no el trigger.
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'chats_updated_at') then
    create trigger chats_updated_at before update on public.chats
      for each row execute function public.handle_updated_at();
  end if;
end $$;
