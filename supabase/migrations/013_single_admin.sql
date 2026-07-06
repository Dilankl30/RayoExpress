-- Keep production access constrained to a single administrator account.
create or replace function public.enforce_single_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'admin' and exists (
    select 1
    from public.profiles
    where role = 'admin'
      and id <> new.id
  ) then
    raise exception 'Only one admin account is allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_single_admin_profiles on public.profiles;
create trigger enforce_single_admin_profiles
before insert or update of role on public.profiles
for each row
execute function public.enforce_single_admin();
