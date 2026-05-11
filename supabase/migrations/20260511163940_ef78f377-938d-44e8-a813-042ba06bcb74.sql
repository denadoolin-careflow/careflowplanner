CREATE TABLE public.meal_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  emoji text,
  color text,
  weekday integer,
  default_slot text,
  meal_ids uuid[] NOT NULL DEFAULT '{}',
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own meal_themes all" ON public.meal_themes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_meal_themes_updated
  BEFORE UPDATE ON public.meal_themes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();