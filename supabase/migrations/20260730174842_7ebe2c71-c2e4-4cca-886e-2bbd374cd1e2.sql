ALTER TABLE public.daily_checkins
  ADD COLUMN IF NOT EXISTS capacity_level text,
  ADD COLUMN IF NOT EXISTS capacity_mvd boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS capacity_mvd_task_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.daily_checkins'::regclass
      AND conname = 'daily_checkins_user_id_iso_date_key'
  ) THEN
    DELETE FROM public.daily_checkins a
      USING public.daily_checkins b
     WHERE a.user_id = b.user_id
       AND a.iso_date = b.iso_date
       AND a.ctid < b.ctid;
    ALTER TABLE public.daily_checkins
      ADD CONSTRAINT daily_checkins_user_id_iso_date_key UNIQUE (user_id, iso_date);
  END IF;
END $$;