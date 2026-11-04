CREATE TABLE public.project_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_groups TO authenticated;
GRANT ALL ON public.project_groups TO service_role;
ALTER TABLE public.project_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their project groups" ON public.project_groups FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER project_groups_updated_at BEFORE UPDATE ON public.project_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.projects ADD COLUMN group_id uuid REFERENCES public.project_groups(id) ON DELETE SET NULL;