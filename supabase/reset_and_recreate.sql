-- RayoExpress | Reset completo + recreación de esquema
-- ADVERTENCIA: este script elimina TODOS los objetos funcionales del dominio.

begin;

-- Extensiones necesarias
create extension if not exists pgcrypto;

-- Eliminar policies (si existen)
drop policy if exists "profiles-self-read" on public.profiles;
drop policy if exists "profiles-self-upsert" on public.profiles;
drop policy if exists "password-recovery-self-read" on public.password_recovery_questions;
drop policy if exists "password-recovery-self-upsert" on public.password_recovery_questions;
drop policy if exists "orders-role-access" on public.orders;
drop policy if exists "orders-customer-create" on public.orders;
drop policy if exists "messages-chat-members" on public.messages;
drop policy if exists "notifications-owner" on public.notifications;

-- Eliminar tablas (orden seguro por dependencias)
drop table if exists public.locations cascade;
drop table if exists public.delivery_evidence cascade;
drop table if exists public.store_schedules cascade;
drop table if exists public.messages cascade;
drop table if exists public.chats cascade;
drop table if exists public.notifications cascade;
drop table if exists public.driver_documents cascade;
drop table if exists public.delivery_codes cascade;
drop table if exists public.payments cascade;
drop table if exists public.order_status_history cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.promotions cascade;
drop table if exists public.products cascade;
drop table if exists public.categories cascade;
drop table if exists public.stores cascade;
drop table if exists public.drivers cascade;
drop table if exists public.customers cascade;
drop table if exists public.password_recovery_questions cascade;
drop table if exists public.profiles cascade;

-- Eliminar enums
 drop type if exists public.order_status cascade;
 drop type if exists public.app_role cascade;

-- Core enums
create type public.app_role as enum ('customer','driver','store','admin');
create type public.order_status as enum ('pending','accepted','preparing','picked_up','on_the_way','arrived','delivered','cancelled');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  full_name text,
  phone text,
  avatar_url text,
  security_question text,
  security_answer_hash text,
  is_suspended boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.password_recovery_questions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  question text not null,
  answer_hash text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.customers (id uuid primary key references public.profiles(id) on delete cascade, default_address text);
create table if not exists public.drivers (id uuid primary key references public.profiles(id) on delete cascade, is_online boolean default false, approved boolean default false, rating numeric default 0);
create table if not exists public.stores (id uuid primary key default gen_random_uuid(), owner_id uuid references public.profiles(id), name text not null, is_open boolean default false, coverage_area jsonb);
create table if not exists public.categories (id uuid primary key default gen_random_uuid(), name text not null, icon text);
create table if not exists public.products (id uuid primary key default gen_random_uuid(), store_id uuid references public.stores(id) on delete cascade, category_id uuid references public.categories(id), name text not null, price numeric not null, image_url text, is_active boolean default true);
create table if not exists public.promotions (id uuid primary key default gen_random_uuid(), store_id uuid references public.stores(id), title text not null, discount_type text, discount_value numeric, starts_at timestamptz, ends_at timestamptz, active boolean default true);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id),
  store_id uuid references public.stores(id),
  driver_id uuid references public.profiles(id),
  status public.order_status default 'pending',
  payment_method text check (payment_method in ('cash','transfer')),
  transfer_receipt_url text,
  total numeric default 0,
  delivery_address text,
  customer_delivery_code text,
  created_at timestamptz default now()
);

create table if not exists public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id) on delete cascade, product_id uuid references public.products(id), quantity int not null, unit_price numeric not null);
create table if not exists public.order_status_history (id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id) on delete cascade, status public.order_status not null, changed_by uuid references public.profiles(id), created_at timestamptz default now());
create table if not exists public.payments (id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id) on delete cascade, method text, amount numeric, receipt_url text, verified boolean default false);
create table if not exists public.delivery_codes (id uuid primary key default gen_random_uuid(), order_id uuid unique references public.orders(id) on delete cascade, code text not null, created_by uuid references public.profiles(id));
create table if not exists public.driver_documents (id uuid primary key default gen_random_uuid(), driver_id uuid references public.drivers(id) on delete cascade, document_type text, file_url text, approved boolean default false);
create table if not exists public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete cascade, title text, body text, read_at timestamptz, created_at timestamptz default now());
create table if not exists public.chats (id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id) on delete cascade, customer_id uuid references public.profiles(id), driver_id uuid references public.profiles(id));
create table if not exists public.messages (id uuid primary key default gen_random_uuid(), chat_id uuid references public.chats(id) on delete cascade, sender_id uuid references public.profiles(id), message text, created_at timestamptz default now());
create table if not exists public.store_schedules (id uuid primary key default gen_random_uuid(), store_id uuid references public.stores(id) on delete cascade, week_day int, opens_at time, closes_at time);
create table if not exists public.delivery_evidence (id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id) on delete cascade, driver_id uuid references public.drivers(id), image_url text, notes text, created_at timestamptz default now());
create table if not exists public.locations (id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete cascade, order_id uuid references public.orders(id), lat numeric, lng numeric, created_at timestamptz default now());

alter table public.profiles enable row level security;
alter table public.password_recovery_questions enable row level security;
alter table public.orders enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

create policy "profiles-self-read" on public.profiles for select using (auth.uid() = id);
create policy "profiles-self-upsert" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "password-recovery-self-read" on public.password_recovery_questions for select using (auth.uid() = user_id);
create policy "password-recovery-self-upsert" on public.password_recovery_questions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "orders-role-access" on public.orders for select using (
  auth.uid() = customer_id or auth.uid() = driver_id or
  exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()) or
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "orders-customer-create" on public.orders for insert with check (auth.uid() = customer_id);
create policy "messages-chat-members" on public.messages for select using (
  exists (select 1 from public.chats c where c.id = chat_id and (c.customer_id = auth.uid() or c.driver_id = auth.uid()))
);
create policy "notifications-owner" on public.notifications for select using (auth.uid() = user_id);

commit;
