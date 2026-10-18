CREATE TABLE public.astro_suite_state (
  user_id uuid PRIMARY KEY,
  tarot_pulls jsonb NOT NULL DEFAULT '[]'::jsonb,
  moon_rituals jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.astro_suite_state TO authenticated;
GRANT ALL ON public.astro_suite_state TO service_role;
ALTER TABLE public.astro_suite_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own astro state" ON public.astro_suite_state FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER astro_suite_state_updated BEFORE UPDATE ON public.astro_suite_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();