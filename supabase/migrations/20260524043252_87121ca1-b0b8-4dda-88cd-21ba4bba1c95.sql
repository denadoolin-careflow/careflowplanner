
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.home_notes ADD COLUMN IF NOT EXISTS cover_url text;

CREATE TABLE IF NOT EXISTS public.area_resources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  area_name text NOT NULL,
  kind text NOT NULL DEFAULT 'link',
  title text NOT NULL,
  url text,
  description text,
  icon text,
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.area_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own area_resources all"
  ON public.area_resources
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_area_resources_user_area ON public.area_resources (user_id, area_name, sort_order);

CREATE TRIGGER set_area_resources_updated_at
  BEFORE UPDATE ON public.area_resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
