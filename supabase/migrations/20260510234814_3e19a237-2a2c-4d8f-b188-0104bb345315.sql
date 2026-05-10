
-- Routines per person/slot
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  person_name text not null,
  slot text not null check (slot in ('morning','nap','evening')),
  items jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, person_name, slot)
);
alter table public.routines enable row level security;
create policy "own routines all" on public.routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger trg_routines_updated_at before update on public.routines
  for each row execute function public.set_updated_at();

-- Widget text overrides
create table public.widget_text_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  widget_id text not null,
  field text not null,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, widget_id, field)
);
alter table public.widget_text_overrides enable row level security;
create policy "own widget_text_overrides all" on public.widget_text_overrides
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger trg_widget_text_overrides_updated_at before update on public.widget_text_overrides
  for each row execute function public.set_updated_at();

-- Meal name on pomodoro sessions
alter table public.pomodoro_sessions add column if not exists meal_name text;
