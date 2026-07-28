CREATE TABLE public.planner_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_templates TO authenticated;
GRANT ALL ON public.planner_templates TO service_role;

ALTER TABLE public.planner_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own planner templates"
ON public.planner_templates FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER planner_templates_set_updated_at
BEFORE UPDATE ON public.planner_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX planner_templates_user_idx ON public.planner_templates (user_id, sort_order);