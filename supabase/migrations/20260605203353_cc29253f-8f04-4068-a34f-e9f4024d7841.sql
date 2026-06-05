
CREATE TABLE public.anchors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  icon text,
  color text,
  pillar text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anchors TO authenticated;
GRANT ALL ON public.anchors TO service_role;

ALTER TABLE public.anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their anchors"
  ON public.anchors FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their anchors"
  ON public.anchors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their anchors"
  ON public.anchors FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their anchors"
  ON public.anchors FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER set_anchors_updated_at
  BEFORE UPDATE ON public.anchors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tasks           ADD COLUMN IF NOT EXISTS anchor_key text;
ALTER TABLE public.goals           ADD COLUMN IF NOT EXISTS anchor_key text;
ALTER TABLE public.routines        ADD COLUMN IF NOT EXISTS anchor_key text;
ALTER TABLE public.habits          ADD COLUMN IF NOT EXISTS anchor_key text;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS anchor_key text;
ALTER TABLE public.meals           ADD COLUMN IF NOT EXISTS anchor_key text;
ALTER TABLE public.notes           ADD COLUMN IF NOT EXISTS anchor_key text;
