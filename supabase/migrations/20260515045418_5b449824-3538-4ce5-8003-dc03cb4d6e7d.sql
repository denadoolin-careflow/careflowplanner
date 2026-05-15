ALTER TABLE public.time_blocks ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS time_blocks_task_id_idx ON public.time_blocks(task_id);