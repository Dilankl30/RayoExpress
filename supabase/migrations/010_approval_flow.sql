-- RayoExpress | Migration 010: Approval flow RPCs for store & driver applications
-- SECURITY DEFINER RPCs so admins can approve/reject applications atomically.
-- Each RPC verifies the caller is an admin, updates the application, creates
-- the store or driver record, updates the user's role, logs an audit event,
-- and sends an in-app notification.

-- ============================================================
-- Helper: trigger for updated_at on application tables
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists handle_store_applications_updated_at on public.store_applications;
create trigger handle_store_applications_updated_at
  before update on public.store_applications
  for each row execute function public.handle_updated_at();

drop trigger if exists handle_driver_applications_updated_at on public.driver_applications;
create trigger handle_driver_applications_updated_at
  before update on public.driver_applications
  for each row execute function public.handle_updated_at();

-- ============================================================
-- RPC: admin_approve_store_application
-- ============================================================
create or replace function public.admin_approve_store_application(
  p_application_id uuid,
  p_review_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.store_applications;
  v_profile public.profiles;
  v_store_id uuid;
  v_is_admin boolean;
begin
  -- 1. Verify caller is admin
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED: Solo administradores pueden aprobar solicitudes';
  end if;

  -- 2. Lock & fetch the application
  select * into v_app
  from public.store_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'NOT_FOUND: Solicitud de tienda no encontrada';
  end if;

  if v_app.status != 'pending' then
    raise exception 'INVALID_STATE: La solicitud ya fue revisada (estado: %)', v_app.status;
  end if;

  -- 3. Fetch applicant profile
  select * into v_profile
  from public.profiles
  where id = v_app.user_id;

  if not found then
    raise exception 'NOT_FOUND: Usuario solicitante no encontrado';
  end if;

  -- 4. Update application status
  update public.store_applications
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = null
  where id = p_application_id;

  -- 5. Create the store
  insert into public.stores (owner_id, name, description, is_open)
  values (v_app.user_id, v_app.store_name, coalesce(v_app.description, ''), false)
  returning id into v_store_id;

  -- 6. Update user role to 'store'
  update public.profiles
  set role = 'store'
  where id = v_app.user_id;

  -- 7. Ensure a customer record doesn't block inserts (trigger may create one)
  --    (Trigger handle_profile_role_insert should handle this when role changes)

  -- 8. Log audit event
  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'approve_store_application',
    'store_applications',
    p_application_id,
    jsonb_build_object(
      'store_name', v_app.store_name,
      'store_id', v_store_id,
      'applicant_id', v_app.user_id,
      'notes', p_review_notes
    )
  );

  -- 9. Send notification to applicant
  insert into public.notifications (user_id, title, body, type)
  values (
    v_app.user_id,
    'Solicitud de tienda aprobada',
    format('¡Felicidades! Tu tienda "%s" ha sido aprobada. Ya puedes acceder al panel de tienda y comenzar a vender.', v_app.store_name),
    'application_approved'
  );

  return jsonb_build_object(
    'ok', true,
    'store_id', v_store_id,
    'application_id', p_application_id
  );
end;
$$;

-- ============================================================
-- RPC: admin_reject_store_application
-- ============================================================
create or replace function public.admin_reject_store_application(
  p_application_id uuid,
  p_rejection_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.store_applications;
  v_is_admin boolean;
begin
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED: Solo administradores pueden rechazar solicitudes';
  end if;

  select * into v_app
  from public.store_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'NOT_FOUND: Solicitud de tienda no encontrada';
  end if;

  if v_app.status != 'pending' then
    raise exception 'INVALID_STATE: La solicitud ya fue revisada (estado: %)', v_app.status;
  end if;

  if p_rejection_reason is null or p_rejection_reason = '' then
    raise exception 'VALIDATION_ERROR: Debes proporcionar un motivo de rechazo';
  end if;

  update public.store_applications
  set status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = p_rejection_reason
  where id = p_application_id;

  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'reject_store_application',
    'store_applications',
    p_application_id,
    jsonb_build_object(
      'store_name', v_app.store_name,
      'applicant_id', v_app.user_id,
      'reason', p_rejection_reason
    )
  );

  insert into public.notifications (user_id, title, body, type)
  values (
    v_app.user_id,
    'Solicitud de tienda rechazada',
    format('Lamentamos informarte que tu solicitud para "%s" no fue aprobada. Motivo: %s', v_app.store_name, p_rejection_reason),
    'application_rejected'
  );

  return jsonb_build_object('ok', true, 'application_id', p_application_id);
end;
$$;

-- ============================================================
-- RPC: admin_approve_driver_application
-- ============================================================
create or replace function public.admin_approve_driver_application(
  p_application_id uuid,
  p_review_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.driver_applications;
  v_profile public.profiles;
  v_driver_id uuid;
  v_is_admin boolean;
begin
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED: Solo administradores pueden aprobar solicitudes';
  end if;

  select * into v_app
  from public.driver_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'NOT_FOUND: Solicitud de repartidor no encontrada';
  end if;

  if v_app.status != 'pending' then
    raise exception 'INVALID_STATE: La solicitud ya fue revisada (estado: %)', v_app.status;
  end if;

  select * into v_profile
  from public.profiles
  where id = v_app.user_id;

  if not found then
    raise exception 'NOT_FOUND: Usuario solicitante no encontrado';
  end if;

  update public.driver_applications
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = null
  where id = p_application_id;

  -- Create driver record (only if not already exists from trigger race)
  insert into public.drivers (id, is_online, approved, rating, vehicle_type, vehicle_plate)
  values (
    v_app.user_id,
    false,
    true,
    0,
    coalesce(v_app.vehicle_type, 'moto'),
    coalesce(v_app.vehicle_plate, '')
  )
  on conflict (id) do update set
    approved = true,
    vehicle_type = coalesce(v_app.vehicle_type, excluded.vehicle_type),
    vehicle_plate = coalesce(v_app.vehicle_plate, excluded.vehicle_plate);

  update public.profiles
  set role = 'driver'
  where id = v_app.user_id;

  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'approve_driver_application',
    'driver_applications',
    p_application_id,
    jsonb_build_object(
      'driver_name', v_app.full_name,
      'vehicle_type', v_app.vehicle_type,
      'vehicle_plate', v_app.vehicle_plate,
      'applicant_id', v_app.user_id,
      'notes', p_review_notes
    )
  );

  insert into public.notifications (user_id, title, body, type)
  values (
    v_app.user_id,
    'Solicitud de repartidor aprobada',
    '¡Felicidades! Has sido aprobado como repartidor. Ya puedes conectarte y comenzar a recibir pedidos.',
    'application_approved'
  );

  return jsonb_build_object(
    'ok', true,
    'driver_id', v_app.user_id,
    'application_id', p_application_id
  );
end;
$$;

-- ============================================================
-- RPC: admin_reject_driver_application
-- ============================================================
create or replace function public.admin_reject_driver_application(
  p_application_id uuid,
  p_rejection_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.driver_applications;
  v_is_admin boolean;
begin
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED: Solo administradores pueden rechazar solicitudes';
  end if;

  select * into v_app
  from public.driver_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'NOT_FOUND: Solicitud de repartidor no encontrada';
  end if;

  if v_app.status != 'pending' then
    raise exception 'INVALID_STATE: La solicitud ya fue revisada (estado: %)', v_app.status;
  end if;

  if p_rejection_reason is null or p_rejection_reason = '' then
    raise exception 'VALIDATION_ERROR: Debes proporcionar un motivo de rechazo';
  end if;

  update public.driver_applications
  set status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = p_rejection_reason
  where id = p_application_id;

  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'reject_driver_application',
    'driver_applications',
    p_application_id,
    jsonb_build_object(
      'driver_name', v_app.full_name,
      'applicant_id', v_app.user_id,
      'reason', p_rejection_reason
    )
  );

  insert into public.notifications (user_id, title, body, type)
  values (
    v_app.user_id,
    'Solicitud de repartidor rechazada',
    format('Lamentamos informarte que tu solicitud para ser repartidor no fue aprobada. Motivo: %s', p_rejection_reason),
    'application_rejected'
  );

  return jsonb_build_object('ok', true, 'application_id', p_application_id);
end;
$$;
