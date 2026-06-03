ALTER TABLE public.reset_checklists
  ADD COLUMN IF NOT EXISTS recurrence_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_days integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recurrence_time time,
  ADD COLUMN IF NOT EXISTS auto_reset boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz;