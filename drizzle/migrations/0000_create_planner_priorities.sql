CREATE TABLE public.planner_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_kind text NOT NULL,
  period_start date NOT NULL,
  item_type text NOT NULL DEFAULT 'task',
  item_id text NOT NULL,
  item_title text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_priorities TO authenticated;
GRANT ALL ON public.planner_priorities TO service_role;

ALTER TABLE public.planner_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own planner priorities select" ON public.planner_priorities
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own planner priorities insert" ON public.planner_priorities
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own planner priorities update" ON public.planner_priorities
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own planner priorities delete" ON public.planner_priorities
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX planner_priorities_unique_item
  ON public.planner_priorities (user_id, period_kind, period_start, item_type, item_id);
CREATE INDEX planner_priorities_lookup
  ON public.planner_priorities (user_id, period_kind, period_start);