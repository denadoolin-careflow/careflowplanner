-- Supertag schema: typed fields, defaults and checklist templates on tags.
ALTER TABLE public.tags
  ADD COLUMN IF NOT EXISTS default_recurrence_type text,
  ADD COLUMN IF NOT EXISTS default_recurrence_interval integer,
  ADD COLUMN IF NOT EXISTS default_area text,
  ADD COLUMN IF NOT EXISTS default_priority text,
  ADD COLUMN IF NOT EXISTS default_energy text,
  ADD COLUMN IF NOT EXISTS default_est_minutes integer,
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.tag_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tag_id, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tag_fields TO authenticated;
GRANT ALL ON public.tag_fields TO service_role;
ALTER TABLE public.tag_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own tag fields"
  ON public.tag_fields FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tag_fields_set_updated_at BEFORE UPDATE ON public.tag_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.item_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  entity_type text NOT NULL DEFAULT 'task',
  entity_id uuid NOT NULL,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, tag_id, field_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_field_values TO authenticated;
GRANT ALL ON public.item_field_values TO service_role;
ALTER TABLE public.item_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own field values"
  ON public.item_field_values FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS item_field_values_entity_idx
  ON public.item_field_values (user_id, entity_type, entity_id);
CREATE TRIGGER item_field_values_set_updated_at BEFORE UPDATE ON public.item_field_values
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  layout text NOT NULL DEFAULT 'list',
  scope text NOT NULL DEFAULT 'week',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  pinned boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_views TO authenticated;
GRANT ALL ON public.saved_views TO service_role;
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own saved views"
  ON public.saved_views FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER saved_views_set_updated_at BEFORE UPDATE ON public.saved_views
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();