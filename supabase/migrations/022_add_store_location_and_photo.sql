-- RayoExpress | Migration 022: Add location and photo to stores and applications

alter table public.stores
  add column if not exists photo_url text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists address text,
  add column if not exists phone text;

alter table public.store_applications
  add column if not exists photo_url text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

-- Index for geo queries
create index if not exists idx_stores_location on public.stores(latitude, longitude);

-- Update RPC to copy location and photo fields when approving
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
    raise exception 'INVALID_STATE: La solicitud ya fue procesada (estado: %)', v_app.status;
  end if;

  -- 3. Check applicant profile exists
  select * into v_profile
  from public.profiles
  where id = v_app.user_id;

  if not found then
    raise exception 'APPLICANT_NOT_FOUND: El usuario solicitante no existe';
  end if;

  -- 4. Update application status
  update public.store_applications
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = null
  where id = p_application_id;

  -- 5. Create the store with all fields from application
  insert into public.stores (owner_id, name, description, is_open, address, phone, photo_url, latitude, longitude, city)
  values (v_app.user_id, v_app.store_name, coalesce(v_app.description, ''), false,
          v_app.address, v_app.phone, v_app.photo_url, v_app.latitude, v_app.longitude, v_app.city)
  returning id into v_store_id;

  -- 6. Update user role to 'store'
  update public.profiles
  set role = 'store'
  where id = v_app.user_id;

  -- 7. Log audit event
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

  -- 8. Send notification to applicant
  insert into public.notifications (user_id, title, body, type)
  values (
    v_app.user_id,
    'Solicitud de tienda aprobada',
    format('¡Felicidades! Tu tienda "%s" ha sido aprobada. Ya puedes acceder al panel de tienda y comenzar a vender.', v_app.store_name),
    'store_approved'
  );

  return jsonb_build_object('ok', true, 'store_id', v_store_id);
end;
$$;
