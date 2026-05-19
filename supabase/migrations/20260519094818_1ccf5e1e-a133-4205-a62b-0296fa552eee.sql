
CREATE TABLE IF NOT EXISTS public.project_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Section',
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own project_sections all" ON public.project_sections;
CREATE POLICY "own project_sections all" ON public.project_sections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_project_sections_updated_at ON public.project_sections;
CREATE TRIGGER update_project_sections_updated_at
  BEFORE UPDATE ON public.project_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_project_sections_project_sort
  ON public.project_sections(project_id, sort_order);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS section_id uuid;
CREATE INDEX IF NOT EXISTS idx_tasks_section ON public.tasks(section_id);
