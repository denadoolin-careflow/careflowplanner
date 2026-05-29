create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  year_month text not null, -- 'YYYY-MM'
  weighted_calls integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, year_month)
);

create index idx_ai_usage_user_month on public.ai_usage(user_id, year_month);

grant select on public.ai_usage to authenticated;
grant all on public.ai_usage to service_role;

alter table public.ai_usage enable row level security;

create policy "Users can view own AI usage"
  on public.ai_usage for select
  using (auth.uid() = user_id);

create policy "Service role can manage AI usage"
  on public.ai_usage for all
  using (auth.role() = 'service_role');

create or replace function public.increment_ai_usage(
  p_user_id uuid,
  p_year_month text,
  p_weight integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  insert into public.ai_usage (user_id, year_month, weighted_calls)
  values (p_user_id, p_year_month, p_weight)
  on conflict (user_id, year_month)
  do update set
    weighted_calls = public.ai_usage.weighted_calls + p_weight,
    updated_at = now()
  returning weighted_calls into new_total;
  return new_total;
end;
$$;

revoke execute on function public.increment_ai_usage(uuid, text, integer) from public, anon, authenticated;