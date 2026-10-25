ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS garden jsonb NOT NULL DEFAULT '{}'::jsonb;