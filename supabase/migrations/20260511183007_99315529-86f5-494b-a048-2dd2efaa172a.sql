
-- ============ HEALTH ============
create table public.health_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date date not null default current_date,
  sleep_hours numeric,
  water_cups integer,
  mood text,
  stress text,
  meds_taken boolean not null default false,
  mindfulness_minutes integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.health_checkins enable row level security;
create policy "own health_checkins all" on public.health_checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.movement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date date not null default current_date,
  activity text not null,
  minutes integer not null default 0,
  intensity text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.movement_logs enable row level security;
create policy "own movement_logs all" on public.movement_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date date not null default current_date,
  weight_lb numeric not null,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.weight_logs enable row level security;
create policy "own weight_logs all" on public.weight_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.health_goals (
  user_id uuid primary key,
  goal_type text not null default 'maintain',
  target_weight_lb numeric,
  target_calories integer,
  target_protein_g integer,
  weekly_movement_minutes integer not null default 150,
  updated_at timestamptz not null default now()
);
alter table public.health_goals enable row level security;
create policy "own health_goals all" on public.health_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ WEALTH ============
create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  monthly_limit numeric not null default 0,
  kind text not null default 'expense',
  color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.budget_categories enable row level security;
create policy "own budget_categories all" on public.budget_categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date date not null default current_date,
  amount numeric not null,
  kind text not null default 'expense',
  category_id uuid,
  note text,
  account text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create policy "own transactions all" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  amount numeric not null default 0,
  cadence text not null default 'monthly',
  next_charge_date date,
  category_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "own subscriptions all" on public.subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  balance numeric not null default 0,
  apr numeric not null default 0,
  min_payment numeric not null default 0,
  target_payoff_date date,
  strategy text not null default 'snowball',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.debts enable row level security;
create policy "own debts all" on public.debts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  amount numeric not null default 0,
  cadence text not null default 'monthly',
  next_due_date date,
  category_id uuid,
  notes text,
  auto_create_task boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.recurring_bills enable row level security;
create policy "own recurring_bills all" on public.recurring_bills for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ HOME ============
create table public.home_maintenance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  category text,
  last_done date,
  next_due date,
  interval_months integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.home_maintenance enable row level security;
create policy "own home_maintenance all" on public.home_maintenance for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.home_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  category text,
  file_path text not null,
  mime_type text,
  size_bytes bigint,
  expires_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.home_documents enable row level security;
create policy "own home_documents all" on public.home_documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.home_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text,
  body text,
  pinned boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.home_notes enable row level security;
create policy "own home_notes all" on public.home_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  color text,
  avatar_emoji text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.household_members enable row level security;
create policy "own household_members all" on public.household_members for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.chore_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  member_id uuid not null,
  title text not null,
  weekdays integer[] not null default '{}',
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.chore_assignments enable row level security;
create policy "own chore_assignments all" on public.chore_assignments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.chore_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  assignment_id uuid not null,
  member_id uuid not null,
  week_start date not null,
  weekday integer not null,
  done_at timestamptz not null default now(),
  unique (assignment_id, week_start, weekday)
);
alter table public.chore_completions enable row level security;
create policy "own chore_completions all" on public.chore_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- updated_at triggers
create trigger trg_health_checkins_updated before update on public.health_checkins for each row execute function public.set_updated_at();
create trigger trg_movement_logs_updated before update on public.movement_logs for each row execute function public.set_updated_at();
create trigger trg_health_goals_updated before update on public.health_goals for each row execute function public.set_updated_at();
create trigger trg_budget_categories_updated before update on public.budget_categories for each row execute function public.set_updated_at();
create trigger trg_transactions_updated before update on public.transactions for each row execute function public.set_updated_at();
create trigger trg_subscriptions_updated before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger trg_debts_updated before update on public.debts for each row execute function public.set_updated_at();
create trigger trg_recurring_bills_updated before update on public.recurring_bills for each row execute function public.set_updated_at();
create trigger trg_home_maintenance_updated before update on public.home_maintenance for each row execute function public.set_updated_at();
create trigger trg_home_documents_updated before update on public.home_documents for each row execute function public.set_updated_at();
create trigger trg_home_notes_updated before update on public.home_notes for each row execute function public.set_updated_at();
create trigger trg_household_members_updated before update on public.household_members for each row execute function public.set_updated_at();
create trigger trg_chore_assignments_updated before update on public.chore_assignments for each row execute function public.set_updated_at();

-- ============ STORAGE ============
insert into storage.buckets (id, name, public) values ('home-documents', 'home-documents', false)
on conflict (id) do nothing;

create policy "home-documents own select"
on storage.objects for select
using (bucket_id = 'home-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "home-documents own insert"
on storage.objects for insert
with check (bucket_id = 'home-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "home-documents own update"
on storage.objects for update
using (bucket_id = 'home-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "home-documents own delete"
on storage.objects for delete
using (bucket_id = 'home-documents' and auth.uid()::text = (storage.foldername(name))[1]);
