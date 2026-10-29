CREATE TABLE public.cabinet_drawers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  color text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cabinet_drawers TO authenticated;
GRANT ALL ON public.cabinet_drawers TO service_role;
ALTER TABLE public.cabinet_drawers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own drawers" ON public.cabinet_drawers FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.cabinet_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  drawer_id uuid REFERENCES public.cabinet_drawers(id) ON DELETE SET NULL,
  title text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  tags text[] NOT NULL DEFAULT '{}',
  expires_at date,
  remind_days integer[] NOT NULL DEFAULT '{30,7}',
  summary text,
  key_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  extracted_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cabinet_documents_user_idx ON public.cabinet_documents(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cabinet_documents TO authenticated;
GRANT ALL ON public.cabinet_documents TO service_role;
ALTER TABLE public.cabinet_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own documents" ON public.cabinet_documents FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER cabinet_documents_updated BEFORE UPDATE ON public.cabinet_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Cabinet own read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'filing-cabinet' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Cabinet own insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'filing-cabinet' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Cabinet own update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'filing-cabinet' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Cabinet own delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'filing-cabinet' AND (storage.foldername(name))[1] = auth.uid()::text);