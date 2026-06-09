
-- Roadmap status enum
DO $$ BEGIN
  CREATE TYPE public.roadmap_status AS ENUM ('planned','in_progress','shipped','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.roadmap_category AS ENUM ('new','improved','fixed','announcement');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Roadmap items
CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status public.roadmap_status NOT NULL DEFAULT 'planned',
  category public.roadmap_category NOT NULL DEFAULT 'new',
  target_quarter text,
  sort_order int NOT NULL DEFAULT 0,
  vote_count int NOT NULL DEFAULT 0,
  changelog_id uuid REFERENCES public.changelog(id) ON DELETE SET NULL,
  shipped_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.roadmap_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_items TO authenticated;
GRANT ALL ON public.roadmap_items TO service_role;

ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roadmap public read" ON public.roadmap_items
  FOR SELECT USING (true);
CREATE POLICY "roadmap admin insert" ON public.roadmap_items
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "roadmap admin update" ON public.roadmap_items
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "roadmap admin delete" ON public.roadmap_items
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_roadmap_items_updated_at
  BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Votes
CREATE TABLE IF NOT EXISTS public.roadmap_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id uuid NOT NULL REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (roadmap_item_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.roadmap_votes TO authenticated;
GRANT ALL ON public.roadmap_votes TO service_role;

ALTER TABLE public.roadmap_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "votes select own" ON public.roadmap_votes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "votes insert own" ON public.roadmap_votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes delete own" ON public.roadmap_votes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Vote count trigger
CREATE OR REPLACE FUNCTION public.roadmap_vote_count_sync()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.roadmap_items SET vote_count = vote_count + 1 WHERE id = NEW.roadmap_item_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.roadmap_items SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.roadmap_item_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_roadmap_votes_count
  AFTER INSERT OR DELETE ON public.roadmap_votes
  FOR EACH ROW EXECUTE FUNCTION public.roadmap_vote_count_sync();

-- Ship a roadmap item -> create linked changelog draft
CREATE OR REPLACE FUNCTION public.ship_roadmap_item(_id uuid, _publish boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item public.roadmap_items%ROWTYPE;
  new_changelog_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  SELECT * INTO item FROM public.roadmap_items WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'roadmap item not found'; END IF;

  IF item.changelog_id IS NOT NULL THEN
    UPDATE public.changelog
      SET title = item.title,
          summary = item.description,
          category = item.category::text,
          published = _publish,
          published_at = CASE WHEN _publish THEN now() ELSE published_at END
      WHERE id = item.changelog_id
      RETURNING id INTO new_changelog_id;
  ELSE
    INSERT INTO public.changelog (title, summary, category, published, published_at, created_by)
    VALUES (item.title, item.description, item.category::text, _publish,
            CASE WHEN _publish THEN now() ELSE NULL END, auth.uid())
    RETURNING id INTO new_changelog_id;
  END IF;

  UPDATE public.roadmap_items
    SET status = 'shipped',
        shipped_at = now(),
        changelog_id = new_changelog_id,
        updated_at = now()
    WHERE id = _id;

  RETURN new_changelog_id;
END $$;
