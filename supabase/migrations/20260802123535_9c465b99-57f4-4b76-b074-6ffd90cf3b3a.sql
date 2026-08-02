create policy "Users read own header images"
on storage.objects for select to authenticated
using (bucket_id = 'header-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users upload own header images"
on storage.objects for insert to authenticated
with check (bucket_id = 'header-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update own header images"
on storage.objects for update to authenticated
using (bucket_id = 'header-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own header images"
on storage.objects for delete to authenticated
using (bucket_id = 'header-images' and (storage.foldername(name))[1] = auth.uid()::text);