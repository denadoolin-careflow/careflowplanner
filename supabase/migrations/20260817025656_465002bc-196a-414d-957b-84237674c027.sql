ALTER TABLE public.daily_checkins
  ADD COLUMN IF NOT EXISTS capacity_planned_min integer,
  ADD COLUMN IF NOT EXISTS capacity_completed_min integer,
  ADD COLUMN IF NOT EXISTS capacity_day_parts jsonb;