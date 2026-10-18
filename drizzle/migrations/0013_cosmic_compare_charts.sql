CREATE TABLE public.cosmic_compare_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  birth_date date NOT NULL,
  birth_time text,
  birth_tz text,
  birth_lat double precision,
  birth_lng double precision,
  birth_place text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cosmic_compare_charts TO authenticated;
GRANT ALL ON public.cosmic_compare_charts TO service_role;
ALTER TABLE public.cosmic_compare_charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own compare charts" ON public.cosmic_compare_charts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX cosmic_compare_charts_user_idx ON public.cosmic_compare_charts(user_id);