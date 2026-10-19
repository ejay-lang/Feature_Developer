-- Profile records are created only by the trusted auth.users trigger.
-- Client signup metadata is untrusted; role and status are always assigned here.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null
    check (char_length(btrim(first_name)) between 1 and 100),
  last_name text not null
    check (char_length(btrim(last_name)) between 1 and 100),
  email text not null unique
    check (char_length(btrim(email)) between 3 and 254),
  role text not null default 'user'
    check (role in ('user', 'admin', 'superadmin')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'blocked', 'disabled', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_status_created_at_idx
  on public.profiles (status, created_at desc);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_name_value text := nullif(btrim(new.raw_user_meta_data ->> 'first_name'), '');
  last_name_value text := nullif(btrim(new.raw_user_meta_data ->> 'last_name'), '');
  email_value text := nullif(lower(btrim(new.email)), '');
begin
  if first_name_value is null
    or char_length(first_name_value) > 100
    or last_name_value is null
    or char_length(last_name_value) > 100
    or email_value is null
    or char_length(email_value) > 254 then
    raise exception 'Required profile fields are invalid'
      using errcode = '23514';
  end if;

  insert into public.profiles (
    id,
    first_name,
    last_name,
    email,
    role,
    status
  )
  values (
    new.id,
    first_name_value,
    last_name_value,
    email_value,
    'user',
    'pending'
  );

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profile_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
