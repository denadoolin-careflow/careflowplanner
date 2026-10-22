CREATE TABLE public.note_property_styles (
  user_id uuid PRIMARY KEY,
  styles jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_property_styles TO authenticated;
GRANT ALL ON public.note_property_styles TO service_role;
ALTER TABLE public.note_property_styles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own styles select" ON public.note_property_styles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own styles insert" ON public.note_property_styles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own styles update" ON public.note_property_styles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own styles delete" ON public.note_property_styles FOR DELETE TO authenticated USING (auth.uid() = user_id);