-- RayoExpress | Migration 035: Admin dashboard summary RPC

drop function if exists public.admin_get_dashboard_summary(text) cascade;

create or replace function public.admin_get_dashboard_summary(
  p_period text default '7d'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period interval;
  v_start timestamptz;
  v_result jsonb;
begin
  if not public.current_user_is_active() or not public.current_user_is_admin() then
    raise exception 'PERMISSION_DENIED';
  end if;

  case p_period
    when '24h' then v_period := interval '24 hours';
    when '7d' then v_period := interval '7 days';
    when '30d' then v_period := interval '30 days';
    when '90d' then v_period := interval '90 days';
    else v_period := interval '7 days';
  end case;

  v_start := now() - v_period;

  with
  period_orders as (
    select
      o.id,
      o.customer_id,
      o.store_id,
      o.driver_id,
      o.status::text as status,
      o.total,
      o.created_at
    from public.orders o
    where o.created_at >= v_start
  ),
  month_series as (
    select generate_series(
      date_trunc('month', now()) - interval '5 months',
      date_trunc('month', now()),
      interval '1 month'
    ) as month_start
  ),
  month_rollup as (
    select
      date_trunc('month', o.created_at) as month_start,
      round(coalesce(sum(o.total) filter (where o.status = 'delivered'), 0), 2) as sales,
      count(*) filter (where o.status = 'delivered')::int as orders
    from public.orders o
    where o.created_at >= (date_trunc('month', now()) - interval '5 months')
    group by 1
  ),
  day_series as (
    select generate_series(
      date_trunc('day', now()) - interval '6 days',
      date_trunc('day', now()),
      interval '1 day'
    ) as day_start
  ),
  day_rollup as (
    select
      date_trunc('day', o.created_at) as day_start,
      count(*)::int as orders
    from public.orders o
    where o.created_at >= (date_trunc('day', now()) - interval '6 days')
    group by 1
  ),
  category_rollup as (
    select
      coalesce(c.name, 'Sin categoria') as name,
      sum(oi.quantity)::numeric as value
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    left join public.products p on p.id = oi.product_id
    left join public.categories c on c.id = p.category_id
    where o.created_at >= v_start
      and o.status = 'delivered'
    group by 1
    order by value desc, name asc
    limit 5
  ),
  recent_orders as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', o.id::text,
      'client', coalesce(cp.full_name, 'Usuario'),
      'store', coalesce(s.name, 'Tienda'),
      'amount', o.total,
      'status', o.status::text,
      'created_at', o.created_at
    ) order by o.created_at desc), '[]'::jsonb) as items
    from (
      select *
      from period_orders
      order by created_at desc
      limit 10
    ) o
    left join public.profiles cp on cp.id = o.customer_id
    left join public.stores s on s.id = o.store_id
  ),
  recent_users as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id::text,
      'full_name', p.full_name,
      'role', p.role::text,
      'is_suspended', p.is_suspended,
      'created_at', p.created_at
    ) order by p.created_at desc), '[]'::jsonb) as items
    from (
      select *
      from public.profiles
      order by created_at desc
      limit 10
    ) p
  )
  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'salesToday', (
        select round(coalesce(sum(total), 0), 2)
        from period_orders
        where status = 'delivered'
      ),
      'activeOrders', (select count(*)::int from period_orders),
      'activeCustomers', (
        select count(*)::int
        from public.profiles p
        where p.role = 'customer' and coalesce(p.is_suspended, false) = false
      ),
      'activeStores', (
        select count(*)::int
        from public.stores s
        where coalesce(s.is_open, false) = true
      ),
      'onlineDrivers', (
        select count(*)::int
        from public.profiles p
        join public.drivers d on d.id = p.id
        where p.role = 'driver'
          and coalesce(p.is_suspended, false) = false
          and coalesce(d.approved, false) = true
          and coalesce(d.is_online, false) = true
      ),
      'platformRevenue', (
        select round(coalesce(sum(total), 0) * 0.10, 2)
        from period_orders
        where status = 'delivered'
      )
    ),
    'monthly_sales', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month',
          case extract(month from ms.month_start)::int
            when 1 then 'Ene' when 2 then 'Feb' when 3 then 'Mar' when 4 then 'Abr'
            when 5 then 'May' when 6 then 'Jun' when 7 then 'Jul' when 8 then 'Ago'
            when 9 then 'Sep' when 10 then 'Oct' when 11 then 'Nov' when 12 then 'Dic'
          end,
        'sales', coalesce(mr.sales, 0),
        'orders', coalesce(mr.orders, 0)
      ) order by ms.month_start)
      from month_series ms
      left join month_rollup mr on mr.month_start = ms.month_start
    ), '[]'::jsonb),
    'daily_orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day',
          case extract(dow from ds.day_start)::int
            when 0 then 'D' when 1 then 'L' when 2 then 'M' when 3 then 'X'
            when 4 then 'J' when 5 then 'V' when 6 then 'S'
          end,
        'orders', coalesce(dr.orders, 0)
      ) order by ds.day_start)
      from day_series ds
      left join day_rollup dr on dr.day_start = ds.day_start
    ), '[]'::jsonb),
    'category_distribution', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'value', value)) from category_rollup), '[]'::jsonb),
    'recent_orders', (select items from recent_orders),
    'user_counts', jsonb_build_object(
      'customers', (select count(*)::int from public.profiles where role = 'customer'),
      'stores', (select count(*)::int from public.profiles where role = 'store'),
      'drivers', (select count(*)::int from public.profiles where role = 'driver'),
      'admins', (select count(*)::int from public.profiles where role = 'admin')
    ),
    'recent_users', (select items from recent_users)
  ) into v_result;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

revoke all on function public.admin_get_dashboard_summary from public, anon;
grant execute on function public.admin_get_dashboard_summary to authenticated;
