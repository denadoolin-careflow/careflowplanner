CREATE TABLE public.task_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('note','journal','goal','habit','meal','appointment','project','person')),
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, entity_type, entity_id)
);

CREATE INDEX idx_task_links_entity ON public.task_links (entity_type, entity_id);
CREATE INDEX idx_task_links_task ON public.task_links (task_id);
CREATE INDEX idx_task_links_user ON public.task_links (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_links TO authenticated;
GRANT ALL ON public.task_links TO service_role;

ALTER TABLE public.task_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own task_links all"
ON public.task_links
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);