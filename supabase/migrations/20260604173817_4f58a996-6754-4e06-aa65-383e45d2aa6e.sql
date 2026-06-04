
-- Enums
DO $$ BEGIN
  CREATE TYPE public.celebration_kind AS ENUM ('birthday','anniversary','graduation','family_milestone','care_milestone','therapy_win','adoption','special_event','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.celebration_status AS ENUM ('planning','in_progress','done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.celebration_task_category AS ENUM ('decor','cake','gifts','food','invitations','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.holiday_plan_category AS ENUM ('federal','religious','family','seasonal','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.tradition_anchor AS ENUM ('christmas_eve','thanksgiving','first_snow','birthday','custom_date','season');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.bucket_season AS ENUM ('spring','summer','autumn','winter','all');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.remembrance_kind AS ENUM ('person','pet','date');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.memory_group_type AS ENUM ('season','holiday','birthday','celebration','year');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- celebrations
CREATE TABLE public.celebrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind public.celebration_kind NOT NULL DEFAULT 'custom',
  title text NOT NULL,
  date date NOT NULL,
  end_date date,
  recipient_id uuid,
  theme text,
  color text,
  icon text,
  cover_url text,
  budget_cents integer DEFAULT 0,
  spent_cents integer DEFAULT 0,
  linked_money_category text,
  status public.celebration_status NOT NULL DEFAULT 'planning',
  notes text,
  recurs_yearly boolean NOT NULL DEFAULT false,
  parent_celebration_id uuid,
  person_age_anchor integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.celebrations TO authenticated;
GRANT ALL ON public.celebrations TO service_role;
ALTER TABLE public.celebrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own celebrations" ON public.celebrations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER celebrations_updated BEFORE UPDATE ON public.celebrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX celebrations_user_date_idx ON public.celebrations (user_id, date);

-- celebration_tasks
CREATE TABLE public.celebration_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  celebration_id uuid NOT NULL REFERENCES public.celebrations(id) ON DELETE CASCADE,
  title text NOT NULL,
  category public.celebration_task_category NOT NULL DEFAULT 'other',
  done boolean NOT NULL DEFAULT false,
  due_offset_days integer,
  linked_task_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.celebration_tasks TO authenticated;
GRANT ALL ON public.celebration_tasks TO service_role;
ALTER TABLE public.celebration_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own celebration tasks" ON public.celebration_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER celebration_tasks_updated BEFORE UPDATE ON public.celebration_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX celebration_tasks_celebration_idx ON public.celebration_tasks (celebration_id);

-- wishlist_items
CREATE TABLE public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  celebration_id uuid REFERENCES public.celebrations(id) ON DELETE CASCADE,
  recipient_id uuid,
  title text NOT NULL,
  url text,
  price_cents integer,
  claimed_by text,
  done boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated;
GRANT ALL ON public.wishlist_items TO service_role;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlist items" ON public.wishlist_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER wishlist_items_updated BEFORE UPDATE ON public.wishlist_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- holiday_plans
CREATE TABLE public.holiday_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  holiday_id uuid REFERENCES public.holidays(id) ON DELETE SET NULL,
  custom_name text,
  custom_date date,
  category public.holiday_plan_category NOT NULL DEFAULT 'custom',
  budget_cents integer DEFAULT 0,
  spent_cents integer DEFAULT 0,
  color text,
  icon text,
  notes text,
  status public.celebration_status NOT NULL DEFAULT 'planning',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holiday_plans TO authenticated;
GRANT ALL ON public.holiday_plans TO service_role;
ALTER TABLE public.holiday_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own holiday plans" ON public.holiday_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER holiday_plans_updated BEFORE UPDATE ON public.holiday_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- holiday_timeline_steps
CREATE TABLE public.holiday_timeline_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  holiday_plan_id uuid NOT NULL REFERENCES public.holiday_plans(id) ON DELETE CASCADE,
  days_before integer NOT NULL,
  title text NOT NULL,
  notes text,
  done boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holiday_timeline_steps TO authenticated;
GRANT ALL ON public.holiday_timeline_steps TO service_role;
ALTER TABLE public.holiday_timeline_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own timeline steps" ON public.holiday_timeline_steps FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER holiday_timeline_steps_updated BEFORE UPDATE ON public.holiday_timeline_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX holiday_timeline_plan_idx ON public.holiday_timeline_steps (holiday_plan_id);

-- traditions
CREATE TABLE public.traditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  anchor public.tradition_anchor NOT NULL DEFAULT 'custom_date',
  anchor_date text,
  category text,
  icon text,
  color text,
  recurs_yearly boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traditions TO authenticated;
GRANT ALL ON public.traditions TO service_role;
ALTER TABLE public.traditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own traditions" ON public.traditions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER traditions_updated BEFORE UPDATE ON public.traditions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- tradition_items
CREATE TABLE public.tradition_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tradition_id uuid NOT NULL REFERENCES public.traditions(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tradition_items TO authenticated;
GRANT ALL ON public.tradition_items TO service_role;
ALTER TABLE public.tradition_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tradition items" ON public.tradition_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tradition_items_updated BEFORE UPDATE ON public.tradition_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- tradition_instances
CREATE TABLE public.tradition_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tradition_id uuid NOT NULL REFERENCES public.traditions(id) ON DELETE CASCADE,
  year integer NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  item_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tradition_id, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tradition_instances TO authenticated;
GRANT ALL ON public.tradition_instances TO service_role;
ALTER TABLE public.tradition_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tradition instances" ON public.tradition_instances FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tradition_instances_updated BEFORE UPDATE ON public.tradition_instances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- bucket_lists
CREATE TABLE public.bucket_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  season public.bucket_season NOT NULL DEFAULT 'all',
  year integer,
  title text NOT NULL,
  color text,
  icon text,
  is_shared boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bucket_lists TO authenticated;
GRANT ALL ON public.bucket_lists TO service_role;
ALTER TABLE public.bucket_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bucket lists" ON public.bucket_lists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER bucket_lists_updated BEFORE UPDATE ON public.bucket_lists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- bucket_items
CREATE TABLE public.bucket_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  list_id uuid NOT NULL REFERENCES public.bucket_lists(id) ON DELETE CASCADE,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  due_date date,
  photo_url text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bucket_items TO authenticated;
GRANT ALL ON public.bucket_items TO service_role;
ALTER TABLE public.bucket_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bucket items" ON public.bucket_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER bucket_items_updated BEFORE UPDATE ON public.bucket_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX bucket_items_list_idx ON public.bucket_items (list_id);

-- seasonal_goals
CREATE TABLE public.seasonal_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  season public.bucket_season NOT NULL,
  year integer NOT NULL,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seasonal_goals TO authenticated;
GRANT ALL ON public.seasonal_goals TO service_role;
ALTER TABLE public.seasonal_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own seasonal goals" ON public.seasonal_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER seasonal_goals_updated BEFORE UPDATE ON public.seasonal_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- remembrances
CREATE TABLE public.remembrances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  kind public.remembrance_kind NOT NULL DEFAULT 'person',
  birth_date date,
  remembrance_date date,
  photo_url text,
  story text,
  show_prompts boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remembrances TO authenticated;
GRANT ALL ON public.remembrances TO service_role;
ALTER TABLE public.remembrances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own remembrances" ON public.remembrances FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER remembrances_updated BEFORE UPDATE ON public.remembrances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- memory_book_entries
CREATE TABLE public.memory_book_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  group_type public.memory_group_type NOT NULL DEFAULT 'year',
  group_key text NOT NULL,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_url text,
  mood text,
  linked_celebration_id uuid REFERENCES public.celebrations(id) ON DELETE SET NULL,
  linked_holiday_id uuid REFERENCES public.holidays(id) ON DELETE SET NULL,
  linked_memory_id uuid REFERENCES public.memories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_book_entries TO authenticated;
GRANT ALL ON public.memory_book_entries TO service_role;
ALTER TABLE public.memory_book_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own memory book entries" ON public.memory_book_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER memory_book_entries_updated BEFORE UPDATE ON public.memory_book_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX memory_book_group_idx ON public.memory_book_entries (user_id, group_type, group_key);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.celebrations,
  public.celebration_tasks,
  public.wishlist_items,
  public.holiday_plans,
  public.holiday_timeline_steps,
  public.traditions,
  public.tradition_items,
  public.tradition_instances,
  public.bucket_lists,
  public.bucket_items,
  public.seasonal_goals,
  public.remembrances,
  public.memory_book_entries;

ALTER TABLE public.celebrations REPLICA IDENTITY FULL;
ALTER TABLE public.celebration_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.wishlist_items REPLICA IDENTITY FULL;
ALTER TABLE public.holiday_plans REPLICA IDENTITY FULL;
ALTER TABLE public.holiday_timeline_steps REPLICA IDENTITY FULL;
ALTER TABLE public.traditions REPLICA IDENTITY FULL;
ALTER TABLE public.tradition_items REPLICA IDENTITY FULL;
ALTER TABLE public.tradition_instances REPLICA IDENTITY FULL;
ALTER TABLE public.bucket_lists REPLICA IDENTITY FULL;
ALTER TABLE public.bucket_items REPLICA IDENTITY FULL;
ALTER TABLE public.seasonal_goals REPLICA IDENTITY FULL;
ALTER TABLE public.remembrances REPLICA IDENTITY FULL;
ALTER TABLE public.memory_book_entries REPLICA IDENTITY FULL;
