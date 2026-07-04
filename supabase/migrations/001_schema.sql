-- RayoExpress | Migration 001: Core Schema
-- Nota: Ejecutar en orden. Requiere extension pgcrypto.

-- Extensiones
create extension if not exists pgcrypto;
create extension if not exists moddatetime;

------------------------------------------------------------
-- ENUMS
------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('customer','driver','store','admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.order_status as enum (
    'pending','accepted','preparing','picked_up','on_the_way','arrived','delivered','cancelled','refunded'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_method as enum ('cash','transfer','card');
exception when duplicate_object then null;
end $$;

------------------------------------------------------------
-- TABLAS
------------------------------------------------------------

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  full_name text,
  phone text,
  avatar_url text,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Password recovery questions
create table if not exists public.password_recovery_questions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  question text not null,
  answer_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Customers
create table if not exists public.customers (
  id uuid primary key references public.profiles(id) on delete cascade,
  default_address text
);

-- 4. Drivers
create table if not exists public.drivers (
  id uuid primary key references public.profiles(id) on delete cascade,
  is_online boolean not null default false,
  approved boolean not null default false,
  rating numeric(3,2) default 0 check (rating >= 0 and rating <= 5),
  vehicle_type text,
  vehicle_plate text
);

-- 5. Driver documents
create table if not exists public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  document_type text not null,
  file_url text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- 6. Stores
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  name text not null,
  description text,
  emoji text default '🏪',
  cover_color text default '#6D28D9',
  is_open boolean not null default false,
  min_order numeric(10,2) default 0 check (min_order >= 0),
  delivery_fee numeric(10,2) default 0 check (delivery_fee >= 0),
  coverage_area jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text default '📦',
  bg_color text default '#F3F4F6',
  created_at timestamptz not null default now()
);

-- 8. Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id),
  name text not null,
  description text,
  price numeric(10,2) not null check (price > 0),
  emoji text default '🍽️',
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Inventory (stock control)
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade unique,
  quantity int not null default 0 check (quantity >= 0),
  low_stock_threshold int not null default 10,
  updated_at timestamptz not null default now()
);

-- 10. Promotions / coupons
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id),
  code text,
  title text not null,
  discount_type text not null check (discount_type in ('percentage','fixed')) default 'percentage',
  discount_value numeric(10,2) not null check (discount_value > 0),
  min_order numeric(10,2) default 0,
  max_uses int default 0,
  uses_count int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 11. Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  store_id uuid not null references public.stores(id),
  driver_id uuid references public.profiles(id),
  status public.order_status not null default 'pending',
  payment_method public.payment_method not null default 'cash',
  transfer_receipt_url text,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  discount numeric(10,2) not null default 0 check (discount >= 0),
  tax numeric(10,2) not null default 0 check (tax >= 0),
  tip numeric(10,2) not null default 0 check (tip >= 0),
  total numeric(10,2) not null check (total >= 0),
  delivery_address text not null,
  customer_delivery_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 12. Order items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null,
  product_emoji text,
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  subtotal numeric(10,2) not null generated always as (quantity * unit_price) stored
);

-- 13. Order status history
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 14. Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null,
  amount numeric(10,2) not null check (amount >= 0),
  receipt_url text,
  verified boolean not null default false,
  verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 15. Delivery codes
create table if not exists public.delivery_codes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  code text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 16. Delivery evidence
create table if not exists public.delivery_evidence (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  driver_id uuid not null references public.drivers(id),
  image_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- 17. Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  type text default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- 18. Chats
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  driver_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 19. Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  message text not null,
  created_at timestamptz not null default now()
);

-- 20. Store schedules
create table if not exists public.store_schedules (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  week_day int not null check (week_day between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  unique(store_id, week_day)
);

-- 21. Locations (real-time tracking)
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id),
  lat numeric(10,7) not null,
  lng numeric(10,7) not null,
  created_at timestamptz not null default now()
);

------------------------------------------------------------
-- ÍNDICES
------------------------------------------------------------
create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_orders_store on public.orders(store_id);
create index if not exists idx_orders_driver on public.orders(driver_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_status_history_order on public.order_status_history(order_id);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_products_store on public.products(store_id);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_promotions_code on public.promotions(code);
create index if not exists idx_locations_user on public.locations(user_id);
create index if not exists idx_locations_order on public.locations(order_id);
create index if not exists idx_messages_chat on public.messages(chat_id);
create index if not exists idx_delivery_codes_order on public.delivery_codes(order_id);

------------------------------------------------------------
-- ROW LEVEL SECURITY
------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.password_recovery_questions enable row level security;
alter table public.customers enable row level security;
alter table public.drivers enable row level security;
alter table public.driver_documents enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.chats enable row level security;
alter table public.locations enable row level security;
alter table public.promotions enable row level security;

------------------------------------------------------------
-- POLICIES RLS - PROFILES
------------------------------------------------------------
drop policy if exists "profiles_select_self" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;

create policy "profiles_select_self" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_admin_all" on public.profiles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

------------------------------------------------------------
-- POLICIES RLS - PASSWORD RECOVERY QUESTIONS
------------------------------------------------------------
drop policy if exists "recovery_select_self" on public.password_recovery_questions;
drop policy if exists "recovery_insert_self" on public.password_recovery_questions;
drop policy if exists "recovery_update_self" on public.password_recovery_questions;

create policy "recovery_select_self" on public.password_recovery_questions
  for select using (auth.uid() = user_id);

create policy "recovery_insert_self" on public.password_recovery_questions
  for insert with check (auth.uid() = user_id);

create policy "recovery_update_self" on public.password_recovery_questions
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------
-- POLICIES RLS - STORES
------------------------------------------------------------
drop policy if exists "stores_select_all" on public.stores;
drop policy if exists "stores_insert_owner" on public.stores;
drop policy if exists "stores_update_owner" on public.stores;

create policy "stores_select_all" on public.stores
  for select using (true);

create policy "stores_insert_owner" on public.stores
  for insert with check (auth.uid() = owner_id);

create policy "stores_update_owner" on public.stores
  for update using (auth.uid() = owner_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

------------------------------------------------------------
-- POLICIES RLS - PRODUCTS
------------------------------------------------------------
drop policy if exists "products_select_active" on public.products;
drop policy if exists "products_admin_store" on public.products;

create policy "products_select_active" on public.products
  for select using (is_active = true or exists (
    select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()
  ));

create policy "products_admin_store" on public.products
  for all using (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

------------------------------------------------------------
-- POLICIES RLS - ORDERS
------------------------------------------------------------
drop policy if exists "orders_select" on public.orders;
drop policy if exists "orders_insert" on public.orders;
drop policy if exists "orders_update" on public.orders;

create policy "orders_select" on public.orders
  for select using (
    auth.uid() = customer_id
    or auth.uid() = driver_id
    or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "orders_insert" on public.orders
  for insert with check (auth.uid() = customer_id);

create policy "orders_update" on public.orders
  for update using (
    auth.uid() = customer_id
    or auth.uid() = driver_id
    or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

------------------------------------------------------------
-- POLICIES - ORDER ITEMS
------------------------------------------------------------
drop policy if exists "order_items_select" on public.order_items;
drop policy if exists "order_items_insert" on public.order_items;

create policy "order_items_select" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and (
      o.customer_id = auth.uid() or o.driver_id = auth.uid()
      or exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid())
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    ))
  );

create policy "order_items_insert" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );

------------------------------------------------------------
-- POLICIES - NOTIFICATIONS
------------------------------------------------------------
drop policy if exists "notifications_select_self" on public.notifications;
drop policy if exists "notifications_update_self" on public.notifications;

create policy "notifications_select_self" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_update_self" on public.notifications
  for update using (auth.uid() = user_id);

------------------------------------------------------------
-- POLICIES - CHATS & MESSAGES
------------------------------------------------------------
drop policy if exists "chats_select" on public.chats;
drop policy if exists "messages_select" on public.messages;
drop policy if exists "messages_insert" on public.messages;

create policy "chats_select" on public.chats
  for select using (auth.uid() = customer_id or auth.uid() = driver_id);

create policy "messages_select" on public.messages
  for select using (
    exists (select 1 from public.chats c where c.id = chat_id and (c.customer_id = auth.uid() or c.driver_id = auth.uid()))
  );

create policy "messages_insert" on public.messages
  for insert with check (
    exists (select 1 from public.chats c where c.id = chat_id and (c.customer_id = auth.uid() or c.driver_id = auth.uid()))
  );

------------------------------------------------------------
-- POLICIES - LOCATIONS
------------------------------------------------------------
drop policy if exists "locations_select" on public.locations;
drop policy if exists "locations_insert" on public.locations;

create policy "locations_select" on public.locations
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.orders o where o.id = order_id and (o.driver_id = auth.uid() or o.customer_id = auth.uid()))
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "locations_insert" on public.locations
  for insert with check (auth.uid() = user_id);

------------------------------------------------------------
-- POLICIES - PROMOTIONS
------------------------------------------------------------
drop policy if exists "promotions_select_active" on public.promotions;

create policy "promotions_select_active" on public.promotions
  for select using (active = true);
