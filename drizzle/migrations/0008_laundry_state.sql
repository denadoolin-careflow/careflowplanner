CREATE TABLE public.laundry_state (
  user_id uuid PRIMARY KEY,
  loads jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.laundry_state TO authenticated;
GRANT ALL ON public.laundry_state TO service_role;
ALTER TABLE public.laundry_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own laundry" ON public.laundry_state FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.laundry_state;