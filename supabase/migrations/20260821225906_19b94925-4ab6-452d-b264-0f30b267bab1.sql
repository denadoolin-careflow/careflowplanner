CREATE TABLE public.project_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  parent_id uuid REFERENCES public.project_folders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_folders TO authenticated;
GRANT ALL ON public.project_folders TO service_role;

ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own project folders"
ON public.project_folders FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_project_folders_updated
BEFORE UPDATE ON public.project_folders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.project_folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_folder ON public.projects(folder_id);