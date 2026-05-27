ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS privacy text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS shared_loved_one_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE public.memories
  DROP CONSTRAINT IF EXISTS memories_privacy_check;
ALTER TABLE public.memories
  ADD CONSTRAINT memories_privacy_check CHECK (privacy IN ('private','family','shared'));

CREATE INDEX IF NOT EXISTS memories_privacy_idx ON public.memories (privacy);