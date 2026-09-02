ALTER TABLE public.wellflow_reminders
  ADD COLUMN IF NOT EXISTS meds_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS symptom_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS symptom_time time NOT NULL DEFAULT '19:30',
  ADD COLUMN IF NOT EXISTS movement_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS movement_days integer[] NOT NULL DEFAULT '{1,3,6}',
  ADD COLUMN IF NOT EXISTS movement_time time NOT NULL DEFAULT '17:00';

ALTER TABLE public.wellflow_plans
  ADD COLUMN IF NOT EXISTS movement_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;