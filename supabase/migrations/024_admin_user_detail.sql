-- Admin user detail RPC
-- Exposes user profile data, linked auth email, addresses and recent orders

drop function if exists public.admin_get_user_detail(uuid) cascade;

create or replace function public.admin_get_user_detail(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_result jsonb;
begin
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  )
  into v_is_admin;

  if not v_is_admin then
    raise exception 'PERMISSION_DENIED';
  end if;

  if not public.current_user_is_active() then
    raise exception 'ACCOUNT_SUSPENDED';
  end if;

  select jsonb_build_object(
    'profile', jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'email', u.email,
      'phone', p.phone,
      'role', p.role,
      'avatar_url', p.avatar_url,
      'is_suspended', p.is_suspended,
      'created_at', p.created_at,
      'last_sign_in', u.last_sign_in_at
    ),
    'addresses', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'title', a.title,
          'line1', a.line1,
          'details', a.details,
          'is_default', a.is_default,
          'lat', a.lat,
          'lng', a.lng,
          'created_at', a.created_at
        )
        order by a.created_at desc
      )
      from public.addresses a
      where a.user_id = p_user_id
    ), '[]'::jsonb),
    'recent_orders', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ord.id,
          'status', ord.status,
          'total', ord.total,
          'delivery_address', ord.delivery_address,
          'created_at', ord.created_at,
          'updated_at', ord.updated_at,
          'store_name', ord.store_name,
          'store_emoji', ord.store_emoji,
          'items_count', ord.items_count
        )
        order by ord.created_at desc
      )
      from (
        select
          o.id,
          o.status,
          o.total,
          o.delivery_address,
          o.created_at,
          o.updated_at,
          s.name as store_name,
          s.emoji as store_emoji,
          (
            select count(*)
            from public.order_items oi
            where oi.order_id = o.id
          ) as items_count
        from public.orders o
        left join public.stores s on s.id = o.store_id
        where o.customer_id = p_user_id
        order by o.created_at desc
        limit 10
      ) ord
    ), '[]'::jsonb),
    'stats', jsonb_build_object(
      'total_orders', (
        select count(*)
        from public.orders o
        where o.customer_id = p_user_id
      ),
      'total_spent', coalesce((
        select sum(o.total)
        from public.orders o
        where o.customer_id = p_user_id
      ), 0),
      'default_addresses', (
        select count(*)
        from public.addresses a
        where a.user_id = p_user_id
          and a.is_default = true
      ),
      'last_order_at', (
        select max(o.created_at)
        from public.orders o
        where o.customer_id = p_user_id
      )
    )
  )
  into v_result
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.id = p_user_id;

  return v_result;
end;
$$;

revoke all on function public.admin_get_user_detail from public, anon;
grant execute on function public.admin_get_user_detail to authenticated;
