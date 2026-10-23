CREATE TABLE public.voice_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  path text NOT NULL UNIQUE,
  note_id uuid,
  duration_ms integer NOT NULL DEFAULT 0,
  mime text,
  transcript text,
  summary text,
  transcript_edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_memos TO authenticated;
GRANT ALL ON public.voice_memos TO service_role;
ALTER TABLE public.voice_memos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own voice memos" ON public.voice_memos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX voice_memos_user_created ON public.voice_memos (user_id, created_at DESC);
CREATE TRIGGER voice_memos_updated_at BEFORE UPDATE ON public.voice_memos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_memos;