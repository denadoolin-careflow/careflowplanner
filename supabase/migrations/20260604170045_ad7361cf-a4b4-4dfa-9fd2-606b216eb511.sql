
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.meals; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.birthdays; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.holidays; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.meals REPLICA IDENTITY FULL;
ALTER TABLE public.birthdays REPLICA IDENTITY FULL;
ALTER TABLE public.holidays REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
