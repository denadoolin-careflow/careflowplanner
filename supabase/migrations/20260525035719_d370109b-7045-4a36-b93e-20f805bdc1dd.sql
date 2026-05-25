
-- Roles
do $$ begin
  create type public.app_role as enum ('admin', 'moderator', 'user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

drop policy if exists "Users can view their own roles" on public.user_roles;
create policy "Users can view their own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins can manage roles" on public.user_roles;
create policy "Admins can manage roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Waitlist
create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  archetype text,
  reason text,
  quiz_score jsonb,
  source text,
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_signups_email_unique
  on public.waitlist_signups (lower(email));

alter table public.waitlist_signups enable row level security;

create or replace function public.normalize_waitlist_email()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.email := lower(trim(new.email));
  if new.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Invalid email address';
  end if;
  new.name := trim(new.name);
  if length(new.name) = 0 then raise exception 'Name is required'; end if;
  if new.reason is not null and length(new.reason) > 500 then
    raise exception 'Reason must be 500 characters or fewer';
  end if;
  return new;
end $$;

drop trigger if exists trg_waitlist_normalize on public.waitlist_signups;
create trigger trg_waitlist_normalize
  before insert or update on public.waitlist_signups
  for each row execute function public.normalize_waitlist_email();

drop policy if exists "Anyone can join the waitlist" on public.waitlist_signups;
create policy "Anyone can join the waitlist"
  on public.waitlist_signups for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Admins can view waitlist" on public.waitlist_signups;
create policy "Admins can view waitlist"
  on public.waitlist_signups for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update waitlist" on public.waitlist_signups;
create policy "Admins can update waitlist"
  on public.waitlist_signups for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete waitlist" on public.waitlist_signups;
create policy "Admins can delete waitlist"
  on public.waitlist_signups for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));
