-- RayoExpress | Migration 019: Admin analytics views and helper functions

-- ============================================================
-- 1. View: admin_driver_stats — per-driver performance
-- ============================================================
create or replace view public.admin_driver_stats as
select
  d.id as driver_id,
  p.full_name,
  p.phone,
  p.is_suspended,
  d.is_online,
  d.approved,
  d.rating,
  d.vehicle_type,
  d.vehicle_plate,
  p.created_at as driver_since,
  coalesce(st.deliveries, 0) as total_deliveries,
  coalesce(st.total_earned, 0) as total_earned,
  coalesce(st.avg_rating, 0) as avg_rating
from public.drivers d
join public.profiles p on p.id = d.id
left join lateral (
  select
    count(*) as deliveries,
    coalesce(sum(o.total), 0) as total_earned,
    coalesce(avg(d2.rating), 0) as avg_rating
  from public.orders o
  left join public.drivers d2 on d2.id = o.driver_id
  where o.driver_id = d.id and o.status = 'delivered'
) st on true;

-- ============================================================
-- 2. View: admin_store_stats — per-store performance
-- ============================================================
create or replace view public.admin_store_stats as
select
  s.id as store_id,
  s.name as store_name,
  s.is_open,
  s.emoji,
  s.min_order,
  s.delivery_fee,
  p.full_name as owner_name,
  p.phone as owner_phone,
  s.created_at,
  coalesce(st.total_orders, 0) as total_orders,
  coalesce(st.total_revenue, 0) as total_revenue,
  coalesce(st.avg_order_value, 0) as avg_order_value,
  coalesce(st.product_count, 0) as product_count
from public.stores s
join public.profiles p on p.id = s.owner_id
left join lateral (
  select
    count(*) as total_orders,
    coalesce(sum(o.total), 0) as total_revenue,
    coalesce(avg(o.total), 0) as avg_order_value,
    (select count(*) from public.products where store_id = s.id and is_active = true) as product_count
  from public.orders o
  where o.store_id = s.id and o.status = 'delivered'
) st on true;

-- ============================================================
-- 3. Function: admin_search_users — search profiles by name/email/role
-- ============================================================
create or replace function public.admin_search_users(
  p_search text default '',
  p_role text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  role text,
  is_suspended boolean,
  created_at timestamptz,
  last_sign_in timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    u.email,
    p.phone,
    p.role::text,
    p.is_suspended,
    p.created_at,
    u.last_sign_in_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  where
    (p_search = '' or
     p.full_name ilike '%' || p_search || '%' or
     u.email ilike '%' || p_search || '%')
    and (p_role is null or p.role::text = p_role)
  order by p.created_at desc
  limit p_limit
  offset p_offset;
$$;

-- ============================================================
-- 4. Function: admin_toggle_suspend — suspend/unsuspend user
-- ============================================================
create or replace function public.admin_toggle_suspend(
  p_user_id uuid,
  p_suspended boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'PERMISSION_DENIED';
  end if;

  update public.profiles
  set is_suspended = p_suspended,
      updated_at = now()
  where id = p_user_id;

  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    case when p_suspended then 'suspend_user' else 'unsuspend_user' end,
    'profiles',
    p_user_id,
    jsonb_build_object('suspended', p_suspended)
  );

  return jsonb_build_object('ok', true, 'user_id', p_user_id, 'suspended', p_suspended);
end;
$$;

-- ============================================================
-- 5. Function: admin_get_driver_detail — driver full profile + orders
-- ============================================================
create or replace function public.admin_get_driver_detail(
  p_driver_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'driver', row_to_json(d.*),
    'profile', row_to_json(p.*),
    'recent_orders', coalesce((
      select jsonb_agg(row_to_json(o.*) order by o.created_at desc)
      from public.orders o
      where o.driver_id = p_driver_id
      limit 20
    ), '[]'::jsonb),
    'stats', (
      select jsonb_build_object(
        'total_deliveries', count(*),
        'total_earned', coalesce(sum(total), 0),
        'avg_rating', coalesce(avg(d2.rating), 0)
      )
      from public.orders o
      left join public.drivers d2 on d2.id = o.driver_id
      where o.driver_id = p_driver_id and o.status = 'delivered'
    )
  ) into v_result
  from public.drivers d
  join public.profiles p on p.id = d.id
  where d.id = p_driver_id;

  return v_result;
end;
$$;

-- ============================================================
-- 6. Function: admin_get_store_detail — store full profile + orders + products
-- ============================================================
create or replace function public.admin_get_store_detail(
  p_store_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'store', row_to_json(s.*),
    'owner', row_to_json(p.*),
    'products', coalesce((
      select jsonb_agg(row_to_json(pr.*))
      from public.products pr
      where pr.store_id = p_store_id
      order by pr.created_at desc
    ), '[]'::jsonb),
    'recent_orders', coalesce((
      select jsonb_agg(row_to_json(o.*) order by o.created_at desc)
      from public.orders o
      where o.store_id = p_store_id
      limit 20
    ), '[]'::jsonb),
    'stats', (
      select jsonb_build_object(
        'total_orders', count(*),
        'total_revenue', coalesce(sum(total), 0),
        'avg_order_value', coalesce(avg(total), 0)
      )
      from public.orders
      where store_id = p_store_id and status = 'delivered'
    )
  ) into v_result
  from public.stores s
  join public.profiles p on p.id = s.owner_id
  where s.id = p_store_id;

  return v_result;
end;
$$;

-- ============================================================
-- 7. Function: admin_get_recent_activity — feed of platform events
-- ============================================================
create or replace function public.admin_get_recent_activity(
  p_limit int default 20
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_agg(sub) from (
    select 'order' as type, o.id::text, o.status::text, o.total, o.created_at,
           p.full_name as customer_name, s.name as store_name, null::text as details
    from public.orders o
    left join public.profiles p on p.id = o.customer_id
    left join public.stores s on s.id = o.store_id
    union all
    select 'driver_application' as type, da.id::text, da.status, null::numeric, da.created_at,
           da.full_name, null::text, null::text
    from public.driver_applications da
    union all
    select 'store_application' as type, sa.id::text, sa.status, null::numeric, sa.created_at,
           sa.store_name, null::text, null::text
    from public.store_applications sa
    order by created_at desc
    limit p_limit
  ) sub;
$$;
