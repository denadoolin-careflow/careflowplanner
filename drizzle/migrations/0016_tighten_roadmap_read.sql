DROP POLICY IF EXISTS "roadmap public read" ON public.roadmap_items;
CREATE POLICY "roadmap public read visible items" ON public.roadmap_items
  FOR SELECT TO anon, authenticated
  USING (status <> 'cancelled'::roadmap_status);
CREATE POLICY "roadmap admins read all" ON public.roadmap_items
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));