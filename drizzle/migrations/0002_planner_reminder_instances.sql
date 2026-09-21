CREATE TABLE public.planner_reminder_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_kind text NOT NULL,
  source_id text NOT NULL,
  occurrence_key text NOT NULL,
  title text,
  fire_at timestamptz,
  snoozed_until timestamptz,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_kind, source_id, occurrence_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_reminder_instances TO authenticated;
GRANT ALL ON public.planner_reminder_instances TO service_role;

ALTER TABLE public.planner_reminder_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their reminder instances"
ON public.planner_reminder_instances
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX planner_reminder_instances_user_fire_idx
  ON public.planner_reminder_instances (user_id, fire_at);

CREATE TRIGGER planner_reminder_instances_set_updated_at
BEFORE UPDATE ON public.planner_reminder_instances
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();