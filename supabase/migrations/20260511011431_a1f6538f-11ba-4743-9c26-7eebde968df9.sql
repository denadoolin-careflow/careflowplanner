
-- reset_checklists
CREATE TABLE public.reset_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'custom',
  week_start date,
  is_template boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reset_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reset_checklists all" ON public.reset_checklists
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_reset_checklists_updated BEFORE UPDATE ON public.reset_checklists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- reset_items
CREATE TABLE public.reset_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  checklist_id uuid NOT NULL REFERENCES public.reset_checklists(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.reset_items(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  category text,
  day_of_week integer,
  time_block text,
  start_time text,
  est_minutes integer,
  recurrence_type text NOT NULL DEFAULT 'none',
  recurrence_days integer[] NOT NULL DEFAULT '{}',
  due_date date,
  done boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reset_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reset_items all" ON public.reset_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_reset_items_updated BEFORE UPDATE ON public.reset_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_reset_items_checklist ON public.reset_items(checklist_id);
CREATE INDEX idx_reset_items_parent ON public.reset_items(parent_id);

-- cleaning_tasks extensions
ALTER TABLE public.cleaning_tasks
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.cleaning_tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS time_block text,
  ADD COLUMN IF NOT EXISTS start_time text,
  ADD COLUMN IF NOT EXISTS est_minutes integer,
  ADD COLUMN IF NOT EXISTS category text;
