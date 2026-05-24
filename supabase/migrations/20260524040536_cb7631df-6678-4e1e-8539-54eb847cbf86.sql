ALTER TABLE public.monthly_plans
  ADD COLUMN IF NOT EXISTS moon_phase_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cycle_phase_items jsonb NOT NULL DEFAULT '[]'::jsonb;