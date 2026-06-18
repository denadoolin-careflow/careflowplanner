CREATE TABLE public.note_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  body text NOT NULL DEFAULT '',
  icon text,
  cover_gradient text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_templates TO authenticated;
GRANT ALL ON public.note_templates TO service_role;

ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own note_templates all"
ON public.note_templates FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_note_templates_updated_at
BEFORE UPDATE ON public.note_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();