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
