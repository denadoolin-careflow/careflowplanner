CREATE TABLE public.landing_content (
  key text PRIMARY KEY,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.landing_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.landing_content TO authenticated;
GRANT ALL ON public.landing_content TO service_role;
ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read landing content" ON public.landing_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert landing content" ON public.landing_content FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update landing content" ON public.landing_content FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete landing content" ON public.landing_content FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER landing_content_updated_at BEFORE UPDATE ON public.landing_content FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();