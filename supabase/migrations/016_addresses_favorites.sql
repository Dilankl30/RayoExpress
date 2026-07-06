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
