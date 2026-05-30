CREATE OR REPLACE FUNCTION public.create_household_with_owner(_name text)
RETURNS public.households
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  hh public.households%ROWTYPE;
  display text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _name IS NULL OR length(trim(_name)) = 0 THEN RAISE EXCEPTION 'name required'; END IF;

  INSERT INTO public.households (name, created_by)
  VALUES (trim(_name), uid)
  RETURNING * INTO hh;

  SELECT coalesce(name, split_part(email, '@', 1)) INTO display
  FROM public.profiles WHERE id = uid;

  INSERT INTO public.household_users (household_id, user_id, role, display_name)
  VALUES (hh.id, uid, 'owner', display)
  ON CONFLICT (household_id, user_id) DO NOTHING;

  RETURN hh;
END $$;

GRANT EXECUTE ON FUNCTION public.create_household_with_owner(text) TO authenticated;