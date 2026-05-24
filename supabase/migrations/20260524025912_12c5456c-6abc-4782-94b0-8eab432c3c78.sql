ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS snoozed_until DATE;
CREATE INDEX IF NOT EXISTS idx_tasks_snoozed_until ON public.tasks(user_id, snoozed_until) WHERE snoozed_until IS NOT NULL;