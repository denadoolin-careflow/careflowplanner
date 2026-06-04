ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS stage text,
  ADD COLUMN IF NOT EXISTS health text,
  ADD COLUMN IF NOT EXISTS waiting_on text;

CREATE TABLE IF NOT EXISTS public.project_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  note text,
  source text,
  promoted_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_ideas TO authenticated;
GRANT ALL ON public.project_ideas TO service_role;

ALTER TABLE public.project_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project ideas"
  ON public.project_ideas
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER project_ideas_set_updated_at
  BEFORE UPDATE ON public.project_ideas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_project_ideas_user ON public.project_ideas(user_id, created_at DESC);