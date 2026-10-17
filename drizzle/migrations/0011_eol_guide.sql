CREATE TABLE public.eol_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  recipient_id uuid,
  category text NOT NULL DEFAULT 'other',
  title text NOT NULL DEFAULT '',
  file_path text NOT NULL,
  mime text,
  size bigint,
  original_location text,
  notes text,
  doc_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eol_documents TO authenticated;
GRANT ALL ON public.eol_documents TO service_role;
ALTER TABLE public.eol_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own eol docs" ON public.eol_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.eol_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  recipient_id uuid,
  "group" text NOT NULL,
  phase text NOT NULL,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  notes text,
  document_id uuid,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eol_checklist_items TO authenticated;
GRANT ALL ON public.eol_checklist_items TO service_role;
ALTER TABLE public.eol_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own eol items" ON public.eol_checklist_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "eol docs read own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'eol-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "eol docs insert own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'eol-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "eol docs update own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'eol-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "eol docs delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'eol-documents' AND (storage.foldername(name))[1] = auth.uid()::text);