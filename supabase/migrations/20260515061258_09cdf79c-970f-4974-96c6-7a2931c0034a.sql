
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS template text,
  ADD COLUMN IF NOT EXISTS energy text,
  ADD COLUMN IF NOT EXISTS prompts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS gratitude_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS journal_entries_user_date_idx ON public.journal_entries(user_id, date DESC);
