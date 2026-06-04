
-- Cosmic Flow tables

CREATE TABLE public.cosmic_birth_chart (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_date DATE NOT NULL,
  birth_time TIME,
  birth_tz TEXT,
  birth_lat DOUBLE PRECISION,
  birth_lng DOUBLE PRECISION,
  birth_place TEXT,
  natal_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cosmic_birth_chart TO authenticated;
GRANT ALL ON public.cosmic_birth_chart TO service_role;
ALTER TABLE public.cosmic_birth_chart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own birth chart" ON public.cosmic_birth_chart FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cosmic_birth_chart_set_updated_at BEFORE UPDATE ON public.cosmic_birth_chart
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cosmic_event_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_kind TEXT NOT NULL,
  event_date DATE NOT NULL,
  payload JSONB,
  reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cosmic_event_saves TO authenticated;
GRANT ALL ON public.cosmic_event_saves TO service_role;
ALTER TABLE public.cosmic_event_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own event saves" ON public.cosmic_event_saves FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX cosmic_event_saves_user_date ON public.cosmic_event_saves(user_id, event_date);
CREATE TRIGGER cosmic_event_saves_set_updated_at BEFORE UPDATE ON public.cosmic_event_saves
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cosmic_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  event_id TEXT,
  event_kind TEXT,
  planet TEXT,
  sign TEXT,
  phase TEXT,
  event_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cosmic_journal_entries TO authenticated;
GRANT ALL ON public.cosmic_journal_entries TO service_role;
ALTER TABLE public.cosmic_journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cosmic journal" ON public.cosmic_journal_entries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.cosmic_settings (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  show_in_calendar BOOLEAN NOT NULL DEFAULT true,
  atmosphere TEXT DEFAULT 'cozy',
  enabled_event_kinds TEXT[] NOT NULL DEFAULT ARRAY['phase','ingress','retrograde','voc','eclipse'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cosmic_settings TO authenticated;
GRANT ALL ON public.cosmic_settings TO service_role;
ALTER TABLE public.cosmic_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cosmic settings" ON public.cosmic_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cosmic_settings_set_updated_at BEFORE UPDATE ON public.cosmic_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Optional cosmic tag on tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS cosmic_tag TEXT;
