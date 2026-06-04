ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS atmosphere TEXT,
  ADD COLUMN IF NOT EXISTS focus_this_week TEXT,
  ADD COLUMN IF NOT EXISTS target_date DATE;

ALTER TABLE public.project_ideas
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS project_ideas_project_id_idx ON public.project_ideas(project_id);