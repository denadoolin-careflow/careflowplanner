
-- Private storage bucket for user-owned attachments (images, PDFs, docs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: only the owning user (first folder = uid) can read/write/delete their files.
DROP POLICY IF EXISTS "attachments owner read" ON storage.objects;
CREATE POLICY "attachments owner read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments'
         AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "attachments owner insert" ON storage.objects;
CREATE POLICY "attachments owner insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'attachments'
              AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "attachments owner update" ON storage.objects;
CREATE POLICY "attachments owner update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'attachments'
         AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "attachments owner delete" ON storage.objects;
CREATE POLICY "attachments owner delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'attachments'
         AND auth.uid()::text = (storage.foldername(name))[1]);

-- Attachment metadata column on owning rows
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.home_notes
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
