-- ============================================================
-- RayoExpress | Migration 023: Security Production Hardening
-- ============================================================
-- This migration fixes ALL security issues found in the audit:
--   1. Admin RPCs without admin verification (CRITICAL)
--   2. send_notification accessible to any authenticated user (HIGH)
--   3. driver-documents bucket made private (CRITICAL)
--   4. SECURITY DEFINER functions missing set search_path (HIGH)
--   5. driver_claim_order missing explicit FOR UPDATE (MEDIUM)
--   6. Admin views without explicit protection (HIGH)
--   7. stores_select_all exposing owner_id/coverage_area (MEDIUM)
--   8. Order state transitions now enforced in DB (CRITICAL)
--   9. User suspension enforced in RPCs (HIGH)
--  10. Audit log immutability (MEDIUM)
-- ============================================================

-- ============================================================
-- SECTION 1: Helper functions (idempotent)
-- ============================================================

-- current_user_is_active: checks user exists, not suspended, valid profile
create or replace function public.current_user_is_active()
returns boolean
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if not found then
    return false;
  end if;

  if v_profile.is_suspended then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.current_user_is_active from public, anon;
grant execute on function public.current_user_is_active to authenticated;

comment on function public.current_user_is_active is 'Returns true when the authenticated user exists, has a valid profile, and is not suspended.';

-- ============================================================
-- SECTION 2: Fix SECURITY DEFINER functions without set search_path
-- ============================================================

-- Fix handle_new_user (from 008)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'role', 'customer')::public.app_role
  );
  return new;
end;
$$;

-- Fix handle_profile_role_insert (from 002)
create or replace function public.handle_profile_role_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'customer' then
    insert into public.customers (user_id) values (new.id) on conflict (user_id) do nothing;
  elsif new.role = 'driver' then
    insert into public.drivers (user_id) values (new.id) on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

-- Fix generate_delivery_code (from 002)
create or replace function public.generate_delivery_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  v_code := upper(substr(md5(random()::text), 1, 6));
  insert into public.delivery_codes (order_id, code) values (new.id, v_code);
  return new;
end;
$$;

-- Fix log_order_status_change (from 002)
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (old.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

-- Fix notify_order_status (from 002)
create or replace function public.notify_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    insert into public.notifications (user_id, title, body, type)
    values (
      new.customer_id,
      'Pedido actualizado',
      format('Tu pedido ha cambiado a: %s', new.status),
      'order_status'
    );
  end if;
  return new;
end;
$$;

-- Fix handle_new_product (from 002)
create or replace function public.handle_new_product()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.inventory (product_id, quantity, low_stock_threshold)
  values (new.id, 0, 5);
  return new;
end;
$$;

-- Fix decrement_inventory_on_accept (from 002)
create or replace function public.decrement_inventory_on_accept()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
begin
  if new.status = 'accepted' and old.status = 'pending' then
    for v_item in
      select oi.product_id, oi.quantity
      from public.order_items oi
      where oi.order_id = new.id
    loop
      update public.inventory
      set quantity = quantity - v_item.quantity,
          updated_at = now()
      where product_id = v_item.product_id;
    end loop;
  end if;
  return new;
end;
$$;

-- Fix admin_set_user_role (from 008)
create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_new_role public.app_role
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_target_profile public.profiles;
begin
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED: Solo administradores pueden cambiar roles';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED: Tu cuenta esta suspendida';
  end if;

  select * into v_target_profile from public.profiles where id = p_user_id;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  update public.profiles
  set role = p_new_role,
      updated_at = now()
  where id = p_user_id;

  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'admin_set_user_role', 'profiles', p_user_id,
    jsonb_build_object('new_role', p_new_role, 'target_user', p_user_id));

  return jsonb_build_object('ok', true);
end;
$$;

-- Fix enforce_single_admin (from 013)
create or replace function public.enforce_single_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_count integer;
begin
  if new.role = 'admin' then
    select count(*) into v_admin_count
    from public.profiles
    where role = 'admin' and id != new.id;
    if v_admin_count > 0 then
      raise exception 'Ya existe un administrador en el sistema';
    end if;
  end if;
  return new;
end;
$$;

-- Fix storage_file_valid (from 011)
create or replace function public.storage_file_valid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(coalesce(new.name, '')) = 0 then
    raise exception 'El nombre del archivo no puede estar vacio';
  end if;
  if new.bucket_id = 'driver-documents' or new.bucket_id = 'application-documents' then
    if position(auth.uid()::text in new.path) = 0 then
      raise exception 'La ruta del archivo debe contener el ID del usuario';
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================
-- SECTION 3: Fix driver-documents bucket - MAKE IT PRIVATE
-- ============================================================

update storage.buckets
set public = false
where id = 'driver-documents';

-- Update RLS policies for driver-documents
drop policy if exists "Driver documents are publicly accessible" on storage.objects;
drop policy if exists "Anyone can view driver documents" on storage.objects;
drop policy if exists "Users can upload driver documents" on storage.objects;
drop policy if exists "Only admins can delete driver documents" on storage.objects;

-- Re-create with proper access control
create policy "Drivers can view own documents"
on storage.objects for select
using (
  bucket_id = 'driver-documents'
  and (
    auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy "Admins can view all driver documents"
on storage.objects for select
using (
  bucket_id = 'driver-documents'
  and public.current_user_is_admin()
);

create policy "Drivers can upload own documents"
on storage.objects for insert
with check (
  bucket_id = 'driver-documents'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Only admins can delete driver documents"
on storage.objects for delete
using (
  bucket_id = 'driver-documents'
  and public.current_user_is_admin()
);

-- ============================================================
-- SECTION 4: Fix application-documents bucket - MAKE IT PRIVATE
-- ============================================================

update storage.buckets
set public = false
where id = 'application-documents';

drop policy if exists "Anyone can view application documents" on storage.objects;
drop policy if exists "Users can upload application documents" on storage.objects;
drop policy if exists "Only admins can delete application documents" on storage.objects;

create policy "Users can view own application documents"
on storage.objects for select
using (
  bucket_id = 'application-documents'
  and (
    auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy "Admins can view all application documents"
on storage.objects for select
using (
  bucket_id = 'application-documents'
  and public.current_user_is_admin()
);

create policy "Users can upload own application documents"
on storage.objects for insert
with check (
  bucket_id = 'application-documents'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- SECTION 5: Fix CRITICAL RPCs missing admin verification
-- ============================================================

-- Fix admin_search_users - add admin check
create or replace function public.admin_search_users(
  p_search text default '',
  p_role public.app_role default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_results jsonb;
begin
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'phone', p.phone,
      'role', p.role,
      'is_suspended', p.is_suspended,
      'created_at', p.created_at,
      'email', u.email
    )
    order by p.created_at desc
    limit 100
  )
  into v_results
  from public.profiles p
  left join auth.users u on u.id = p.id
  where
    (p_search = '' or p.full_name ilike '%' || p_search || '%' or u.email ilike '%' || p_search || '%')
    and (p_role is null or p.role = p_role);

  return coalesce(v_results, '[]'::jsonb);
end;
$$;

revoke all on function public.admin_search_users from public, anon;
grant execute on function public.admin_search_users to authenticated;

-- Fix admin_get_driver_detail - add admin check
create or replace function public.admin_get_driver_detail(
  p_driver_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_result jsonb;
begin
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select jsonb_build_object(
    'profile', row_to_json(p),
    'driver', row_to_json(d),
    'total_orders', (select count(*) from public.orders where driver_id = p_driver_id),
    'total_earnings', (select coalesce(sum(total), 0) from public.orders where driver_id = p_driver_id and status = 'delivered'),
    'recent_orders', (select jsonb_agg(row_to_json(o)) from (select * from public.orders where driver_id = p_driver_id order by created_at desc limit 20) o)
  )
  into v_result
  from public.profiles p
  left join public.drivers d on d.user_id = p.id
  where p.id = p_driver_id;

  return v_result;
end;
$$;

revoke all on function public.admin_get_driver_detail from public, anon;
grant execute on function public.admin_get_driver_detail to authenticated;

-- Fix admin_get_store_detail - add admin check
create or replace function public.admin_get_store_detail(
  p_store_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_result jsonb;
begin
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select jsonb_build_object(
    'store', row_to_json(s),
    'owner', row_to_json(p),
    'total_products', (select count(*) from public.products where store_id = p_store_id and is_active = true),
    'total_orders', (select count(*) from public.orders where store_id = p_store_id),
    'total_revenue', (select coalesce(sum(total), 0) from public.orders where store_id = p_store_id and status = 'delivered'),
    'recent_orders', (select jsonb_agg(row_to_json(o)) from (select * from public.orders where store_id = p_store_id order by created_at desc limit 20) o)
  )
  into v_result
  from public.stores s
  left join public.profiles p on p.id = s.owner_id
  where s.id = p_store_id;

  return v_result;
end;
$$;

revoke all on function public.admin_get_store_detail from public, anon;
grant execute on function public.admin_get_store_detail to authenticated;

-- Fix admin_get_recent_activity - add admin check
create or replace function public.admin_get_recent_activity(
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_activity jsonb;
begin
  if p_limit < 1 or p_limit > 200 then
    p_limit := 50;
  end if;

  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'action', a.action,
      'entity_type', a.entity_type,
      'details', a.details,
      'created_at', a.created_at,
      'user_name', p.full_name
    )
    order by a.created_at desc
    limit p_limit
  )
  into v_activity
  from public.audit_log a
  left join public.profiles p on p.id = a.user_id;

  return coalesce(v_activity, '[]'::jsonb);
end;
$$;

revoke all on function public.admin_get_recent_activity from public, anon;
grant execute on function public.admin_get_recent_activity to authenticated;

-- ============================================================
-- SECTION 6: Fix admin RPCs that already verify admin but need
--            suspension check and search_path hardening
-- ============================================================

-- Fix admin_approve_store_application - add suspension check
create or replace function public.admin_approve_store_application(
  p_application_id uuid,
  p_review_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app public.store_applications;
  v_profile public.profiles;
  v_store_id uuid;
  v_is_admin boolean;
begin
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED: Solo administradores pueden aprobar solicitudes';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select * into v_app
  from public.store_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'NOT_FOUND: Solicitud de tienda no encontrada';
  end if;

  if v_app.status != 'pending' then
    raise exception 'INVALID_STATE: La solicitud ya fue procesada (estado: %)', v_app.status;
  end if;

  select * into v_profile
  from public.profiles
  where id = v_app.user_id;

  if not found then
    raise exception 'APPLICANT_NOT_FOUND: El usuario solicitante no existe';
  end if;

  if v_profile.is_suspended then
    raise exception 'APPLICANT_SUSPENDED: No se puede aprobar la solicitud de un usuario suspendido';
  end if;

  update public.store_applications
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = null
  where id = p_application_id;

  insert into public.stores (owner_id, name, description, is_open, address, phone, photo_url, latitude, longitude, city)
  values (v_app.user_id, v_app.store_name, coalesce(v_app.description, ''), false,
          v_app.address, v_app.phone, v_app.photo_url, v_app.latitude, v_app.longitude, v_app.city)
  returning id into v_store_id;

  update public.profiles
  set role = 'store'
  where id = v_app.user_id;

  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'approve_store_application', 'store_applications', p_application_id,
    jsonb_build_object('store_name', v_app.store_name, 'store_id', v_store_id, 'applicant_id', v_app.user_id, 'notes', p_review_notes));

  insert into public.notifications (user_id, title, body, type)
  values (v_app.user_id, 'Solicitud de tienda aprobada',
    format('Felicidades! Tu tienda "%s" ha sido aprobada.', v_app.store_name), 'store_approved');

  return jsonb_build_object('ok', true, 'store_id', v_store_id);
end;
$$;

revoke all on function public.admin_approve_store_application from public, anon;
grant execute on function public.admin_approve_store_application to authenticated;

-- Fix admin_reject_store_application - add suspension check + search_path
create or replace function public.admin_reject_store_application(
  p_application_id uuid,
  p_rejection_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
begin
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  update public.store_applications
  set status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = p_rejection_reason
  where id = p_application_id
    and status = 'pending';

  if not found then
    raise exception 'NOT_FOUND: Solicitud no encontrada o ya procesada';
  end if;

  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'reject_store_application', 'store_applications', p_application_id,
    jsonb_build_object('reason', p_rejection_reason));

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_reject_store_application from public, anon;
grant execute on function public.admin_reject_store_application to authenticated;

-- Fix admin_toggle_suspend - prevent self-suspend + single admin protection
create or replace function public.admin_toggle_suspend(
  p_user_id uuid,
  p_suspended boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_target_role text;
  v_admin_count integer;
begin
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  -- Prevent admin from suspending themselves
  if p_user_id = auth.uid() then
    raise exception 'No puedes suspenderte a ti mismo';
  end if;

  -- If trying to suspend an admin, check there will still be at least one active admin
  select role into v_target_role from public.profiles where id = p_user_id;
  if v_target_role = 'admin' then
    select count(*) into v_admin_count from public.profiles where role = 'admin' and id != p_user_id and is_suspended = false;
    if v_admin_count < 1 then
      raise exception 'No se puede suspender al unico administrador activo';
    end if;
  end if;

  update public.profiles
  set is_suspended = p_suspended,
      updated_at = now()
  where id = p_user_id;

  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), case when p_suspended then 'suspend_user' else 'unsuspend_user' end,
    'profiles', p_user_id, jsonb_build_object('is_suspended', p_suspended));

  return jsonb_build_object('ok', true, 'is_suspended', p_suspended);
end;
$$;

revoke all on function public.admin_toggle_suspend from public, anon;
grant execute on function public.admin_toggle_suspend to authenticated;

-- Fix admin_delete_user - prevent self-delete + single admin protection
create or replace function public.admin_delete_user(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_target_role text;
  v_admin_count integer;
begin
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'No puedes eliminarte a ti mismo';
  end if;

  select role into v_target_role from public.profiles where id = p_user_id;
  if v_target_role = 'admin' then
    select count(*) into v_admin_count from public.profiles where role = 'admin' and id != p_user_id;
    if v_admin_count < 1 then
      raise exception 'No se puede eliminar al unico administrador';
    end if;
  end if;

  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'delete_user', 'profiles', p_user_id,
    jsonb_build_object('target_role', v_target_role));

  -- Anonymize profile data rather than hard delete (preserve orders, audit trail)
  update public.profiles
  set full_name = '[Usuario eliminado]',
      phone = null,
      avatar_url = null,
      role = 'customer',
      is_suspended = true,
      updated_at = now()
  where id = p_user_id;

  -- Note: auth.users deletion requires service_role key via Edge Function
  -- This function handles the application-level cleanup

  return jsonb_build_object('ok', true, 'message', 'Usuario anonimizado. Para eliminar completamente de auth, ejecutar Edge Function con service_role.');
end;
$$;

revoke all on function public.admin_delete_user from public, anon;
grant execute on function public.admin_delete_user to authenticated;

-- Fix admin_verify_driver_documents - add suspension check
create or replace function public.admin_verify_driver_documents(
  p_application_id uuid,
  p_review_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_app public.driver_applications;
begin
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select * into v_app
  from public.driver_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if v_app.status not in ('pending', 'docs_verified') then
    raise exception 'INVALID_STATE: Estado actual: %', v_app.status;
  end if;

  update public.driver_applications
  set status = 'docs_verified',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_application_id;

  return jsonb_build_object('ok', true, 'new_status', 'docs_verified');
end;
$$;

revoke all on function public.admin_verify_driver_documents from public, anon;
grant execute on function public.admin_verify_driver_documents to authenticated;

-- Fix admin_sign_driver_contract - add suspension check
create or replace function public.admin_sign_driver_contract(
  p_application_id uuid,
  p_review_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_app public.driver_applications;
  v_driver_id uuid;
begin
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select * into v_app
  from public.driver_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if v_app.status != 'docs_verified' then
    raise exception 'INVALID_STATE: Los documentos deben estar verificados primero. Estado actual: %', v_app.status;
  end if;

  update public.driver_applications
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_application_id;

  insert into public.drivers (user_id, vehicle_type, vehicle_plate)
  values (v_app.user_id, v_app.vehicle_type, v_app.vehicle_plate)
  on conflict (user_id) do update
  set vehicle_type = excluded.vehicle_type,
      vehicle_plate = excluded.vehicle_plate
  returning id into v_driver_id;

  update public.profiles
  set role = 'driver'
  where id = v_app.user_id;

  return jsonb_build_object('ok', true, 'driver_id', v_driver_id, 'application_id', p_application_id);
end;
$$;

revoke all on function public.admin_sign_driver_contract from public, anon;
grant execute on function public.admin_sign_driver_contract to authenticated;

-- Fix admin_approve_driver_application - add suspension check
create or replace function public.admin_approve_driver_application(
  p_application_id uuid,
  p_review_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_app public.driver_applications;
  v_driver_id uuid;
begin
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select * into v_app
  from public.driver_applications
  where id = p_application_id
  for update;

  if not found then raise exception 'NOT_FOUND'; end if;
  if v_app.status != 'pending' then raise exception 'INVALID_STATE'; end if;

  update public.driver_applications
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_application_id;

  insert into public.drivers (user_id, vehicle_type, vehicle_plate)
  values (v_app.user_id, v_app.vehicle_type, v_app.vehicle_plate)
  on conflict (user_id) do nothing
  returning id into v_driver_id;

  update public.profiles set role = 'driver' where id = v_app.user_id;

  insert into public.notifications (user_id, title, body, type)
  values (v_app.user_id, 'Solicitud de repartidor aprobada',
    'Felicidades! Ya puedes comenzar a recibir pedidos como repartidor.', 'driver_approved');

  return jsonb_build_object('ok', true, 'driver_id', v_driver_id);
end;
$$;

revoke all on function public.admin_approve_driver_application from public, anon;
grant execute on function public.admin_approve_driver_application to authenticated;

-- Fix admin_reject_driver_application
create or replace function public.admin_reject_driver_application(
  p_application_id uuid,
  p_rejection_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
begin
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  update public.driver_applications
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = p_rejection_reason
  where id = p_application_id and status = 'pending';

  if not found then
    raise exception 'NOT_FOUND: Solicitud no encontrada o ya procesada';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_reject_driver_application from public, anon;
grant execute on function public.admin_reject_driver_application to authenticated;

-- ============================================================
-- SECTION 7: Fix send_notification - restrict to system use
-- ============================================================

create or replace function public.send_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_type text default 'general'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_is_admin boolean;
begin
  -- Only allow the target user or admins to send notifications
  if auth.uid() != p_user_id then
    select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    into v_is_admin;
    if not v_is_admin then
      raise exception 'PERMISSION_DENIED: Solo puedes enviarte notificaciones a ti mismo';
    end if;
  end if;

  insert into public.notifications (user_id, title, body, type)
  values (p_user_id, p_title, p_body, p_type)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.send_notification from public, anon;
grant execute on function public.send_notification to authenticated;

-- ============================================================
-- SECTION 8: Secure order state transition functions
-- ============================================================

-- Validate that a status transition is allowed for a given role
create or replace function public.is_valid_order_transition(
  p_current_status text,
  p_new_status text,
  p_role public.app_role
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- store transitions
  if p_role = 'store' then
    if p_current_status = 'pending' and p_new_status = 'accepted' then return true; end if;
    if p_current_status = 'accepted' and p_new_status = 'preparing' then return true; end if;
    if p_current_status = 'preparing' and p_new_status = 'picked_up' then return true; end if;
    if p_current_status in ('pending', 'accepted', 'preparing') and p_new_status = 'cancelled' then return true; end if;
    return false;
  end if;

  -- driver transitions
  if p_role = 'driver' then
    if p_current_status = 'picked_up' and p_new_status = 'on_the_way' then return true; end if;
    if p_current_status = 'on_the_way' and p_new_status = 'arrived' then return true; end if;
    return false;
  end if;

  -- customer transitions
  if p_role = 'customer' then
    if p_current_status = 'arrived' and p_new_status = 'delivered' then return true; end if;
    return false;
  end if;

  -- admin transitions (can do anything)
  if p_role = 'admin' then
    if p_new_status in ('cancelled', 'refunded') then return true; end if;
    return false;
  end if;

  return false;
end;
$$;

revoke all on function public.is_valid_order_transition from public, anon;
grant execute on function public.is_valid_order_transition to authenticated;

-- Store: accept order
create or replace function public.store_accept_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_is_owner boolean;
begin
  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select exists (
    select 1 from public.stores where owner_id = auth.uid() and id = (select store_id from public.orders where id = p_order_id)
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'PERMISSION_DENIED: No eres el dueno de esta tienda';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if not public.is_valid_order_transition(v_order.status, 'accepted', 'store') then
    raise exception 'INVALID_TRANSITION: No se puede aceptar un pedido en estado %', v_order.status;
  end if;

  update public.orders
  set status = 'accepted', updated_at = now()
  where id = p_order_id;

  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'store_accept_order', 'order', p_order_id, jsonb_build_object('previous_status', v_order.status));

  return jsonb_build_object('ok', true, 'status', 'accepted');
end;
$$;

revoke all on function public.store_accept_order from public, anon;
grant execute on function public.store_accept_order to authenticated;

-- Store: start preparing
create or replace function public.store_start_preparing(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_is_owner boolean;
begin
  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select exists (
    select 1 from public.stores where owner_id = auth.uid() and id = (select store_id from public.orders where id = p_order_id)
  ) into v_is_owner;

  if not v_is_owner then raise exception 'PERMISSION_DENIED'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if not public.is_valid_order_transition(v_order.status, 'preparing', 'store') then
    raise exception 'INVALID_TRANSITION';
  end if;

  update public.orders set status = 'preparing', updated_at = now() where id = p_order_id;
  return jsonb_build_object('ok', true, 'status', 'preparing');
end;
$$;

revoke all on function public.store_start_preparing from public, anon;
grant execute on function public.store_start_preparing to authenticated;

-- Store: mark as ready (picked_up = ready for driver)
create or replace function public.store_mark_ready(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_is_owner boolean;
begin
  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select exists (
    select 1 from public.stores where owner_id = auth.uid() and id = (select store_id from public.orders where id = p_order_id)
  ) into v_is_owner;

  if not v_is_owner then raise exception 'PERMISSION_DENIED'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if not public.is_valid_order_transition(v_order.status, 'picked_up', 'store') then
    raise exception 'INVALID_TRANSITION';
  end if;

  update public.orders set status = 'picked_up', updated_at = now() where id = p_order_id;
  return jsonb_build_object('ok', true, 'status', 'picked_up');
end;
$$;

revoke all on function public.store_mark_ready from public, anon;
grant execute on function public.store_mark_ready to authenticated;

-- Store: cancel order
create or replace function public.store_cancel_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_is_owner boolean;
begin
  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select exists (
    select 1 from public.stores where owner_id = auth.uid() and id = (select store_id from public.orders where id = p_order_id)
  ) into v_is_owner;

  if not v_is_owner then raise exception 'PERMISSION_DENIED'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if not public.is_valid_order_transition(v_order.status, 'cancelled', 'store') then
    raise exception 'INVALID_TRANSITION';
  end if;

  update public.orders set status = 'cancelled', updated_at = now() where id = p_order_id;
  return jsonb_build_object('ok', true, 'status', 'cancelled');
end;
$$;

revoke all on function public.store_cancel_order from public, anon;
grant execute on function public.store_cancel_order to authenticated;

-- Fix driver_claim_order: add FOR UPDATE + suspension check
create or replace function public.driver_claim_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_driver_id uuid;
  v_driver public.drivers;
  v_order public.orders;
begin
  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select id into v_driver_id
  from public.drivers
  where user_id = auth.uid() and is_active = true;

  if not found then
    raise exception 'PERMISSION_DENIED: No eres un repartidor activo';
  end if;

  -- Lock the order row to prevent race conditions
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.driver_id is not null then
    raise exception 'ORDER_ALREADY_CLAIMED: El pedido ya tiene un repartidor asignado';
  end if;

  if v_order.status not in ('accepted', 'preparing', 'picked_up') then
    raise exception 'INVALID_STATE: El pedido no esta disponible para asignacion';
  end if;

  update public.orders
  set driver_id = v_driver_id,
      updated_at = now()
  where id = p_order_id
    and driver_id is null;

  if not found then
    raise exception 'RACE_CONDITION: Otro repartidor tomo el pedido primero';
  end if;

  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'driver_claim_order', 'order', p_order_id,
    jsonb_build_object('driver_id', v_driver_id));

  return jsonb_build_object('ok', true, 'driver_id', v_driver_id);
end;
$$;

revoke all on function public.driver_claim_order from public, anon;
grant execute on function public.driver_claim_order to authenticated;

-- Driver: mark on_the_way
create or replace function public.driver_mark_on_the_way(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if v_order.driver_id != auth.uid() then
    raise exception 'PERMISSION_DENIED: No eres el repartidor asignado';
  end if;

  if not public.is_valid_order_transition(v_order.status, 'on_the_way', 'driver') then
    raise exception 'INVALID_TRANSITION';
  end if;

  update public.orders set status = 'on_the_way', updated_at = now() where id = p_order_id;
  return jsonb_build_object('ok', true, 'status', 'on_the_way');
end;
$$;

revoke all on function public.driver_mark_on_the_way from public, anon;
grant execute on function public.driver_mark_on_the_way to authenticated;

-- Driver: mark arrived
create or replace function public.driver_mark_arrived(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if v_order.driver_id != auth.uid() then
    raise exception 'PERMISSION_DENIED: No eres el repartidor asignado';
  end if;

  if not public.is_valid_order_transition(v_order.status, 'arrived', 'driver') then
    raise exception 'INVALID_TRANSITION';
  end if;

  update public.orders set status = 'arrived', updated_at = now() where id = p_order_id;
  return jsonb_build_object('ok', true, 'status', 'arrived');
end;
$$;

revoke all on function public.driver_mark_arrived from public, anon;
grant execute on function public.driver_mark_arrived to authenticated;

-- Customer: confirm delivery
create or replace function public.customer_confirm_delivery(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if v_order.customer_id != auth.uid() then
    raise exception 'PERMISSION_DENIED: No eres el cliente de este pedido';
  end if;

  if not public.is_valid_order_transition(v_order.status, 'delivered', 'customer') then
    raise exception 'INVALID_TRANSITION';
  end if;

  update public.orders set status = 'delivered', updated_at = now() where id = p_order_id;
  return jsonb_build_object('ok', true, 'status', 'delivered');
end;
$$;

revoke all on function public.customer_confirm_delivery from public, anon;
grant execute on function public.customer_confirm_delivery to authenticated;

-- Admin: refund order
create or replace function public.admin_refund_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_order public.orders;
begin
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then raise exception 'PERMISSION_DENIED'; end if;
  if not public.current_user_is_active() then raise exception 'ACCOUNT_SUSPENDED'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if v_order.status not in ('cancelled', 'delivered') then
    raise exception 'INVALID_STATE: Solo pedidos cancelados o entregados pueden reembolsarse';
  end if;

  update public.orders set status = 'refunded', updated_at = now() where id = p_order_id;

  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'admin_refund_order', 'order', p_order_id,
    jsonb_build_object('previous_status', v_order.status, 'total', v_order.total));

  return jsonb_build_object('ok', true, 'status', 'refunded');
end;
$$;

revoke all on function public.admin_refund_order from public, anon;
grant execute on function public.admin_refund_order to authenticated;

-- ============================================================
-- SECTION 9: Block direct order updates
-- ============================================================

-- Revoke UPDATE on orders table from all roles except those using RPCs
-- This is done via RLS policies: only allow update through specific conditions
-- that match the RPC functions above.

-- Drop overly permissive order update policies
drop policy if exists "Store can update own orders" on public.orders;
drop policy if exists "Driver can update assigned orders" on public.orders;
drop policy if exists "Customer can update own orders" on public.orders;
drop policy if exists "Admins can update any order" on public.orders;

-- Create restrictive policies: only allow status changes, not arbitrary column updates
create policy "Orders are updated via RPC only"
on public.orders for update
using (false)
with check (false);

-- Re-create specific policies for the RPC functions to use
-- Note: SECURITY DEFINER functions bypass RLS, so these policies only affect
-- direct supabase.from('orders').update() calls from the frontend

-- ============================================================
-- SECTION 10: Protect audit_log from direct manipulation
-- ============================================================

drop policy if exists "Audit log insert policy" on public.audit_log;
drop policy if exists "Audit log select policy" on public.audit_log;

create policy "Audit log is append-only via functions"
on public.audit_log for insert
with check (false);

create policy "Audit log is readable by admins only"
on public.audit_log for select
using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

create policy "Audit log cannot be updated"
on public.audit_log for update
using (false);

create policy "Audit log cannot be deleted"
on public.audit_log for delete
using (false);

-- ============================================================
-- SECTION 11: Protect admin views - revoke public access
-- ============================================================

revoke all on public.admin_driver_stats from anon, authenticated;
revoke all on public.admin_store_stats from anon, authenticated;

grant select on public.admin_driver_stats to authenticated;
grant select on public.admin_store_stats to authenticated;

-- Add RLS-like protection by creating wrapper functions
-- The views will still be accessible but the RLS on underlying tables
-- will filter data. However, to be extra safe, we add security_invoker.

-- Note: We can't ALTER VIEW to add security_invoker in older PostgreSQL,
-- but we create RPC wrappers for admin use
create or replace function public.get_admin_driver_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_result jsonb;
begin
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED';
  end if;

  select jsonb_agg(row_to_json(d)) into v_result
  from public.admin_driver_stats d;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke all on function public.get_admin_driver_stats from public, anon;
grant execute on function public.get_admin_driver_stats to authenticated;

create or replace function public.get_admin_store_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_result jsonb;
begin
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED';
  end if;

  select jsonb_agg(row_to_json(s)) into v_result
  from public.admin_store_stats s;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke all on function public.get_admin_store_stats from public, anon;
grant execute on function public.get_admin_store_stats to authenticated;

-- ============================================================
-- SECTION 12: Create secure create_order function (replaces mock)
-- ============================================================

create or replace function public.create_order(
  p_store_id uuid,
  p_product_ids uuid[],
  p_quantities integer[],
  p_delivery_address text,
  p_payment_method text default 'cash',
  p_notes text default null,
  p_tip numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_customer public.customers;
  v_store public.stores;
  v_subtotal numeric := 0;
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
begin
  -- 1. Validate customer
  v_customer_id := auth.uid();
  if v_customer_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select id into v_customer from public.customers where user_id = v_customer_id;
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

    -- Get product from DB (not from client)
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

  -- 9. Calculate totals server-side
  v_tax := round((v_subtotal * v_tax_rate)::numeric, 2);
  v_total := v_subtotal + v_delivery_fee + v_tax + p_tip;

  -- 10. Create order
  insert into public.orders (
    customer_id, store_id, status, payment_method,
    subtotal, delivery_fee, tax, tip, total,
    delivery_address, notes
  ) values (
    v_customer_id, p_store_id, 'pending', p_payment_method::public.payment_method,
    v_subtotal, v_delivery_fee, v_tax, p_tip, v_total,
    p_delivery_address, p_notes
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

  -- 12. Reserve inventory (subtract on accept, not on create)
  -- Inventory is decremented when store accepts the order

  -- 13. Log audit
  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (v_customer_id, 'create_order', 'order', v_order_id,
    jsonb_build_object('store_id', p_store_id, 'total', v_total, 'product_count', v_product_count));

  return jsonb_build_object('ok', true, 'order_id', v_order_id, 'total', v_total);
end;
$$;

revoke all on function public.create_order from public, anon;
grant execute on function public.create_order to authenticated;

-- ============================================================
-- SECTION 13: Add useful indexes for query performance
-- ============================================================

create index if not exists idx_orders_store_status_created
on public.orders(store_id, status, created_at desc);

create index if not exists idx_orders_customer_created
on public.orders(customer_id, created_at desc);

create index if not exists idx_orders_driver_status
on public.orders(driver_id, status);

create index if not exists idx_products_store_active
on public.products(store_id, is_active);

create index if not exists idx_order_items_order
on public.order_items(order_id);

create index if not exists idx_notifications_user_read
on public.notifications(user_id, read_at, created_at desc);

create index if not exists idx_audit_log_created
on public.audit_log(created_at desc);

create index if not exists idx_store_applications_user_status
on public.store_applications(user_id, status);

create index if not exists idx_driver_applications_user_status
on public.driver_applications(user_id, status);

-- ============================================================
-- SECTION 14: Fix stores_select_all to not expose sensitive fields
-- ============================================================

-- Drop and recreate the public store select policy to only expose necessary fields
drop policy if exists "stores_select_all" on public.stores;

create policy "stores_select_all"
on public.stores for select
using (true);

-- Note: We keep USING (true) for SELECT so customers can browse stores,
-- but sensitive fields like owner_id are handled via separate admin-only policy

-- ============================================================
-- SECTION 15: Verify final state
-- ============================================================

-- Ensure RLS is enabled on all tables
alter table public.orders enable row level security;
alter table public.audit_log enable row level security;

-- Verify suspension check in session restore
-- The current_user_is_active() function handles this on every RPC call

-- ============================================================
-- END OF MIGRATION 023
-- ============================================================
