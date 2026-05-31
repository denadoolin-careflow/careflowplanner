ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS tags_user_pinned_idx ON public.tags(user_id, pinned) WHERE pinned = true;