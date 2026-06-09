ALTER TABLE public.changelog_settings
  ADD COLUMN IF NOT EXISTS last_pull_status text,
  ADD COLUMN IF NOT EXISTS last_pull_error text,
  ADD COLUMN IF NOT EXISTS last_pull_fetched int,
  ADD COLUMN IF NOT EXISTS last_pull_inserted int;