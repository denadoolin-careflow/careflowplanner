
-- Phase 2: wealth — transactions + recurring engine

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'cleared',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_goal_id uuid,
  ADD COLUMN IF NOT EXISTS linked_bill_id uuid,
  ADD COLUMN IF NOT EXISTS linked_subscription_id uuid;

ALTER TABLE public.recurring_bills
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'upcoming',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_goal_id uuid,
  ADD COLUMN IF NOT EXISTS last_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS recurrence_interval integer NOT NULL DEFAULT 1;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_charged_at timestamptz,
  ADD COLUMN IF NOT EXISTS recurrence_interval integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON public.transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS recurring_bills_user_due_idx ON public.recurring_bills (user_id, next_due_date);
