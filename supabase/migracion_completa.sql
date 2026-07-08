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

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'categories_name_key') then
    alter table public.categories add constraint categories_name_key unique (name);
  end if;
end $$;

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
  code text unique,
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

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'promotions_code_key') then
    alter table public.promotions add constraint promotions_code_key unique (code);
  end if;
end $$;

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

-- RayoExpress | Migration 002: Triggers and Functions

-- 1. Auto-update updated_at for profiles
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'profiles_updated_at') then
    create trigger profiles_updated_at before update on public.profiles
      for each row execute function public.handle_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'stores_updated_at') then
    create trigger stores_updated_at before update on public.stores
      for each row execute function public.handle_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'products_updated_at') then
    create trigger products_updated_at before update on public.products
      for each row execute function public.handle_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'orders_updated_at') then
    create trigger orders_updated_at before update on public.orders
      for each row execute function public.handle_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'password_recovery_updated_at') then
    create trigger password_recovery_updated_at before update on public.password_recovery_questions
      for each row execute function public.handle_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'inventory_updated_at') then
    create trigger inventory_updated_at before update on public.inventory
      for each row execute function public.handle_updated_at();
  end if;
end $$;

-- 2. Create profile on signup (trigger on auth.users)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_role text;
  raw_full_name text;
  raw_security_question text;
  raw_security_answer_hash text;
begin
  raw_role := 'customer';
  raw_full_name := new.raw_user_meta_data ->> 'full_name';
  raw_security_question := new.raw_user_meta_data ->> 'security_question';
  raw_security_answer_hash := new.raw_user_meta_data ->> 'security_answer_hash';

  insert into public.profiles (id, role, full_name, phone, avatar_url)
  values (
    new.id,
    raw_role::public.app_role,
    raw_full_name,
    new.phone,
    new.raw_user_meta_data ->> 'avatar_url'
  );

  -- If security question provided, store in dedicated table (NOT in user_metadata)
  if raw_security_question is not null and raw_security_answer_hash is not null then
    insert into public.password_recovery_questions (user_id, question, answer_hash)
    values (new.id, raw_security_question, raw_security_answer_hash);
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Auto-create customer/driver/store records based on role
create or replace function public.handle_profile_role_insert()
returns trigger as $$
begin
  if new.role = 'customer' then
    insert into public.customers (id) values (new.id) on conflict (id) do nothing;
  elsif new.role = 'driver' then
    insert into public.drivers (id) values (new.id) on conflict (id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_role_insert on public.profiles;
create trigger on_profile_role_insert
  after insert on public.profiles
  for each row execute function public.handle_profile_role_insert();

-- 4. Generate delivery code when order is accepted
create or replace function public.generate_delivery_code()
returns trigger as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.delivery_codes (order_id, code, created_by)
    values (new.id, upper(substr(md5(random()::text), 1, 8)), new.customer_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_accepted on public.orders;
create trigger on_order_accepted
  after update on public.orders
  for each row when (old.status = 'pending' and new.status = 'accepted')
  execute function public.generate_delivery_code();

-- 5. Log order status changes
create or replace function public.log_order_status_change()
returns trigger as $$
begin
  insert into public.order_status_history (order_id, status, changed_by)
  values (new.id, new.status, auth.uid());
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_status_change on public.orders;
create trigger on_order_status_change
  after update on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.log_order_status_change();

-- 6. Validate order status transitions (STATE MACHINE)
create or replace function public.validate_order_status()
returns trigger as $$
begin
  -- State machine: allowed transitions
  if old.status = 'pending' and new.status not in ('accepted', 'cancelled') then
    raise exception 'Invalid transition: pending -> %', new.status;
  end if;
  if old.status = 'accepted' and new.status not in ('preparing', 'cancelled') then
    raise exception 'Invalid transition: accepted -> %', new.status;
  end if;
  if old.status = 'preparing' and new.status not in ('picked_up', 'cancelled') then
    raise exception 'Invalid transition: preparing -> %', new.status;
  end if;
  if old.status = 'picked_up' and new.status not in ('on_the_way') then
    raise exception 'Invalid transition: picked_up -> %', new.status;
  end if;
  if old.status = 'on_the_way' and new.status not in ('arrived', 'delivered') then
    raise exception 'Invalid transition: on_the_way -> %', new.status;
  end if;
  if old.status = 'arrived' and new.status not in ('delivered') then
    raise exception 'Invalid transition: arrived -> %', new.status;
  end if;
  if old.status in ('delivered', 'cancelled', 'refunded') then
    raise exception 'Cannot change status from final state: %', old.status;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_status_validate on public.orders;
create trigger on_order_status_validate
  before update on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.validate_order_status();

-- 7. Create notification on order status change
create or replace function public.notify_order_status()
returns trigger as $$
begin
  -- Notify customer
  insert into public.notifications (user_id, title, body, type)
  values (new.customer_id, 'Pedido actualizado', 'Tu pedido ha cambiado a: ' || new.status, 'order');

  -- If driver assigned, notify driver too
  if new.driver_id is not null and new.driver_id is distinct from old.driver_id then
    insert into public.notifications (user_id, title, body, type)
    values (new.driver_id, 'Nuevo pedido asignado', 'Tienes un nuevo pedido para entregar', 'order');
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_notify on public.orders;
create trigger on_order_notify
  after update on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.notify_order_status();

-- 8. Auto-create inventory when product is created
create or replace function public.handle_new_product()
returns trigger as $$
begin
  insert into public.inventory (product_id, quantity)
  values (new.id, 0)
  on conflict (product_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_product_created on public.products;
create trigger on_product_created
  after insert on public.products
  for each row execute function public.handle_new_product();

-- 9. Decrement inventory on order acceptance
create or replace function public.decrement_inventory_on_accept()
returns trigger as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    update public.inventory i
    set quantity = i.quantity - oi.quantity
    from public.order_items oi
    where oi.order_id = new.id and i.product_id = oi.product_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_accept_inventory on public.orders;
create trigger on_order_accept_inventory
  after update on public.orders
  for each row when (old.status = 'pending' and new.status = 'accepted')
  execute function public.decrement_inventory_on_accept();

-- 10. Function: validate and create order (server-side total calculation)
create or replace function public.create_order(
  p_store_id uuid,
  p_product_ids uuid[],
  p_quantities int[],
  p_delivery_address text,
  p_payment_method public.payment_method,
  p_coupon_code text default null,
  p_notes text default null,
  p_tip numeric(10,2) default 0
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_customer_id uuid;
  v_store_record record;
  v_product record;
  v_subtotal numeric(10,2) := 0;
  v_delivery_fee numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_tax numeric(10,2) := 0;
  v_total numeric(10,2) := 0;
  v_order_id uuid;
  v_i int;
  v_product_id uuid;
  v_qty int;
  v_inventory_qty int;
  v_coupon_record record;
begin
  -- Get current user
  v_customer_id := auth.uid();
  if v_customer_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  -- Validate store exists and is open
  select * into v_store_record from public.stores where id = p_store_id;
  if not found then
    raise exception 'La tienda no existe';
  end if;
  if not v_store_record.is_open then
    raise exception 'La tienda está cerrada';
  end if;

  v_delivery_fee := coalesce(v_store_record.delivery_fee, 0);

  -- Validate products and calculate subtotal
  for v_i in 1 .. array_length(p_product_ids, 1) loop
    v_product_id := p_product_ids[v_i];
    v_qty := p_quantities[v_i];

    if v_qty <= 0 then
      raise exception 'Cantidad inválida para producto %', v_product_id;
    end if;

    select * into v_product from public.products where id = v_product_id and is_active = true;
    if not found then
      raise exception 'Producto no encontrado o inactivo: %', v_product_id;
    end if;

    -- Check inventory
    select quantity into v_inventory_qty from public.inventory where product_id = v_product_id;
    if v_inventory_qty is not null and v_inventory_qty < v_qty then
      raise exception 'Stock insuficiente para %', v_product.name;
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_qty);
  end loop;

  if v_subtotal <= 0 then
    raise exception 'El subtotal debe ser mayor a 0';
  end if;

  -- Validate minimum order
  if v_subtotal < v_store_record.min_order then
    raise exception 'El pedido mínimo es $%', v_store_record.min_order;
  end if;

  -- Apply coupon if provided
  if p_coupon_code is not null then
    select * into v_coupon_record from public.promotions
    where code = p_coupon_code and active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
      and (store_id is null or store_id = p_store_id);

    if found then
      if v_coupon_record.max_uses > 0 and v_coupon_record.uses_count >= v_coupon_record.max_uses then
        raise exception 'El cupón ha alcanzado su límite de usos';
      end if;
      if v_subtotal < v_coupon_record.min_order then
        raise exception 'El pedido mínimo para este cupón es $%', v_coupon_record.min_order;
      end if;

      if v_coupon_record.discount_type = 'percentage' then
        v_discount := least(v_subtotal * (v_coupon_record.discount_value / 100), v_subtotal);
      else
        v_discount := least(v_coupon_record.discount_value, v_subtotal);
      end if;

      -- Increment uses
      update public.promotions set uses_count = uses_count + 1 where id = v_coupon_record.id;
    end if;
  end if;

  -- Calculate tax (12% IVA)
  v_tax := round((v_subtotal - v_discount) * 0.12, 2);

  -- Calculate total
  v_total := v_subtotal + v_delivery_fee + v_tax - v_discount + coalesce(p_tip, 0);
  v_total := round(greatest(v_total, 0), 2);

  -- Create order
  insert into public.orders (
    customer_id, store_id, status, payment_method,
    subtotal, delivery_fee, discount, tax, tip, total,
    delivery_address, notes
  ) values (
    v_customer_id, p_store_id, 'pending', p_payment_method,
    v_subtotal, v_delivery_fee, v_discount, v_tax, coalesce(p_tip, 0), v_total,
    p_delivery_address, p_notes
  ) returning id into v_order_id;

  -- Create order items
  for v_i in 1 .. array_length(p_product_ids, 1) loop
    v_product_id := p_product_ids[v_i];
    v_qty := p_quantities[v_i];

    select price, name, emoji into v_product
    from public.products where id = v_product_id;

    insert into public.order_items (order_id, product_id, product_name, product_emoji, quantity, unit_price)
    values (v_order_id, v_product_id, v_product.name, v_product.emoji, v_qty, v_product.price);
  end loop;

  -- Return order data
  return jsonb_build_object(
    'order_id', v_order_id,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'discount', v_discount,
    'tax', v_tax,
    'tip', coalesce(p_tip, 0),
    'total', v_total,
    'status', 'pending'
  );
end;
$$;

-- Nota: Requires Supabase to grant execute:
-- grant execute on function public.create_order to authenticated;

-- RayoExpress | Migration 003: Seed Data for Development
-- Categorías, tiendas de ejemplo, productos

-- 1. Categories
insert into public.categories (name, emoji, bg_color) values
  ('Restaurantes', '🍔', '#FFF3E0'),
  ('Súper', '🛒', '#E8F5E9'),
  ('Farmacias', '💊', '#E3F2FD'),
  ('Bebidas', '🥤', '#FFF8E1'),
  ('Mascotas', '🐾', '#FCE4EC'),
  ('Mensajería', '📦', '#EDE7F6'),
  ('Tecnología', '📱', '#E0F7FA'),
  ('Regalos', '🎁', '#FFEBEE')
on conflict (name) do nothing;

-- 2. Store owners (require real auth.users to exist)
-- These need an admin to create stores through the UI
-- Sample stores will be inserted when an owner registers

-- 3. Promotions
insert into public.promotions (code, title, discount_type, discount_value, min_order, max_uses) values
  ('RAYO15', '15% de descuento', 'percentage', 15, 5.00, 1000),
  ('RAYO1', 'Envío gratis primer pedido', 'fixed', 1.50, 0, 500)
on conflict (code) do nothing;

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

-- RayoExpress | Migration 005: Payment enhancements

-- payment_transactions table for external payment tracking
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null,
  amount numeric(10,2) not null check (amount >= 0),
  receipt_url text,
  provider text,
  provider_reference text,
  status text not null default 'pending' check (status in ('pending','completed','failed','refunded')),
  verified boolean not null default false,
  verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_transactions enable row level security;

drop policy if exists "payment_transactions_select" on public.payment_transactions;
drop policy if exists "payment_transactions_insert" on public.payment_transactions;
drop policy if exists "payment_transactions_update" on public.payment_transactions;

create policy "payment_transactions_select" on public.payment_transactions
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and (
      o.customer_id = auth.uid() or o.driver_id = auth.uid()
      or exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid())
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    ))
  );

create policy "payment_transactions_insert" on public.payment_transactions
  for insert with check (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));

create policy "payment_transactions_update" on public.payment_transactions
  for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- 006_chat.sql
-- Chats and messages for order-level communication
-- Adds new columns to tables created in 001_schema.sql

-- Add new columns to existing chats table
ALTER TABLE IF EXISTS public.chats ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);
ALTER TABLE IF EXISTS public.chats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add new columns to existing messages table
ALTER TABLE IF EXISTS public.messages ADD COLUMN IF NOT EXISTS sender_role TEXT CHECK (sender_role IN ('customer', 'driver', 'store', 'admin'));
ALTER TABLE IF EXISTS public.messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE IF EXISTS public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_chats_order_id ON public.chats(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Chats RLS
CREATE POLICY "Users can view their own chats"
  ON public.chats FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = store_id OR auth.uid() = driver_id);

CREATE POLICY "Users can insert chats"
  ON public.chats FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Messages RLS
CREATE POLICY "Users can view messages in their chats"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE public.chats.id = public.messages.chat_id
      AND (public.chats.customer_id = auth.uid() OR public.chats.store_id = auth.uid() OR public.chats.driver_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their chats"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE public.chats.id = public.messages.chat_id
      AND (public.chats.customer_id = auth.uid() OR public.chats.store_id = auth.uid() OR public.chats.driver_id = auth.uid())
    )
  );

-- Realtime
ALTER publication supabase_realtime ADD TABLE public.messages;

-- 007_rls_audit.sql
-- Complete RLS hardening + audit log

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs; insert is allowed via trigger/function
CREATE POLICY "Admins can view audit logs"
  ON audit_log FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Service can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- Add updated_at trigger for payment_transactions (missing from 005)
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure payment_transactions has updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_payment_transactions'
  ) THEN
    CREATE TRIGGER set_updated_at_payment_transactions
      BEFORE UPDATE ON public.payment_transactions
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;
END;
$$;

-- Add RLS to the old payments table if not already done
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_select') THEN
    CREATE POLICY "payments_select" ON public.payments FOR SELECT
      USING (
        auth.uid() IN (
          SELECT o.customer_id FROM orders o WHERE o.id = payments.order_id
          UNION
          SELECT o.driver_id FROM orders o WHERE o.id = payments.order_id
          UNION
          SELECT s.owner_id FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.id = payments.order_id
        )
        OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_insert') THEN
    CREATE POLICY "payments_insert" ON public.payments FOR INSERT
      WITH CHECK (
        auth.uid() IN (SELECT o.customer_id FROM orders o WHERE o.id = payments.order_id)
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_update') THEN
    CREATE POLICY "payments_update" ON public.payments FOR UPDATE
      USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
  END IF;
END;
$$;

-- Add RLS to delivery_evidence if not already done
ALTER TABLE public.delivery_evidence ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delivery_evidence_select') THEN
    CREATE POLICY "delivery_evidence_select" ON public.delivery_evidence FOR SELECT
      USING (
        auth.uid() IN (
          SELECT o.driver_id FROM orders o WHERE o.id = delivery_evidence.order_id
          UNION
          SELECT o.customer_id FROM orders o WHERE o.id = delivery_evidence.order_id
          UNION
          SELECT s.owner_id FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.id = delivery_evidence.order_id
        )
        OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delivery_evidence_insert') THEN
    CREATE POLICY "delivery_evidence_insert" ON public.delivery_evidence FOR INSERT
      WITH CHECK (
        auth.uid() IN (SELECT o.driver_id FROM orders o WHERE o.id = delivery_evidence.order_id)
      );
  END IF;
END;
$$;

-- Add missing screen path map entries
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read app_config" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "Only admins can update app_config" ON public.app_config FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 008_fix_role_security.sql
-- Security hardening: prevent public registration as admin

-- 1. Fix handle_new_user to NEVER trust client-sent role
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_full_name text;
  raw_security_question text;
  raw_security_answer_hash text;
begin
  raw_full_name := new.raw_user_meta_data ->> 'full_name';
  raw_security_question := new.raw_user_meta_data ->> 'security_question';
  raw_security_answer_hash := new.raw_user_meta_data ->> 'security_answer_hash';

  insert into public.profiles (id, role, full_name, phone, avatar_url)
  values (
    new.id,
    'customer',
    raw_full_name,
    new.phone,
    new.raw_user_meta_data ->> 'avatar_url'
  );

  if raw_security_question is not null and raw_security_answer_hash is not null then
    insert into public.password_recovery_questions (user_id, question, answer_hash)
    values (new.id, raw_security_question, raw_security_answer_hash);
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- 2. RLS: prevent users from inserting profiles with role != 'customer'
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id and role = 'customer');

-- 3. RLS: prevent users from changing their own role
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

-- 4. Admin-only RPC to change any user's role
create or replace function public.admin_set_user_role(p_user_id uuid, p_new_role public.app_role)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only admins can change user roles';
  end if;

  update public.profiles
  set role = p_new_role, updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'User profile not found';
  end if;
end;
$$;

-- 5. Grant execute to authenticated users (RLS inside the function restricts to admins)
revoke execute on function public.admin_set_user_role from anon, public;
grant execute on function public.admin_set_user_role to authenticated;

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

-- RayoExpress | Migration 011: Storage buckets, RLS policies, and signed URL helpers
-- Creates all required buckets, sets file size limits via RLS check constraints,
-- and defines per-role access policies for storage.objects.

-- ============================================================
-- 1. Helper: check if the current user is an admin
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ============================================================
-- 2. Helper: check if the current user is the owner of a store
-- ============================================================
create or replace function public.is_store_owner(store_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.stores where id::text = store_id and owner_id = auth.uid());
$$;

-- ============================================================
-- 3. Helper: check file size limit (max 10 MB for all uploads)
-- ============================================================
create or replace function public.storage_file_valid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.bucket_id in ('product-images', 'delivery-evidence', 'receipts', 'avatars', 'driver-documents', 'application-documents') then
    if new.metadata->>'size' is not null and (new.metadata->>'size')::bigint > 10485760 then
      raise exception 'FILE_TOO_LARGE: El archivo excede el límite de 10 MB';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists check_file_size_on_insert on storage.objects;
create trigger check_file_size_on_insert
  before insert on storage.objects
  for each row execute function public.storage_file_valid();

-- ============================================================
-- 4. Ensure buckets exist (idempotent via insert-or-ignore)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, '{image/jpeg,image/png,image/webp}'),
  ('avatars', 'avatars', true, 2097152, '{image/jpeg,image/png,image/webp}'),
  ('delivery-evidence', 'delivery-evidence', false, 10485760, '{image/jpeg,image/png,image/webp}'),
  ('receipts', 'receipts', false, 10485760, '{image/jpeg,image/png,image/webp,application/pdf}'),
  ('driver-documents', 'driver-documents', true, 10485760, '{image/jpeg,image/png,image/webp,application/pdf}'),
  ('application-documents', 'application-documents', false, 10485760, '{image/jpeg,image/png,image/webp,application/pdf}')
on conflict (id) do nothing;

-- ============================================================
-- 5. Drop all existing storage policies to recreate cleanly
-- ============================================================
do $$ declare
  pol record;
begin
  for pol in
    select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end $$;

-- ============================================================
-- 6. RLS policies for storage.objects
-- ============================================================

-- 6a. product-images (PUBLIC bucket — anyone can SELECT)
create policy "product_images_select" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product_images_insert" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
  );

create policy "product_images_update" on storage.objects
  for update using (
    bucket_id = 'product-images'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

create policy "product_images_delete" on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

-- 6b. avatars (PUBLIC bucket — anyone can SELECT)
create policy "avatars_select" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );

create policy "avatars_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

create policy "avatars_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

-- 6c. delivery-evidence (PRIVATE — owner or admin)
create policy "delivery_evidence_select" on storage.objects
  for select using (
    bucket_id = 'delivery-evidence'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

create policy "delivery_evidence_insert" on storage.objects
  for insert with check (
    bucket_id = 'delivery-evidence'
    and auth.role() = 'authenticated'
  );

create policy "delivery_evidence_delete" on storage.objects
  for delete using (
    bucket_id = 'delivery-evidence'
    and public.is_admin()
  );

-- 6d. receipts (PRIVATE — owner or admin)
create policy "receipts_select" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

create policy "receipts_insert" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
  );

create policy "receipts_delete" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and public.is_admin()
  );

-- 6e. driver-documents (PRIVATE — owner or admin)
create policy "driver_documents_select" on storage.objects
  for select using (
    bucket_id = 'driver-documents'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

create policy "driver_documents_insert" on storage.objects
  for insert with check (
    bucket_id = 'driver-documents'
    and auth.role() = 'authenticated'
  );

create policy "driver_documents_delete" on storage.objects
  for delete using (
    bucket_id = 'driver-documents'
    and public.is_admin()
  );

-- 6f. application-documents (PRIVATE — owner or admin)
create policy "application_documents_select" on storage.objects
  for select using (
    bucket_id = 'application-documents'
    and (owner_id = auth.uid()::text or public.is_admin())
  );

create policy "application_documents_insert" on storage.objects
  for insert with check (
    bucket_id = 'application-documents'
    and auth.role() = 'authenticated'
  );

create policy "application_documents_delete" on storage.objects
  for delete using (
    bucket_id = 'application-documents'
    and public.is_admin()
  );

-- 012_driver_application_fields.sql
-- Add new fields for driver applications: documents, contract, contact

ALTER TABLE public.driver_applications
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS id_card_front_url TEXT,
  ADD COLUMN IF NOT EXISTS id_card_back_url TEXT,
  ADD COLUMN IF NOT EXISTS motorcycle_docs_url TEXT,
  ADD COLUMN IF NOT EXISTS license_url TEXT,
  ADD COLUMN IF NOT EXISTS contract_url TEXT,
  ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT false;

-- Keep production access constrained to a single administrator account.
create or replace function public.enforce_single_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'admin' and exists (
    select 1
    from public.profiles
    where role = 'admin'
      and id <> new.id
  ) then
    raise exception 'Only one admin account is allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_single_admin_profiles on public.profiles;
create trigger enforce_single_admin_profiles
before insert or update of role on public.profiles
for each row
execute function public.enforce_single_admin();

-- Migration 014: Fix critical RLS, constraint, and state machine issues

-- ============================================================
-- BUG 1: Enable RLS on delivery_codes and store_schedules
-- (policies exist but RLS was never enabled)
-- ============================================================
alter table public.delivery_codes enable row level security;
alter table public.store_schedules enable row level security;

-- ============================================================
-- BUG 2: Replace raw_user_meta_data-based admin checks with
-- secure profiles.role lookups (privilege escalation fix)
-- ============================================================
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "stores_update_owner" on public.stores;
create policy "stores_update_owner" on public.stores
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "orders_select_admin" on public.orders;
create policy "orders_select_admin" on public.orders
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "order_items_select_admin" on public.order_items;
create policy "order_items_select_admin" on public.order_items
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "store_applications_select_admin" on public.store_applications;
create policy "store_applications_select_admin" on public.store_applications
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "driver_applications_select_admin" on public.driver_applications;
create policy "driver_applications_select_admin" on public.driver_applications
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- BUG 3: Add UNIQUE constraint to promotions.code
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'promotions_code_key') then
    alter table public.promotions add constraint promotions_code_key unique (code);
  end if;
end $$;

-- ============================================================
-- BUG 4: Add UNIQUE constraint to categories.name
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'categories_name_key') then
    alter table public.categories add constraint categories_name_key unique (name);
  end if;
end $$;

-- ============================================================
-- BUG 5: State machine — allow transitions TO refunded from
-- delivered and cancelled (currently unreachable enum value)
-- ============================================================
create or replace function public.validate_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'pending' and new.status not in ('accepted', 'cancelled') then
    raise exception 'Invalid transition: pending -> %', new.status;
  end if;
  if old.status = 'accepted' and new.status not in ('preparing', 'cancelled') then
    raise exception 'Invalid transition: accepted -> %', new.status;
  end if;
  if old.status = 'preparing' and new.status not in ('picked_up', 'cancelled') then
    raise exception 'Invalid transition: preparing -> %', new.status;
  end if;
  if old.status = 'picked_up' and new.status not in ('on_the_way') then
    raise exception 'Invalid transition: picked_up -> %', new.status;
  end if;
  if old.status = 'on_the_way' and new.status not in ('arrived', 'delivered') then
    raise exception 'Invalid transition: on_the_way -> %', new.status;
  end if;
  if old.status = 'arrived' and new.status not in ('delivered') then
    raise exception 'Invalid transition: arrived -> %', new.status;
  end if;
  if old.status = 'delivered' and new.status not in ('refunded') then
    raise exception 'Invalid transition: delivered -> %', new.status;
  end if;
  if old.status = 'cancelled' and new.status not in ('refunded') then
    raise exception 'Invalid transition: cancelled -> %', new.status;
  end if;
  if old.status in ('refunded') then
    raise exception 'Cannot change status from final state: %', old.status;
  end if;
  return new;
end;
$$;
-- RayoExpress | Migration 012: RLS Policies
-- Adds missing RLS policies using raw_user_meta_data->>'role' for role checks

-- ============================================================
-- PROFILES
-- ============================================================
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (
    auth.role() = 'authenticated' and
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
  );

-- ============================================================
-- STORES
-- ============================================================
drop policy if exists "stores_select_open" on public.stores;
create policy "stores_select_open" on public.stores
  for select using (is_open = true);

drop policy if exists "stores_update_owner" on public.stores;
create policy "stores_update_owner" on public.stores
  for update using (
    auth.role() = 'authenticated' and (
      auth.uid() = owner_id or
      (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
    )
  );

-- ============================================================
-- CATEGORIES
-- ============================================================
drop policy if exists "categories_select_all" on public.categories;
create policy "categories_select_all" on public.categories
  for select using (true);

-- ============================================================
-- PRODUCTS
-- ============================================================
drop policy if exists "products_select_active" on public.products;
create policy "products_select_active" on public.products
  for select using (is_active = true or exists (
    select 1 from public.stores where id = store_id and owner_id = auth.uid()
  ));

drop policy if exists "products_insert_store" on public.products;
create policy "products_insert_store" on public.products
  for insert with check (
    exists (select 1 from public.stores where id = store_id and owner_id = auth.uid())
  );

drop policy if exists "products_update_store" on public.products;
create policy "products_update_store" on public.products
  for update using (
    exists (select 1 from public.stores where id = store_id and owner_id = auth.uid())
  );

drop policy if exists "products_delete_store" on public.products;
create policy "products_delete_store" on public.products
  for delete using (
    exists (select 1 from public.stores where id = store_id and owner_id = auth.uid())
  );

-- ============================================================
-- ORDERS
-- ============================================================
drop policy if exists "orders_select_customer" on public.orders;
create policy "orders_select_customer" on public.orders
  for select using (auth.uid() = customer_id);

drop policy if exists "orders_select_driver" on public.orders;
create policy "orders_select_driver" on public.orders
  for select using (auth.uid() = driver_id);

drop policy if exists "orders_select_store" on public.orders;
create policy "orders_select_store" on public.orders
  for select using (
    exists (select 1 from public.stores where id = store_id and owner_id = auth.uid())
  );

drop policy if exists "orders_select_admin" on public.orders;
create policy "orders_select_admin" on public.orders
  for select using (
    auth.role() = 'authenticated' and
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
  );

drop policy if exists "orders_insert_customer" on public.orders;
create policy "orders_insert_customer" on public.orders
  for insert with check (auth.uid() = customer_id);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
drop policy if exists "order_items_select_customer" on public.order_items;
create policy "order_items_select_customer" on public.order_items
  for select using (
    exists (select 1 from public.orders where id = order_id and customer_id = auth.uid())
  );

drop policy if exists "order_items_select_driver" on public.order_items;
create policy "order_items_select_driver" on public.order_items
  for select using (
    exists (select 1 from public.orders where id = order_id and driver_id = auth.uid())
  );

drop policy if exists "order_items_select_store" on public.order_items;
create policy "order_items_select_store" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      join public.stores s on s.id = o.store_id
      where o.id = order_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "order_items_select_admin" on public.order_items;
create policy "order_items_select_admin" on public.order_items
  for select using (
    auth.role() = 'authenticated' and
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
drop policy if exists "notifications_select_self" on public.notifications;
create policy "notifications_select_self" on public.notifications
  for select using (auth.uid() = user_id);

-- ============================================================
-- APPLICATIONS (store_applications & driver_applications)
-- ============================================================
drop policy if exists "store_applications_insert_self" on public.store_applications;
create policy "store_applications_insert_self" on public.store_applications
  for insert with check (auth.uid() = user_id);

drop policy if exists "driver_applications_insert_self" on public.driver_applications;
create policy "driver_applications_insert_self" on public.driver_applications
  for insert with check (auth.uid() = user_id);

drop policy if exists "store_applications_select_admin" on public.store_applications;
create policy "store_applications_select_admin" on public.store_applications
  for select using (
    auth.role() = 'authenticated' and
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
  );

drop policy if exists "driver_applications_select_admin" on public.driver_applications
  ;
create policy "driver_applications_select_admin" on public.driver_applications
  for select using (
    auth.role() = 'authenticated' and
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
  );


-- Migration 015: Fix recursive profiles RLS policies
--
-- Policies on public.profiles cannot query public.profiles directly because
-- that re-enters the same RLS policy and Postgres raises 42P17.

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.current_user_is_admin() to authenticated;

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (public.current_user_is_admin());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

do $$
begin
  if to_regclass('public.stores') is not null then
    drop policy if exists "stores_update_owner" on public.stores;
    create policy "stores_update_owner" on public.stores
      for update using (
        auth.uid() = owner_id
        or public.current_user_is_admin()
      )
      with check (
        auth.uid() = owner_id
        or public.current_user_is_admin()
      );
  end if;

  if to_regclass('public.orders') is not null then
    drop policy if exists "orders_select_admin" on public.orders;
    create policy "orders_select_admin" on public.orders
      for select using (public.current_user_is_admin());
  end if;

  if to_regclass('public.order_items') is not null then
    drop policy if exists "order_items_select_admin" on public.order_items;
    create policy "order_items_select_admin" on public.order_items
      for select using (public.current_user_is_admin());
  end if;

  if to_regclass('public.store_applications') is not null then
    drop policy if exists "store_applications_select_admin" on public.store_applications;
    create policy "store_applications_select_admin" on public.store_applications
      for select using (public.current_user_is_admin());
  end if;

  if to_regclass('public.driver_applications') is not null then
    drop policy if exists "driver_applications_select_admin" on public.driver_applications;
    create policy "driver_applications_select_admin" on public.driver_applications
      for select using (public.current_user_is_admin());
  end if;
end $$;

-- Add missing tables for client module (addresses, favorites)

-- Addresses table
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Dirección guardada',
  line1 text not null,
  details text not null default '',
  is_default boolean not null default false,
  lat float,
  lng float,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_addresses_user on public.addresses(user_id);

alter table public.addresses enable row level security;

drop policy if exists "addresses_select" on public.addresses;
create policy "addresses_select" on public.addresses
  for select using (auth.uid() = user_id);

drop policy if exists "addresses_insert" on public.addresses;
create policy "addresses_insert" on public.addresses
  for insert with check (auth.uid() = user_id);

drop policy if exists "addresses_update" on public.addresses;
create policy "addresses_update" on public.addresses
  for update using (auth.uid() = user_id);

drop policy if exists "addresses_delete" on public.addresses;
create policy "addresses_delete" on public.addresses
  for delete using (auth.uid() = user_id);

-- Favorites table
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null,
  kind text not null check (kind in ('store', 'product')),
  name text not null,
  subtitle text not null default '',
  emoji text not null default '🏪',
  price float,
  created_at timestamptz not null default now()
);

create index if not exists idx_favorites_user on public.favorites(user_id);
create unique index if not exists idx_favorites_unique on public.favorites(user_id, item_id, kind);

alter table public.favorites enable row level security;

drop policy if exists "favorites_select" on public.favorites;
create policy "favorites_select" on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists "favorites_insert" on public.favorites;
create policy "favorites_insert" on public.favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "favorites_delete" on public.favorites;
create policy "favorites_delete" on public.favorites
  for delete using (auth.uid() = user_id);

-- RayoExpress | Migration 017: Driver dispatch and realtime tracking

CREATE OR REPLACE FUNCTION public.driver_claim_order(p_order_id UUID)
RETURNS TABLE (
  id UUID,
  total NUMERIC,
  status public.order_status,
  delivery_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  store_id UUID,
  store JSONB,
  customer JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_role public.app_role;
  v_claimed RECORD;
BEGIN
  v_driver_id := auth.uid();

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT profiles.role
  INTO v_role
  FROM public.profiles
  WHERE profiles.id = v_driver_id;

  IF v_role IS DISTINCT FROM 'driver' THEN
    RAISE EXCEPTION 'Solo los repartidores pueden tomar pedidos';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.drivers
    WHERE drivers.id = v_driver_id
      AND COALESCE(drivers.approved, false) = true
  ) THEN
    RAISE EXCEPTION 'Tu cuenta de repartidor aun no esta aprobada';
  END IF;

  UPDATE public.orders
  SET driver_id = v_driver_id
  WHERE orders.id = p_order_id
    AND orders.driver_id IS NULL
    AND orders.status IN ('accepted', 'preparing')
  RETURNING *
  INTO v_claimed;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no disponible';
  END IF;

  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES (v_driver_id, 'Pedido tomado', 'Ya tienes un pedido asignado para entregar', 'order');

  RETURN QUERY
  SELECT
    v_claimed.id,
    v_claimed.total,
    v_claimed.status,
    v_claimed.delivery_address,
    v_claimed.notes,
    v_claimed.created_at,
    v_claimed.store_id,
    jsonb_build_object('name', stores.name, 'emoji', stores.emoji),
    jsonb_build_object('full_name', profiles.full_name)
  FROM public.stores
  JOIN public.profiles ON profiles.id = v_claimed.customer_id
  WHERE stores.id = v_claimed.store_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.driver_claim_order(UUID) TO authenticated;

DROP POLICY IF EXISTS "orders_select_available_drivers" ON public.orders;
CREATE POLICY "orders_select_available_drivers" ON public.orders
  FOR SELECT USING (
    driver_id IS NULL
    AND status IN ('accepted', 'preparing')
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      JOIN public.drivers ON drivers.id = profiles.id
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'driver'
        AND COALESCE(drivers.approved, false) = true
    )
  );

DROP POLICY IF EXISTS "locations_insert" ON public.locations;
DROP POLICY IF EXISTS "locations_insert_driver_active_order" ON public.locations;
CREATE POLICY "locations_insert_driver_active_order" ON public.locations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      order_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.orders
        WHERE orders.id = order_id
          AND orders.driver_id = auth.uid()
          AND orders.status IN ('picked_up', 'on_the_way', 'arrived')
      )
    )
  );

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

