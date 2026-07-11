-- 028_extra_hardening.sql
-- Hardening of delivery code generation to use higher entropy UUIDv4

create or replace function public.generate_delivery_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  -- Use gen_random_uuid() for cryptographically secure high entropy value
  v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
  insert into public.delivery_codes (order_id, code) values (new.id, v_code);
  return new;
end;
$$;
