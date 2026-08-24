ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS connection_id uuid,
  ADD COLUMN IF NOT EXISTS connection_kind text;

CREATE INDEX IF NOT EXISTS tasks_connection_id_idx ON public.tasks (connection_id);