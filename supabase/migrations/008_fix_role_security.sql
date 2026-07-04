-- 008_fix_role_security.sql
-- Security hardening: prevent public registration as admin

-- 1. Fix handle_new_user to NEVER trust client-sent role
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_full_name text;
  raw_security_question text;
  raw_security_answer_hash text;
begin
  raw_full_name := new.raw_user_meta_data ->> 'full_name';
  raw_security_question := new.raw_user_meta_data ->> 'security_question';
  raw_security_answer_hash := new.raw_user_meta_data ->> 'security_answer_hash';

  insert into public.profiles (id, role, full_name, phone, avatar_url)
  values (
    new.id,
    'customer',
    raw_full_name,
    new.phone,
    new.raw_user_meta_data ->> 'avatar_url'
  );

  if raw_security_question is not null and raw_security_answer_hash is not null then
    insert into public.password_recovery_questions (user_id, question, answer_hash)
    values (new.id, raw_security_question, raw_security_answer_hash);
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- 2. RLS: prevent users from inserting profiles with role != 'customer'
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id and role = 'customer');

-- 3. RLS: prevent users from changing their own role
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

-- 4. Admin-only RPC to change any user's role
create or replace function public.admin_set_user_role(p_user_id uuid, p_new_role public.app_role)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only admins can change user roles';
  end if;

  update public.profiles
  set role = p_new_role, updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'User profile not found';
  end if;
end;
$$;

-- 5. Grant execute to authenticated users (RLS inside the function restricts to admins)
revoke execute on function public.admin_set_user_role from anon, public;
grant execute on function public.admin_set_user_role to authenticated;
