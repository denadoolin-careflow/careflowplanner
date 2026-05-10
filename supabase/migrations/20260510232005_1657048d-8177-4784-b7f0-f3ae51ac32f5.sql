
-- time_blocks: hourly time-blocking on the calendar
CREATE TABLE public.time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  title text NOT NULL,
  notes text,
  color text NOT NULL DEFAULT 'primary',
  all_day boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own time_blocks all" ON public.time_blocks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_time_blocks_user_date ON public.time_blocks(user_id, date);
CREATE TRIGGER trg_time_blocks_updated BEFORE UPDATE ON public.time_blocks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- dashboard_layouts: multiple named, draggable widget layouts
CREATE TABLE public.dashboard_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own dashboard_layouts all" ON public.dashboard_layouts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_dashboard_layouts_user ON public.dashboard_layouts(user_id);
CREATE TRIGGER trg_dashboard_layouts_updated BEFORE UPDATE ON public.dashboard_layouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Profile: header banner image
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS header_image_url text;
