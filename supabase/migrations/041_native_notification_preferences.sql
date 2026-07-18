-- RayoExpress | Migration 041: native notification preferences and push tokens

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop trigger if exists notification_preferences_updated_at on public.notification_preferences;
create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.handle_updated_at();

drop policy if exists "notification_preferences_select_self_or_admin" on public.notification_preferences;
create policy "notification_preferences_select_self_or_admin"
  on public.notification_preferences
  for select
  using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists "notification_preferences_insert_self" on public.notification_preferences;
create policy "notification_preferences_insert_self"
  on public.notification_preferences
  for insert
  with check (user_id = auth.uid());

drop policy if exists "notification_preferences_update_self" on public.notification_preferences;
create policy "notification_preferences_update_self"
  on public.notification_preferences
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notification_preferences_admin_all" on public.notification_preferences;
create policy "notification_preferences_admin_all"
  on public.notification_preferences
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create table if not exists public.push_device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token)
);

create index if not exists idx_push_device_tokens_user_enabled
  on public.push_device_tokens(user_id, enabled);

alter table public.push_device_tokens enable row level security;

drop trigger if exists push_device_tokens_updated_at on public.push_device_tokens;
create trigger push_device_tokens_updated_at
  before update on public.push_device_tokens
  for each row execute function public.handle_updated_at();

drop policy if exists "push_device_tokens_select_self_or_admin" on public.push_device_tokens;
create policy "push_device_tokens_select_self_or_admin"
  on public.push_device_tokens
  for select
  using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists "push_device_tokens_insert_self" on public.push_device_tokens;
create policy "push_device_tokens_insert_self"
  on public.push_device_tokens
  for insert
  with check (user_id = auth.uid());

drop policy if exists "push_device_tokens_update_self" on public.push_device_tokens;
create policy "push_device_tokens_update_self"
  on public.push_device_tokens
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "push_device_tokens_delete_self" on public.push_device_tokens;
create policy "push_device_tokens_delete_self"
  on public.push_device_tokens
  for delete
  using (user_id = auth.uid());

drop policy if exists "push_device_tokens_admin_all" on public.push_device_tokens;
create policy "push_device_tokens_admin_all"
  on public.push_device_tokens
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
