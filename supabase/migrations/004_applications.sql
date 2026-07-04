-- RayoExpress | Migration 004: Store & Driver Applications

create table if not exists public.store_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_name text not null,
  description text,
  address text,
  phone text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.driver_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text,
  vehicle_type text,
  vehicle_plate text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.driver_applications(id) on delete cascade,
  document_type text not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

alter table public.store_applications enable row level security;
alter table public.driver_applications enable row level security;
alter table public.application_documents enable row level security;

drop policy if exists "store_applications_select_self" on public.store_applications;
drop policy if exists "store_applications_insert_self" on public.store_applications;
drop policy if exists "store_applications_admin_all" on public.store_applications;

create policy "store_applications_select_self" on public.store_applications
  for select using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "store_applications_insert_self" on public.store_applications
  for insert with check (auth.uid() = user_id);

create policy "store_applications_admin_all" on public.store_applications
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "driver_applications_select_self" on public.driver_applications;
drop policy if exists "driver_applications_insert_self" on public.driver_applications;
drop policy if exists "driver_applications_admin_all" on public.driver_applications;

create policy "driver_applications_select_self" on public.driver_applications
  for select using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "driver_applications_insert_self" on public.driver_applications
  for insert with check (auth.uid() = user_id);

create policy "driver_applications_admin_all" on public.driver_applications
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "application_documents_select" on public.application_documents;
drop policy if exists "application_documents_insert" on public.application_documents;

create policy "application_documents_select" on public.application_documents
  for select using (exists (select 1 from public.driver_applications da where da.id = application_id and (da.user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))));

create policy "application_documents_insert" on public.application_documents
  for insert with check (exists (select 1 from public.driver_applications da where da.id = application_id and da.user_id = auth.uid()));
