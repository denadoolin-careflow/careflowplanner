CREATE TABLE public.note_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  note_ids text[] NOT NULL DEFAULT '{}',
  task_ids text[] NOT NULL DEFAULT '{}',
  project_ids text[] NOT NULL DEFAULT '{}',
  hidden_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_spaces TO authenticated;
GRANT ALL ON public.note_spaces TO service_role;
ALTER TABLE public.note_spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own spaces" ON public.note_spaces FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER note_spaces_updated BEFORE UPDATE ON public.note_spaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();