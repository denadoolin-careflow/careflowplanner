ALTER TABLE public.health_checkins ADD COLUMN IF NOT EXISTS intention text;
ALTER TABLE public.mental_health_logs ADD COLUMN IF NOT EXISTS intention text;