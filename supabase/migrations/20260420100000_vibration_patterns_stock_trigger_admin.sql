-- Stock companions: auto-assign / refresh Lovense pattern rows (custom_characters already had a trigger).
-- Admin RLS + RPCs so Character management can reload, add, edit labels, or delete assignments.
-- SECURITY DEFINER on assign + triggers so writes succeed under RLS (only SELECT existed for anon/auth).

CREATE OR REPLACE FUNCTION public.assign_vibration_patterns_for_companion(
  p_companion_id text,
  p_companion_name text,
  p_rarity text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
  need_sig boolean := false;
  i int;
  pi int;
  pool_id uuid;
  sort_i int := 1;
  r text := lower(trim(coalesce(p_rarity, 'common')));
BEGIN
  DELETE FROM public.companion_vibration_patterns WHERE companion_id = p_companion_id;

  n := CASE r
    WHEN 'common' THEN 1
    WHEN 'rare' THEN 2
    WHEN 'epic' THEN 3
    WHEN 'legendary' THEN 4
    WHEN 'mythic' THEN 5
    WHEN 'abyssal' THEN 5
    ELSE 1
  END;

  IF r = 'abyssal' THEN
    need_sig := true;
  END IF;

  FOR i IN 0..(n - 1) LOOP
    pi := (abs(hashtext(p_companion_id || ':' || i::text)) % 50) + 1;
    SELECT id INTO pool_id FROM public.vibration_pattern_pool WHERE pool_index = pi LIMIT 1;
    IF pool_id IS NULL THEN
      RAISE EXCEPTION 'Missing pool pattern %', pi;
    END IF;
    INSERT INTO public.companion_vibration_patterns (companion_id, pool_pattern_id, display_name, sort_order, is_abyssal_signature)
    VALUES (
      p_companion_id,
      pool_id,
      public.themed_pattern_label(coalesce(nullif(trim(p_companion_name), ''), 'Companion'), sort_i, false),
      sort_i,
      false
    );
    sort_i := sort_i + 1;
  END LOOP;

  IF need_sig THEN
    SELECT id INTO pool_id FROM public.vibration_pattern_pool WHERE pool_index = 50 LIMIT 1;
    IF pool_id IS NULL THEN
      RAISE EXCEPTION 'Missing Abyssal signature pool pattern (index 50)';
    END IF;
    INSERT INTO public.companion_vibration_patterns (companion_id, pool_pattern_id, display_name, sort_order, is_abyssal_signature)
    VALUES (p_companion_id, pool_id, 'Abyssal Pulse', sort_i, true);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_vibration_patterns_for_companion(text, text, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.trg_custom_characters_vibration_patterns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assign_vibration_patterns_for_companion(
    'cc-' || NEW.id::text,
    NEW.name,
    COALESCE(NEW.rarity, 'common')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_companions_vibration_patterns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assign_vibration_patterns_for_companion(
    NEW.id::text,
    NEW.name,
    COALESCE(NEW.rarity, 'common')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companions_vibration_patterns_aiu ON public.companions;
CREATE TRIGGER companions_vibration_patterns_aiu
  AFTER INSERT OR UPDATE OF rarity, name ON public.companions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_companions_vibration_patterns();

-- Idempotent: rebuild everyone from current rarity (fixes rows created before triggers / pool seed).
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, name, rarity FROM public.companions
  LOOP
    PERFORM public.assign_vibration_patterns_for_companion(r.id::text, r.name, COALESCE(r.rarity, 'common'));
  END LOOP;
  FOR r IN SELECT id, name, rarity FROM public.custom_characters
  LOOP
    PERFORM public.assign_vibration_patterns_for_companion('cc-' || r.id::text, r.name, COALESCE(r.rarity, 'common'));
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.admin_reassign_vibration_patterns(p_companion_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_name text;
  c_rarity text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_companion_id IS NULL OR length(trim(p_companion_id)) = 0 THEN
    RAISE EXCEPTION 'companion_id required';
  END IF;

  IF p_companion_id LIKE 'cc-%' THEN
    SELECT c.name::text, lower(trim(COALESCE(c.rarity, 'common')))
    INTO c_name, c_rarity
    FROM public.custom_characters c
    WHERE c.id = substring(p_companion_id from 4)::uuid;
  ELSE
    SELECT c.name::text, lower(trim(COALESCE(c.rarity, 'common')))
    INTO c_name, c_rarity
    FROM public.companions c
    WHERE c.id = p_companion_id;
  END IF;

  IF c_name IS NULL THEN
    RAISE EXCEPTION 'Companion not found for id %', p_companion_id;
  END IF;

  PERFORM public.assign_vibration_patterns_for_companion(p_companion_id, c_name, c_rarity);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_backfill_missing_vibration_patterns()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int := 0;
  r record;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  FOR r IN
    SELECT c.id::text AS cid, c.name::text AS cname, COALESCE(c.rarity, 'common') AS rr
    FROM public.companions c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.companion_vibration_patterns v WHERE v.companion_id = c.id
    )
  LOOP
    PERFORM public.assign_vibration_patterns_for_companion(r.cid, r.cname, r.rr);
    n := n + 1;
  END LOOP;

  FOR r IN
    SELECT ('cc-' || c.id::text) AS cid, c.name::text AS cname, COALESCE(c.rarity, 'common') AS rr
    FROM public.custom_characters c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.companion_vibration_patterns v WHERE v.companion_id = ('cc-' || c.id::text)
    )
  LOOP
    PERFORM public.assign_vibration_patterns_for_companion(r.cid, r.cname, r.rr);
    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reassign_vibration_patterns(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_backfill_missing_vibration_patterns() TO authenticated;

DROP POLICY IF EXISTS "Admins manage companion vibration patterns" ON public.companion_vibration_patterns;
CREATE POLICY "Admins manage companion vibration patterns"
  ON public.companion_vibration_patterns
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
