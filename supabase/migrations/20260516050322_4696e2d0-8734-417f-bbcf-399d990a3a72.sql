ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE public.time_blocks ADD COLUMN IF NOT EXISTS icon text;