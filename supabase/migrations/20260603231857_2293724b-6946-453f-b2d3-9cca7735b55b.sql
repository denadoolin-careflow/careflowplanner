
CREATE TABLE public.reset_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checklist_id uuid,
  item_id uuid,
  title text NOT NULL,
  kind text,
  est_minutes integer,
  duration_seconds integer,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reset_history TO authenticated;
GRANT ALL ON public.reset_history TO service_role;

ALTER TABLE public.reset_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reset history"
  ON public.reset_history
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX reset_history_user_completed_idx
  ON public.reset_history (user_id, completed_at DESC);
