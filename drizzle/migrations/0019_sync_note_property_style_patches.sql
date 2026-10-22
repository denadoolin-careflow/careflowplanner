ALTER PUBLICATION supabase_realtime ADD TABLE public.note_property_styles;
CREATE OR REPLACE FUNCTION public.patch_note_property_styles(p_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE current_styles jsonb; prop_key text; prop_patch jsonb; option_key text; option_patch jsonb; merged_prop jsonb; merged_options jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  INSERT INTO public.note_property_styles(user_id, styles) VALUES (auth.uid(), '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING;
  SELECT styles INTO current_styles FROM public.note_property_styles WHERE user_id = auth.uid() FOR UPDATE;
  FOR prop_key, prop_patch IN SELECT * FROM jsonb_each(p_patch) LOOP
    merged_prop := COALESCE(current_styles->prop_key, '{}'::jsonb) || (prop_patch - 'options');
    IF prop_patch ? 'options' THEN
      merged_options := COALESCE(merged_prop->'options', '{}'::jsonb);
      FOR option_key, option_patch IN SELECT * FROM jsonb_each(prop_patch->'options') LOOP
        merged_options := jsonb_set(merged_options, ARRAY[option_key], COALESCE(merged_options->option_key, '{}'::jsonb) || option_patch, true);
      END LOOP;
      merged_prop := jsonb_set(merged_prop, '{options}', merged_options, true);
    END IF;
    current_styles := jsonb_set(current_styles, ARRAY[prop_key], merged_prop, true);
  END LOOP;
  UPDATE public.note_property_styles SET styles = current_styles, updated_at = now() WHERE user_id = auth.uid();
  RETURN current_styles;
END;
$$;
REVOKE ALL ON FUNCTION public.patch_note_property_styles(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patch_note_property_styles(jsonb) TO authenticated;