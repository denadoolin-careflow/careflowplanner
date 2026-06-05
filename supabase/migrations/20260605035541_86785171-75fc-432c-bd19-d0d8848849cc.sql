-- Cosmic Flow v2: chart cache, chapters, daily guidance, journal themes, settings extension

ALTER TABLE public.cosmic_birth_chart
  ADD COLUMN IF NOT EXISTS house_system TEXT NOT NULL DEFAULT 'whole-sign',
  ADD COLUMN IF NOT EXISTS chart_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Cached computed chart (planets, houses, aspects, dignities) keyed by birth hash
CREATE TABLE public.cosmic_chart_cache (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_hash TEXT NOT NULL,
  chart JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cosmic_chart_cache TO authenticated;
GRANT ALL ON public.cosmic_chart_cache TO service_role;
ALTER TABLE public.cosmic_chart_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chart cache" ON public.cosmic_chart_cache FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cosmic_chart_cache_set_updated_at BEFORE UPDATE ON public.cosmic_chart_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- "Your Current Chapter" narratives
CREATE TABLE public.cosmic_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_theme TEXT NOT NULL,
  summary TEXT NOT NULL,
  characters JSONB NOT NULL DEFAULT '[]'::jsonb,
  lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
  practices JSONB NOT NULL DEFAULT '[]'::jsonb,
  reflection_prompt TEXT,
  source_signals JSONB,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cosmic_chapters TO authenticated;
GRANT ALL ON public.cosmic_chapters TO service_role;
ALTER TABLE public.cosmic_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chapters" ON public.cosmic_chapters FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX cosmic_chapters_user_valid ON public.cosmic_chapters(user_id, valid_from DESC);
CREATE TRIGGER cosmic_chapters_set_updated_at BEFORE UPDATE ON public.cosmic_chapters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Daily AI guidance snapshots
CREATE TABLE public.cosmic_daily_guidance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guidance_date DATE NOT NULL,
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  suggested_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  gentle_reminder TEXT,
  journal_prompt TEXT,
  mood_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  source_signals JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, guidance_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cosmic_daily_guidance TO authenticated;
GRANT ALL ON public.cosmic_daily_guidance TO service_role;
ALTER TABLE public.cosmic_daily_guidance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily guidance" ON public.cosmic_daily_guidance FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cosmic_daily_guidance_set_updated_at BEFORE UPDATE ON public.cosmic_daily_guidance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Rolling journal-theme analysis
CREATE TABLE public.cosmic_journal_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  breakthroughs JSONB NOT NULL DEFAULT '[]'::jsonb,
  reflection_prompt TEXT,
  entry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cosmic_journal_themes TO authenticated;
GRANT ALL ON public.cosmic_journal_themes TO service_role;
ALTER TABLE public.cosmic_journal_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journal themes" ON public.cosmic_journal_themes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX cosmic_journal_themes_user_period ON public.cosmic_journal_themes(user_id, period_end DESC);
CREATE TRIGGER cosmic_journal_themes_set_updated_at BEFORE UPDATE ON public.cosmic_journal_themes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cached per-event transit interpretations (shared across users by event signature)
CREATE TABLE public.cosmic_transit_interpretations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  technical TEXT,
  meaning TEXT,
  emotional TEXT,
  practical TEXT,
  growth TEXT,
  careflow JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cosmic_transit_interpretations TO authenticated;
GRANT ALL ON public.cosmic_transit_interpretations TO service_role;
ALTER TABLE public.cosmic_transit_interpretations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transit interp" ON public.cosmic_transit_interpretations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cosmic_transit_interp_set_updated_at BEFORE UPDATE ON public.cosmic_transit_interpretations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
