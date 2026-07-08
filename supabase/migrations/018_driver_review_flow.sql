-- RayoExpress | Migration 018: Driver review flow – docs verification & contract signing
-- Adds docs_verified status, RPCs for admin to verify documents and sign contract,
-- and ensures driver-documents bucket exists and is public.

-- ============================================================
-- 1. Ensure driver-documents bucket exists (idempotent)
--    Supports users who haven't run migration 011.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('driver-documents', 'driver-documents', true, 10485760, '{image/jpeg,image/png,image/webp,application/pdf}')
on conflict (id) do nothing;

-- If bucket was created as private by migration 011, make it public
update storage.buckets set public = true where id = 'driver-documents';

-- ============================================================
-- 2. Extend driver_applications status check to include docs_verified
-- ============================================================
alter table public.driver_applications
  drop constraint if exists driver_applications_status_check;

alter table public.driver_applications
  add constraint driver_applications_status_check
  check (status in ('pending','docs_verified','approved','rejected'));

-- ============================================================
-- 3. RPC: admin_verify_driver_documents
--    Admin marks applicant's documents as correct and invites
--    them to the agency to sign the contract.
-- ============================================================
create or replace function public.admin_verify_driver_documents(
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
  v_is_admin boolean;
begin
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED: Solo administradores pueden verificar documentos';
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

  update public.driver_applications
  set status = 'docs_verified',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = null
  where id = p_application_id;

  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'verify_driver_documents',
    'driver_applications',
    p_application_id,
    jsonb_build_object(
      'applicant_id', v_app.user_id,
      'driver_name', v_app.full_name,
      'notes', p_review_notes
    )
  );

  insert into public.notifications (user_id, title, body, type)
  values (
    v_app.user_id,
    'Documentos verificados correctamente',
    'Tus documentos están correctos. Por favor, acércate a nuestra agencia para firmar el contrato y activar tu cuenta como repartidor.',
    'application_docs_verified'
  );

  return jsonb_build_object(
    'ok', true,
    'application_id', p_application_id,
    'new_status', 'docs_verified'
  );
end;
$$;

-- ============================================================
-- 4. RPC: admin_sign_driver_contract
--    Admin confirms the applicant has signed the contract at the
--    agency. Fully activates the driver.
-- ============================================================
create or replace function public.admin_sign_driver_contract(
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
    raise exception 'PERMISSION_DENIED: Solo administradores pueden firmar contratos';
  end if;

  select * into v_app
  from public.driver_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'NOT_FOUND: Solicitud de repartidor no encontrada';
  end if;

  if v_app.status != 'docs_verified' then
    raise exception 'INVALID_STATE: La solicitud debe estar en estado "docs_verified" (estado actual: %)', v_app.status;
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
    'sign_driver_contract',
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
    'Contrato firmado – Bienvenido a RayoExpress',
    '¡Felicidades! Tu contrato ha sido firmado. Ya eres repartidor oficial de RayoExpress. Conéctate y comienza a recibir pedidos.',
    'application_approved'
  );

  return jsonb_build_object(
    'ok', true,
    'driver_id', v_app.user_id,
    'application_id', p_application_id
  );
end;
$$;
