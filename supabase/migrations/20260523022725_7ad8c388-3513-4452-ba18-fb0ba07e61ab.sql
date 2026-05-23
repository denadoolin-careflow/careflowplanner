ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS area_name text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS end_date date;

CREATE INDEX IF NOT EXISTS idx_appointments_project_id ON public.appointments(project_id);
CREATE INDEX IF NOT EXISTS idx_appointments_area_name ON public.appointments(area_name);