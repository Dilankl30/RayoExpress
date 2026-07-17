create table if not exists public.order_change_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  reason text not null,
  proposed_items jsonb not null default '[]'::jsonb,
  price_delta numeric(10,2) not null default 0,
  new_total numeric(10,2),
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists idx_order_change_requests_order_id on public.order_change_requests(order_id);
create index if not exists idx_order_change_requests_customer_id on public.order_change_requests(customer_id);
create index if not exists idx_order_change_requests_store_id on public.order_change_requests(store_id);
create index if not exists idx_order_change_requests_pending on public.order_change_requests(order_id, status) where status = 'pending';

alter table public.order_change_requests enable row level security;

create or replace function public.set_order_change_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_order_change_requests_updated_at on public.order_change_requests;
create trigger trg_order_change_requests_updated_at
  before update on public.order_change_requests
  for each row
  execute function public.set_order_change_requests_updated_at();

do $$
begin
  execute 'create policy "order_change_requests_select_participants" on public.order_change_requests
    for select using (
      customer_id = auth.uid()
      or requested_by = auth.uid()
      or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin'')
    )';
exception when duplicate_object then null;
end $$;

do $$
begin
  execute 'create policy "order_change_requests_insert_store_admin" on public.order_change_requests
    for insert with check (
      requested_by = auth.uid()
      and exists (
        select 1 from public.orders o
        where o.id = order_id and o.store_id = store_id and o.customer_id = customer_id
      )
      and (
        exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin'')
      )
    )';
exception when duplicate_object then null;
end $$;

do $$
begin
  execute 'create policy "order_change_requests_customer_response" on public.order_change_requests
    for update using (
      customer_id = auth.uid() and status = ''pending''
    )
    with check (
      customer_id = auth.uid() and status in (''accepted'', ''rejected'')
    )';
exception when duplicate_object then null;
end $$;

do $$
begin
  execute 'create policy "order_change_requests_store_cancel" on public.order_change_requests
    for update using (
      exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin'')
    )
    with check (
      exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin'')
    )';
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.order_change_requests;
exception when duplicate_object then null;
end $$;
