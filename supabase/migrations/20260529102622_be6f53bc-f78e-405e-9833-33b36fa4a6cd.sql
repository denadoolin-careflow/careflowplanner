create table public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  paddle_subscription_id text not null unique,
  paddle_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_billing_subscriptions_user_id on public.billing_subscriptions(user_id);
create index idx_billing_subscriptions_paddle_id on public.billing_subscriptions(paddle_subscription_id);

grant select on public.billing_subscriptions to authenticated;
grant all on public.billing_subscriptions to service_role;

alter table public.billing_subscriptions enable row level security;

create policy "Users can view own billing subscription"
  on public.billing_subscriptions for select
  using (auth.uid() = user_id);

create policy "Service role can manage billing subscriptions"
  on public.billing_subscriptions for all
  using (auth.role() = 'service_role');

create trigger billing_subscriptions_updated_at
  before update on public.billing_subscriptions
  for each row execute function public.set_updated_at();

create table public.lifetime_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  paddle_transaction_id text not null unique,
  paddle_customer_id text,
  product_id text not null,
  price_id text not null,
  environment text not null default 'sandbox',
  created_at timestamptz default now()
);

create index idx_lifetime_purchases_user_id on public.lifetime_purchases(user_id);

grant select on public.lifetime_purchases to authenticated;
grant all on public.lifetime_purchases to service_role;

alter table public.lifetime_purchases enable row level security;

create policy "Users can view own lifetime purchase"
  on public.lifetime_purchases for select
  using (auth.uid() = user_id);

create policy "Service role can manage lifetime purchases"
  on public.lifetime_purchases for all
  using (auth.role() = 'service_role');

create or replace function public.has_active_subscription(
  user_uuid uuid,
  check_env text default 'live'
)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.billing_subscriptions
    where user_id = user_uuid
    and environment = check_env
    and (
      (status in ('active', 'trialing') and (current_period_end is null or current_period_end > now()))
      or (status = 'canceled' and current_period_end > now())
    )
  ) or exists (
    select 1 from public.lifetime_purchases
    where user_id = user_uuid and environment = check_env
  );
$$;