-- RayoExpress | Migration 021: Add city support to stores and applications

alter table public.stores
  add column if not exists city text;

alter table public.store_applications
  add column if not exists city text;

-- Index for fast city-based store lookups
create index if not exists idx_stores_city on public.stores(city);
