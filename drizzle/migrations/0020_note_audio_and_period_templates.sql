CREATE POLICY "note_audio_select_own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'note-audio' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "note_audio_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'note-audio' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "note_audio_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'note-audio' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE TABLE public.note_period_templates (
  user_id uuid PRIMARY KEY,
  templates jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_period_templates TO authenticated;
GRANT ALL ON public.note_period_templates TO service_role;
ALTER TABLE public.note_period_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own period templates" ON public.note_period_templates FOR ALL TO authenticated
USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);