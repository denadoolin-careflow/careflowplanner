
CREATE TABLE public.quick_add_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  default_area TEXT,
  default_project_id UUID,
  template_body TEXT,
  hotkey TEXT,
  pinned BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_add_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own quick_add_presets all"
ON public.quick_add_presets FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_quick_add_presets_updated_at
BEFORE UPDATE ON public.quick_add_presets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_quick_add_presets_user ON public.quick_add_presets(user_id, sort_order);
