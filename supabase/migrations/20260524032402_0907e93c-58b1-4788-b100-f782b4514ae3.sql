ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS notes_tags_idx ON public.notes USING GIN (tags);
