ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS description text;
CREATE INDEX IF NOT EXISTS notes_tags_gin ON public.notes USING gin (tags);