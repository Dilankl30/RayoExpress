-- Fix log_order_status_change to handle TG_OP = 'INSERT' safely
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (TG_OP = 'INSERT') then
    insert into public.order_status_history (order_id, status, from_status, to_status, changed_by)
    values (new.id, new.status, null, new.status::text, auth.uid());
  elsif (TG_OP = 'UPDATE') then
    if old.status is distinct from new.status then
      insert into public.order_status_history (order_id, status, from_status, to_status, changed_by)
      values (new.id, new.status, old.status::text, new.status::text, auth.uid());
    end if;
  end if;
  return new;
end;
$$;
