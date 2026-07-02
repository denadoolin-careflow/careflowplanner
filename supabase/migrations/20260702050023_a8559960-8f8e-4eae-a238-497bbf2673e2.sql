ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS recurrence_rule jsonb,
  ADD COLUMN IF NOT EXISTS reminder_minutes_before integer;