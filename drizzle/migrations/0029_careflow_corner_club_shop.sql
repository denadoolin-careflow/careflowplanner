CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'Untitled post',
  excerpt text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  cover_url text,
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at timestamptz,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published posts are public" ON public.blog_posts FOR SELECT TO anon, authenticated
  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));
CREATE POLICY "Admins manage posts" ON public.blog_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER blog_posts_updated BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.freebies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Free printable',
  description text NOT NULL DEFAULT '',
  cover_url text,
  file_url text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freebies TO authenticated;
GRANT ALL ON public.freebies TO service_role;
ALTER TABLE public.freebies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage freebies" ON public.freebies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  first_name text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'landing',
  freebie_id uuid REFERENCES public.freebies(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.club_members TO authenticated;
GRANT ALL ON public.club_members TO service_role;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read members" ON public.club_members FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete members" ON public.club_members FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'New product',
  description text NOT NULL DEFAULT '',
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  cover_url text,
  images text[] NOT NULL DEFAULT '{}',
  file_path text,
  checkout_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','coming_soon','published')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visible products are public" ON public.products FOR SELECT TO anon, authenticated USING (status <> 'draft');
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  email text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  provider_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.active_freebie()
RETURNS TABLE (id uuid, title text, description text, cover_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.title, f.description, f.cover_url FROM public.freebies f
  WHERE f.is_active ORDER BY f.created_at DESC LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.active_freebie() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.join_careflow_club(_email text, _first_name text, _source text)
RETURNS TABLE (freebie_title text, freebie_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e text := lower(trim(_email)); f public.freebies%ROWTYPE;
BEGIN
  IF e IS NULL OR e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(e) > 255 THEN
    RAISE EXCEPTION 'Please enter a valid email';
  END IF;
  SELECT * INTO f FROM public.freebies WHERE is_active ORDER BY created_at DESC LIMIT 1;
  INSERT INTO public.club_members(email, first_name, source, freebie_id)
  VALUES (e, left(coalesce(trim(_first_name),''),100), left(coalesce(_source,'landing'),50), f.id)
  ON CONFLICT (email) DO UPDATE SET first_name = CASE WHEN EXCLUDED.first_name <> '' THEN EXCLUDED.first_name ELSE club_members.first_name END;
  RETURN QUERY SELECT f.title, f.file_url;
END $$;
GRANT EXECUTE ON FUNCTION public.join_careflow_club(text, text, text) TO anon, authenticated;