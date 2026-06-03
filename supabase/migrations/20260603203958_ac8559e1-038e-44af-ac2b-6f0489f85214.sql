
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS cover_url text;

CREATE POLICY "note-images: owners can read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "note-images: owners can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "note-images: owners can update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "note-images: owners can delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);
