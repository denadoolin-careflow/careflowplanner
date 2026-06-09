-- Changelog entries
CREATE TABLE public.changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'new' CHECK (category IN ('new','improved','fixed','announcement')),
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.changelog TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.changelog TO authenticated;
GRANT ALL ON public.changelog TO service_role;

ALTER TABLE public.changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published entries"
  ON public.changelog FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can read all entries"
  ON public.changelog FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert entries"
  ON public.changelog FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update entries"
  ON public.changelog FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete entries"
  ON public.changelog FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_changelog_updated_at
  BEFORE UPDATE ON public.changelog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX changelog_published_at_idx ON public.changelog (published, published_at DESC);

-- Raw commits (admin-only workspace)
CREATE TABLE public.changelog_raw_commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sha text NOT NULL UNIQUE,
  message text NOT NULL,
  author text,
  committed_at timestamptz,
  url text,
  included_in_entry_id uuid REFERENCES public.changelog(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.changelog_raw_commits TO authenticated;
GRANT ALL ON public.changelog_raw_commits TO service_role;

ALTER TABLE public.changelog_raw_commits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read commits"
  ON public.changelog_raw_commits FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert commits"
  ON public.changelog_raw_commits FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update commits"
  ON public.changelog_raw_commits FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete commits"
  ON public.changelog_raw_commits FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX changelog_raw_commits_committed_at_idx ON public.changelog_raw_commits (committed_at DESC);

-- Per-user "seen" timestamp on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_changelog_at timestamptz;