
CREATE TABLE public.whiteboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled board',
  description TEXT,
  data JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whiteboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wb_select_own" ON public.whiteboards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wb_insert_own" ON public.whiteboards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wb_update_own" ON public.whiteboards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "wb_delete_own" ON public.whiteboards FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER set_whiteboards_updated_at BEFORE UPDATE ON public.whiteboards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX whiteboards_user_id_idx ON public.whiteboards(user_id);
