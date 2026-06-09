
CREATE OR REPLACE FUNCTION public.set_changelog_pull_schedule(_freq text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, cron
AS $$
DECLARE
  job_name text := 'changelog-auto-pull';
  cron_expr text;
  fn_url text;
  anon_key text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  IF _freq NOT IN ('off','hourly','daily','weekly') THEN
    RAISE EXCEPTION 'invalid frequency';
  END IF;

  -- best-effort unschedule (ignore if missing)
  BEGIN
    PERFORM cron.unschedule(job_name);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  IF _freq = 'off' THEN
    UPDATE public.changelog_settings SET pull_frequency = 'off', updated_at = now(), updated_by = auth.uid() WHERE id = true;
    RETURN 'off';
  END IF;

  cron_expr := CASE _freq
    WHEN 'hourly' THEN '0 * * * *'
    WHEN 'daily'  THEN '0 6 * * *'
    WHEN 'weekly' THEN '0 6 * * 1'
  END;

  fn_url := 'https://yxyzowyvekdlbunayqwy.supabase.co/functions/v1/changelog-pull-commits';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4eXpvd3l2ZWtkbGJ1bmF5cXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTI1MjIsImV4cCI6MjA5MzkyODUyMn0.ODY2rD1EiGz7lDqVZNJ_pN29IUf22N_PqyPDbdHNkGE';

  PERFORM cron.schedule(
    job_name,
    cron_expr,
    format($cron$
      select net.http_post(
        url:=%L,
        headers:=jsonb_build_object('Content-Type','application/json','apikey',%L,'Authorization',%L,'x-changelog-cron','1'),
        body:=jsonb_build_object('all', true, 'fromLastPull', true)
      );
    $cron$, fn_url, anon_key, 'Bearer ' || anon_key)
  );

  UPDATE public.changelog_settings SET pull_frequency = _freq, updated_at = now(), updated_by = auth.uid() WHERE id = true;
  RETURN _freq;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_changelog_pull_schedule(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_changelog_pull_schedule(text) TO authenticated, service_role;
