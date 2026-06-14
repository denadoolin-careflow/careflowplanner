
DROP POLICY IF EXISTS "Public can read invite" ON public.household_invites;

CREATE POLICY "Owners read invites"
  ON public.household_invites
  FOR SELECT
  TO authenticated
  USING (public.is_household_owner(auth.uid(), household_id));

DROP POLICY IF EXISTS "Owners create invites" ON public.household_invites;
CREATE POLICY "Owners create invites"
  ON public.household_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_household_owner(auth.uid(), household_id));

DROP POLICY IF EXISTS "Owners update invites" ON public.household_invites;
CREATE POLICY "Owners update invites"
  ON public.household_invites
  FOR UPDATE
  TO authenticated
  USING (public.is_household_owner(auth.uid(), household_id))
  WITH CHECK (public.is_household_owner(auth.uid(), household_id));

DROP POLICY IF EXISTS "Owners delete invites" ON public.household_invites;
CREATE POLICY "Owners delete invites"
  ON public.household_invites
  FOR DELETE
  TO authenticated
  USING (public.is_household_owner(auth.uid(), household_id));

DROP POLICY IF EXISTS "own gcal tokens all" ON public.google_calendar_tokens;
CREATE POLICY "own gcal tokens all"
  ON public.google_calendar_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own recipients all" ON public.care_recipients;
CREATE POLICY "own recipients all"
  ON public.care_recipients
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
