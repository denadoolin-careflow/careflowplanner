CREATE OR REPLACE FUNCTION public.sync_changelog_to_roadmap()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_count integer := 0;
  rec record;
  new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  FOR rec IN
    SELECT c.id, c.title, c.summary, c.category, c.published_at, c.created_at
    FROM public.changelog c
    WHERE c.published = true
      AND NOT EXISTS (
        SELECT 1 FROM public.roadmap_items r WHERE r.changelog_id = c.id
      )
  LOOP
    INSERT INTO public.roadmap_items
      (title, description, status, category, changelog_id, shipped_at, created_by)
    VALUES
      (rec.title,
       NULLIF(rec.summary, ''),
       'shipped'::roadmap_status,
       (CASE WHEN rec.category IN ('new','improved','fixed','announcement')
             THEN rec.category ELSE 'new' END)::roadmap_category,
       rec.id,
       COALESCE(rec.published_at, rec.created_at),
       auth.uid())
    RETURNING id INTO new_id;
    created_count := created_count + 1;
  END LOOP;

  RETURN created_count;
END $$;