
create table public.google_calendar_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.google_calendar_tokens enable row level security;
create policy "own gcal tokens all" on public.google_calendar_tokens for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger trg_gcal_tokens_updated before update on public.google_calendar_tokens for each row execute function public.set_updated_at();

create table public.google_calendar_selected (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  calendar_id text not null,
  summary text,
  color text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, calendar_id)
);
alter table public.google_calendar_selected enable row level security;
create policy "own gcal selected all" on public.google_calendar_selected for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger trg_gcal_selected_updated before update on public.google_calendar_selected for each row execute function public.set_updated_at();
