
DROP POLICY IF EXISTS "Anyone can mark invite accepted" ON public.household_invites;

CREATE OR REPLACE FUNCTION public.accept_household_invite(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.household_invites%ROWTYPE;
  uid uuid;
  email_addr text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO inv FROM public.household_invites WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'invite not found'; END IF;
  IF inv.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'invite already accepted'; END IF;
  IF inv.expires_at < now() THEN RAISE EXCEPTION 'invite expired'; END IF;

  SELECT email INTO email_addr FROM auth.users WHERE id = uid;

  INSERT INTO public.household_users (household_id, user_id, role, display_name)
  VALUES (inv.household_id, uid, inv.role, split_part(coalesce(email_addr, ''), '@', 1))
  ON CONFLICT (household_id, user_id) DO NOTHING;

  UPDATE public.household_invites SET accepted_at = now() WHERE id = inv.id;
  UPDATE public.profiles SET current_household_id = inv.household_id WHERE id = uid;

  RETURN inv.household_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.accept_household_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_household_invite(text) TO authenticated;
