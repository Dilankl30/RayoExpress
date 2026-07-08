create or replace function public.admin_delete_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'PERMISSION_DENIED';
  end if;

  select email into v_email from auth.users where id = p_user_id;

  delete from public.profiles where id = p_user_id;

  insert into public.audit_log (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'delete_user', 'profiles', p_user_id, jsonb_build_object('deleted_email', v_email));

  return jsonb_build_object('ok', true, 'user_id', p_user_id);
end;
$$;
