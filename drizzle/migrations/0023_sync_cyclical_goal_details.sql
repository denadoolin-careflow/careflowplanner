ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.goals.details IS 'Synced goal intention, next step, milestones, check-in, season, rhythm phase and reversible compost archive.';
CREATE OR REPLACE FUNCTION public.patch_goal_details(p_goal_id uuid, p_patch jsonb, p_missing_only boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Goal details must be an object'; END IF;
  UPDATE public.goals SET details = CASE WHEN p_missing_only THEN p_patch || details ELSE details || p_patch END, updated_at = now()
  WHERE id = p_goal_id AND user_id = auth.uid() RETURNING details INTO result;
  IF result IS NULL THEN RAISE EXCEPTION 'Goal not available'; END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.patch_goal_details(uuid,jsonb,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patch_goal_details(uuid,jsonb,boolean) TO authenticated;
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='goals') THEN
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
END IF;
END $$;