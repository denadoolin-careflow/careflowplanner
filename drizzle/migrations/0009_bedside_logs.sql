CREATE TABLE public.bedside_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  recipient_id uuid,
  kind text NOT NULL DEFAULT 'comfort',
  label text NOT NULL DEFAULT '',
  pain integer,
  dose text,
  note text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bedside_logs TO authenticated;
GRANT ALL ON public.bedside_logs TO service_role;
ALTER TABLE public.bedside_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own bedside logs" ON public.bedside_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);