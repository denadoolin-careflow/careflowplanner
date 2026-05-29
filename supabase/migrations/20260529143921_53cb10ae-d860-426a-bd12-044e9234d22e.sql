
-- HOUSEHOLDS
CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER households_updated BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ROLE ENUM
CREATE TYPE public.household_role AS ENUM ('owner','editor','viewer');

-- HOUSEHOLD USERS (membership join)
CREATE TABLE public.household_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.household_role NOT NULL DEFAULT 'editor',
  display_name text,
  color text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_users TO authenticated;
GRANT ALL ON public.household_users TO service_role;
ALTER TABLE public.household_users ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_household_users_user ON public.household_users(user_id);
CREATE INDEX idx_household_users_household ON public.household_users(household_id);

-- Helpers (SECURITY DEFINER) avoid RLS recursion.
CREATE OR REPLACE FUNCTION public.is_household_member(_user_id uuid, _household_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.household_users WHERE user_id = _user_id AND household_id = _household_id)
$$;

CREATE OR REPLACE FUNCTION public.is_household_owner(_user_id uuid, _household_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.household_users WHERE user_id = _user_id AND household_id = _household_id AND role = 'owner')
$$;

CREATE POLICY "Members can view their households" ON public.households
  FOR SELECT USING (public.is_household_member(auth.uid(), id));
CREATE POLICY "Anyone signed in can create a household" ON public.households
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners can update their household" ON public.households
  FOR UPDATE USING (public.is_household_owner(auth.uid(), id));
CREATE POLICY "Owners can delete their household" ON public.households
  FOR DELETE USING (public.is_household_owner(auth.uid(), id));

CREATE POLICY "Members can view co-members" ON public.household_users
  FOR SELECT USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "User can insert self" ON public.household_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update memberships" ON public.household_users
  FOR UPDATE USING (public.is_household_owner(auth.uid(), household_id));
CREATE POLICY "User can update own row" ON public.household_users
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owners can remove members" ON public.household_users
  FOR DELETE USING (public.is_household_owner(auth.uid(), household_id));
CREATE POLICY "User can leave household" ON public.household_users
  FOR DELETE USING (auth.uid() = user_id);

-- HOUSEHOLD INVITES
CREATE TABLE public.household_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.household_role NOT NULL DEFAULT 'editor',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_invites TO authenticated;
GRANT SELECT ON public.household_invites TO anon;
GRANT ALL ON public.household_invites TO service_role;
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_household_invites_token ON public.household_invites(token);
CREATE INDEX idx_household_invites_email ON public.household_invites(lower(email));

-- token URL = capability. Anyone with the link can read the invite row.
CREATE POLICY "Public can read invite" ON public.household_invites FOR SELECT USING (true);
CREATE POLICY "Owners create invites" ON public.household_invites
  FOR INSERT WITH CHECK (public.is_household_owner(auth.uid(), household_id) AND auth.uid() = invited_by);
CREATE POLICY "Owners update invites" ON public.household_invites
  FOR UPDATE USING (public.is_household_owner(auth.uid(), household_id));
CREATE POLICY "Anyone can mark invite accepted" ON public.household_invites
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Owners delete invites" ON public.household_invites
  FOR DELETE USING (public.is_household_owner(auth.uid(), household_id));

-- DINNER POLLS
CREATE TABLE public.dinner_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  title text,
  notes text,
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dinner_polls TO authenticated;
GRANT ALL ON public.dinner_polls TO service_role;
ALTER TABLE public.dinner_polls ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER dinner_polls_updated BEFORE UPDATE ON public.dinner_polls
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Members view polls" ON public.dinner_polls
  FOR SELECT USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members create polls" ON public.dinner_polls
  FOR INSERT WITH CHECK (public.is_household_member(auth.uid(), household_id) AND auth.uid() = created_by);
CREATE POLICY "Members update polls" ON public.dinner_polls
  FOR UPDATE USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members delete polls" ON public.dinner_polls
  FOR DELETE USING (public.is_household_member(auth.uid(), household_id));

-- DINNER POLL CANDIDATES
CREATE TABLE public.dinner_poll_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.dinner_polls(id) ON DELETE CASCADE,
  day_date date NOT NULL,
  slot text NOT NULL DEFAULT 'dinner',
  meal_id uuid,
  custom_title text,
  notes text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dinner_poll_candidates TO authenticated;
GRANT ALL ON public.dinner_poll_candidates TO service_role;
ALTER TABLE public.dinner_poll_candidates ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_dpc_poll ON public.dinner_poll_candidates(poll_id);

CREATE POLICY "Members view candidates" ON public.dinner_poll_candidates
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.dinner_polls p WHERE p.id = poll_id AND public.is_household_member(auth.uid(), p.household_id)));
CREATE POLICY "Members manage candidates" ON public.dinner_poll_candidates
  FOR ALL USING (EXISTS (SELECT 1 FROM public.dinner_polls p WHERE p.id = poll_id AND public.is_household_member(auth.uid(), p.household_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dinner_polls p WHERE p.id = poll_id AND public.is_household_member(auth.uid(), p.household_id)));

-- DINNER POLL RESPONSES
CREATE TABLE public.dinner_poll_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.dinner_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  day_date date NOT NULL,
  kind text NOT NULL DEFAULT 'vote',
  candidate_id uuid REFERENCES public.dinner_poll_candidates(id) ON DELETE CASCADE,
  meal_id uuid,
  custom_title text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dinner_poll_responses TO authenticated;
GRANT ALL ON public.dinner_poll_responses TO service_role;
ALTER TABLE public.dinner_poll_responses ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_dpr_poll ON public.dinner_poll_responses(poll_id);

CREATE POLICY "Members view responses" ON public.dinner_poll_responses
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.dinner_polls p WHERE p.id = poll_id AND public.is_household_member(auth.uid(), p.household_id)));
CREATE POLICY "Members insert own responses" ON public.dinner_poll_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.dinner_polls p WHERE p.id = poll_id AND public.is_household_member(auth.uid(), p.household_id)));
CREATE POLICY "User update own response" ON public.dinner_poll_responses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "User delete own response" ON public.dinner_poll_responses
  FOR DELETE USING (auth.uid() = user_id);

-- GROCERY LISTS sharing
ALTER TABLE public.grocery_lists ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES public.households(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_grocery_lists_household ON public.grocery_lists(household_id);
DROP POLICY IF EXISTS "own grocery_lists all" ON public.grocery_lists;
CREATE POLICY "View grocery lists" ON public.grocery_lists
  FOR SELECT USING (auth.uid() = user_id OR (household_id IS NOT NULL AND public.is_household_member(auth.uid(), household_id)));
CREATE POLICY "Insert grocery lists" ON public.grocery_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id AND (household_id IS NULL OR public.is_household_member(auth.uid(), household_id)));
CREATE POLICY "Update grocery lists" ON public.grocery_lists
  FOR UPDATE USING (auth.uid() = user_id OR (household_id IS NOT NULL AND public.is_household_member(auth.uid(), household_id)));
CREATE POLICY "Delete grocery lists" ON public.grocery_lists
  FOR DELETE USING (auth.uid() = user_id OR (household_id IS NOT NULL AND public.is_household_owner(auth.uid(), household_id)));

-- GROCERY LIST ACTIVITY
CREATE TABLE public.grocery_list_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.grocery_lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  item_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grocery_list_activity TO authenticated;
GRANT ALL ON public.grocery_list_activity TO service_role;
ALTER TABLE public.grocery_list_activity ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_gla_list ON public.grocery_list_activity(list_id, created_at DESC);

CREATE POLICY "View activity" ON public.grocery_list_activity
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.grocery_lists g WHERE g.id = list_id AND (g.user_id = auth.uid() OR (g.household_id IS NOT NULL AND public.is_household_member(auth.uid(), g.household_id)))));
CREATE POLICY "Insert activity" ON public.grocery_list_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.grocery_lists g WHERE g.id = list_id AND (g.user_id = auth.uid() OR (g.household_id IS NOT NULL AND public.is_household_member(auth.uid(), g.household_id)))));

-- APPOINTMENTS sharing
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES public.households(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';
CREATE INDEX IF NOT EXISTS idx_appointments_household ON public.appointments(household_id);
DROP POLICY IF EXISTS "own appts all" ON public.appointments;
CREATE POLICY "View appts" ON public.appointments
  FOR SELECT USING (auth.uid() = user_id OR (visibility = 'household' AND household_id IS NOT NULL AND public.is_household_member(auth.uid(), household_id)));
CREATE POLICY "Insert appts" ON public.appointments
  FOR INSERT WITH CHECK (auth.uid() = user_id AND (household_id IS NULL OR public.is_household_member(auth.uid(), household_id)));
CREATE POLICY "Update appts" ON public.appointments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Delete appts" ON public.appointments
  FOR DELETE USING (auth.uid() = user_id);

-- PROFILES current household
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_household_id uuid REFERENCES public.households(id) ON DELETE SET NULL;

-- handle_new_user: also creates personal household
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_household_id uuid;
  display text;
BEGIN
  display := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));

  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, display)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.households (name, created_by)
  VALUES (coalesce(display, 'My') || '''s household', new.id)
  RETURNING id INTO new_household_id;

  INSERT INTO public.household_users (household_id, user_id, role, display_name)
  VALUES (new_household_id, new.id, 'owner', display);

  UPDATE public.profiles SET current_household_id = new_household_id WHERE id = new.id;
  RETURN new;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_list_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dinner_poll_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dinner_poll_candidates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.household_users;
