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
