
INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-images', 'meal-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "meal-images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'meal-images');

CREATE POLICY "meal-images user insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'meal-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "meal-images user update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'meal-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "meal-images user delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'meal-images' AND auth.uid()::text = (storage.foldername(name))[1]);
