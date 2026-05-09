
-- Helper: updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text,
  planning_style text not null default 'gentle',
  time_zone text not null default 'UTC',
  low_energy_mode boolean not null default false,
  theme text not null default 'system',
  energy_today text,
  energy_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generic table builder via repeated DDL
-- TASKS
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  done boolean not null default false,
  due_date date,
  priority text not null default 'medium',
  area text not null default 'Personal',
  tags text[] not null default '{}',
  energy text,
  est_minutes int,
  goal_id uuid,
  recipient_id uuid,
  day_part text,
  is_top_three boolean not null default false,
  status text not null default 'active', -- active|someday|this_week|waiting|done
  recurrence_type text not null default 'none', -- none|daily|weekly|monthly|custom
  recurrence_interval int not null default 1,
  recurrence_days int[] not null default '{}', -- 0=Sun..6=Sat
  next_due_date date,
  last_completed_at timestamptz,
  auto_reset boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;
create policy "own tasks all" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger tasks_updated before update on public.tasks for each row execute function public.set_updated_at();
create index tasks_user_due on public.tasks(user_id, due_date);

-- CLEANING TASKS
create table public.cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  zone text not null default 'Whole home',
  cadence text not null default 'weekly',
  recurrence_type text not null default 'weekly',
  recurrence_interval int not null default 1,
  recurrence_days int[] not null default '{}',
  weekday int, -- 0..6 anchor day for weekly resets
  done boolean not null default false,
  last_done date,
  next_due_date date,
  last_completed_at timestamptz,
  auto_reset boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cleaning_tasks enable row level security;
create policy "own cleaning all" on public.cleaning_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger cleaning_updated before update on public.cleaning_tasks for each row execute function public.set_updated_at();

-- GOALS
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'Personal',
  timeline text not null default 'Year',
  progress int not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.goals enable row level security;
create policy "own goals all" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger goals_updated before update on public.goals for each row execute function public.set_updated_at();

-- HABITS
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  cadence text not null default 'daily',
  category text not null default 'self-care',
  streak int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.habits enable row level security;
create policy "own habits all" on public.habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger habits_updated before update on public.habits for each row execute function public.set_updated_at();

-- HABIT LOGS
create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  done boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(habit_id, date)
);
alter table public.habit_logs enable row level security;
create policy "own habitlogs all" on public.habit_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger habitlogs_updated before update on public.habit_logs for each row execute function public.set_updated_at();

-- JOURNAL
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  type text not null default 'daily',
  title text,
  body text not null,
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.journal_entries enable row level security;
create policy "own journal all" on public.journal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger journal_updated before update on public.journal_entries for each row execute function public.set_updated_at();

-- IDEAS
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  category text not null default 'future plans',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ideas enable row level security;
create policy "own ideas all" on public.ideas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger ideas_updated before update on public.ideas for each row execute function public.set_updated_at();

-- MEALS
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  slot text not null,
  name text not null,
  notes text,
  kid_safe boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.meals enable row level security;
create policy "own meals all" on public.meals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger meals_updated before update on public.meals for each row execute function public.set_updated_at();

-- GROCERY
create table public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  qty text,
  category text,
  bought boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.grocery_items enable row level security;
create policy "own grocery all" on public.grocery_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger grocery_updated before update on public.grocery_items for each row execute function public.set_updated_at();

-- APPOINTMENTS
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  time text,
  title text not null,
  with_name text,
  location text,
  recipient_id uuid,
  type text default 'other',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.appointments enable row level security;
create policy "own appts all" on public.appointments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger appts_updated before update on public.appointments for each row execute function public.set_updated_at();

-- BIRTHDAYS
create table public.birthdays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date date not null,
  relation text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.birthdays enable row level security;
create policy "own bdays all" on public.birthdays for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger bdays_updated before update on public.birthdays for each row execute function public.set_updated_at();

-- HOLIDAYS
create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.holidays enable row level security;
create policy "own holidays all" on public.holidays for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger holidays_updated before update on public.holidays for each row execute function public.set_updated_at();

-- CARE RECIPIENTS
create table public.care_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'self',
  notes text,
  sensory text,
  contacts jsonb not null default '[]'::jsonb,
  meds jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.care_recipients enable row level security;
create policy "own recipients all" on public.care_recipients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger recipients_updated before update on public.care_recipients for each row execute function public.set_updated_at();

-- CARE NOTES
create table public.care_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  date date not null default current_date,
  body text not null,
  tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.care_notes enable row level security;
create policy "own carenotes all" on public.care_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger carenotes_updated before update on public.care_notes for each row execute function public.set_updated_at();
