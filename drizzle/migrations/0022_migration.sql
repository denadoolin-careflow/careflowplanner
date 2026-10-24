CREATE TABLE public.library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'book',
  title text NOT NULL,
  creator text,
  url text,
  cover_url text,
  status text NOT NULL DEFAULT 'want',
  rating integer,
  format text,
  platform text,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  finished_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_items TO authenticated;
GRANT ALL ON public.library_items TO service_role;
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own library items" ON public.library_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX library_items_user_idx ON public.library_items(user_id, kind);
CREATE TRIGGER library_items_updated BEFORE UPDATE ON public.library_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();