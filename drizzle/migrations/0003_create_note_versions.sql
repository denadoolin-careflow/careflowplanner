CREATE TABLE public.note_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX note_versions_note_created_idx ON public.note_versions (note_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.note_versions TO authenticated;
GRANT ALL ON public.note_versions TO service_role;

ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own note versions" ON public.note_versions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own note versions" ON public.note_versions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own note versions" ON public.note_versions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);