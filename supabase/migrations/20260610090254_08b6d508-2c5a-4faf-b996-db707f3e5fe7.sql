
CREATE TABLE public.transit_reflections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  event_date date,
  event_label text,
  rating int CHECK (rating BETWEEN 1 AND 5),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transit_reflections TO authenticated;
GRANT ALL ON public.transit_reflections TO service_role;

ALTER TABLE public.transit_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own transit reflections all"
  ON public.transit_reflections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER transit_reflections_set_updated_at
  BEFORE UPDATE ON public.transit_reflections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX transit_reflections_user_date_idx
  ON public.transit_reflections (user_id, event_date DESC);
