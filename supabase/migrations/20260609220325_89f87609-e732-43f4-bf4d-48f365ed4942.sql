
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.changelog_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  pull_frequency text NOT NULL DEFAULT 'off' CHECK (pull_frequency IN ('off','hourly','daily','weekly')),
  last_pulled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE ON public.changelog_settings TO authenticated;
GRANT ALL ON public.changelog_settings TO service_role;

ALTER TABLE public.changelog_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read changelog settings"
  ON public.changelog_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write changelog settings"
  ON public.changelog_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.changelog_settings (id, pull_frequency) VALUES (true, 'off')
ON CONFLICT (id) DO NOTHING;
