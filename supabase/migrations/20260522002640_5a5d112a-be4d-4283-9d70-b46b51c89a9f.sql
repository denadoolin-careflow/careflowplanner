
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS ai_overview text,
  ADD COLUMN IF NOT EXISTS ai_overview_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS linked_goal_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS linked_habit_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;
