-- Phase 2: Lovense custom Pattern API (rule + strength), pool 1–100, 50 new waveform slots (51–100).

DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'vibration_pattern_pool'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%pool_index%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.vibration_pattern_pool DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.vibration_pattern_pool
  ADD CONSTRAINT vibration_pattern_pool_pool_index_check CHECK (pool_index >= 1 AND pool_index <= 100);

-- Payload shapes:
--   Preset: {"command":"pattern","pattern":"wave",...} or patternMode "preset"
--   Custom: {"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:500#","strength":"10;12;8",...}
--   Vibrate: {"command":"vibrate",...}

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
    pi := (abs(hashtext(p_companion_id || ':' || i::text)) % 100) + 1;
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

INSERT INTO public.vibration_pattern_pool (pool_index, internal_label, payload, vibe_family) VALUES
(51, 'Silk Ladder', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"16;19;4;7;10;13;16;19","intensity":50,"duration":7561}'::jsonb, 'build'),
(52, 'Copper Steps', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"19;4;7;10;13;16;19;4;7","intensity":50,"duration":7572}'::jsonb, 'climax'),
(53, 'Neon Ladder', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"4;7;10;13;16;19;4;7;10;13","intensity":50,"duration":7583}'::jsonb, 'edge'),
(54, 'Void Stair', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"7;10;13;16;19;4;7;10;13;16;19","intensity":50,"duration":7594}'::jsonb, 'aftercare'),
(55, 'Pulse Loom', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"5;8;11;14;17;20;5;8;11;14;17;20","intensity":50,"duration":7605}'::jsonb, 'tease'),
(56, 'Hex Wave', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"8;11;14;17;20;5","intensity":50,"duration":7616}'::jsonb, 'build'),
(57, 'Chord Rise', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"11;14;17;20;5;8;11","intensity":50,"duration":7627}'::jsonb, 'climax'),
(58, 'Tide Stack', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"14;17;20;5;8;11;14;17","intensity":50,"duration":7638}'::jsonb, 'edge'),
(59, 'Ember Run', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"17;20;5;8;11;14;17;20;5","intensity":50,"duration":7649}'::jsonb, 'aftercare'),
(60, 'Frost Climb', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"15;18;3;6;9;12;15;18;3;6","intensity":50,"duration":7660}'::jsonb, 'tease'),
(61, 'Velvet Ramp', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"18;3;6;9;12;15;18;3;6;9;12","intensity":50,"duration":7671}'::jsonb, 'build'),
(62, 'Chrome Burst', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"3;6;9;12;15;18;3;6;9;12;15;18","intensity":50,"duration":7682}'::jsonb, 'climax'),
(63, 'Obsidian Steps', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"6;9;12;15;18;3","intensity":50,"duration":7693}'::jsonb, 'edge'),
(64, 'Rose Cascade', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"9;12;15;18;3;6;9","intensity":50,"duration":7704}'::jsonb, 'aftercare'),
(65, 'Phantom Rise', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"7;10;13;16;19;4;7;10","intensity":50,"duration":7715}'::jsonb, 'tease'),
(66, 'Cipher Drift', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"10;13;16;19;4;7;10;13;16","intensity":50,"duration":7726}'::jsonb, 'build'),
(67, 'Hush Wave', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"13;16;19;4;7;10;13;16;19;4","intensity":50,"duration":7737}'::jsonb, 'climax'),
(68, 'Gravity Steps', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"16;19;4;7;10;13;16;19;4;7;10","intensity":50,"duration":7748}'::jsonb, 'edge'),
(69, 'Solar Ramp', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"19;4;7;10;13;16;19;4;7;10;13;16","intensity":50,"duration":7759}'::jsonb, 'aftercare'),
(70, 'Cryo Drift', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"17;20;5;8;11;14","intensity":50,"duration":7770}'::jsonb, 'tease'),
(71, 'Mist Ladder', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"20;5;8;11;14;17;20","intensity":50,"duration":7781}'::jsonb, 'build'),
(72, 'Storm Stack', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"5;8;11;14;17;20;5;8","intensity":50,"duration":7792}'::jsonb, 'climax'),
(73, 'Nova Steps', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"8;11;14;17;20;5;8;11;14","intensity":50,"duration":7803}'::jsonb, 'edge'),
(74, 'Edge Ramp', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"11;14;17;20;5;8;11;14;17;20","intensity":50,"duration":7814}'::jsonb, 'aftercare'),
(75, 'Afterglow Drift', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"9;12;15;18;3;6;9;12;15;18;3","intensity":50,"duration":7825}'::jsonb, 'tease'),
(76, 'Deep Phase', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"12;15;18;3;6;9;12;15;18;3;6;9","intensity":50,"duration":7836}'::jsonb, 'build'),
(77, 'Rapid Pulse', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"15;18;3;6;9;12","intensity":50,"duration":7847}'::jsonb, 'climax'),
(78, 'Slow Bloom II', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"18;3;6;9;12;15;18","intensity":50,"duration":7858}'::jsonb, 'edge'),
(79, 'Stutter Rise', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"3;6;9;12;15;18;3;6","intensity":50,"duration":7869}'::jsonb, 'aftercare'),
(80, 'Glitch Wave', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"19;4;7;10;13;16;19;4;7","intensity":50,"duration":7880}'::jsonb, 'tease'),
(81, 'Satellite Drift', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"4;7;10;13;16;19;4;7;10;13","intensity":50,"duration":7891}'::jsonb, 'build'),
(82, 'Orbit Stack', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"7;10;13;16;19;4;7;10;13;16;19","intensity":50,"duration":7902}'::jsonb, 'climax'),
(83, 'Train Pulse', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"10;13;16;19;4;7;10;13;16;19;4;7","intensity":50,"duration":7913}'::jsonb, 'edge'),
(84, 'Flare Ramp', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"13;16;19;4;7;10","intensity":50,"duration":7924}'::jsonb, 'aftercare'),
(85, 'Well Phase', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"11;14;17;20;5;8;11","intensity":50,"duration":7935}'::jsonb, 'tease'),
(86, 'Lock Drift', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"14;17;20;5;8;11;14;17","intensity":50,"duration":7946}'::jsonb, 'build'),
(87, 'Bite Stack', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"17;20;5;8;11;14;17;20;5","intensity":50,"duration":7957}'::jsonb, 'climax'),
(88, 'Money Wave', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"20;5;8;11;14;17;20;5;8;11","intensity":50,"duration":7968}'::jsonb, 'edge'),
(89, 'Call Ramp', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"5;8;11;14;17;20;5;8;11;14;17","intensity":50,"duration":7979}'::jsonb, 'aftercare'),
(90, 'Abyss Drift', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"3;6;9;12;15;18;3;6;9;12;15;18","intensity":50,"duration":7990}'::jsonb, 'tease'),
(91, 'Phase 41', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"6;9;12;15;18;3","intensity":50,"duration":8001}'::jsonb, 'build'),
(92, 'Phase 42', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"9;12;15;18;3;6;9","intensity":50,"duration":8012}'::jsonb, 'climax'),
(93, 'Phase 43', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"12;15;18;3;6;9;12;15","intensity":50,"duration":8023}'::jsonb, 'edge'),
(94, 'Phase 44', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"15;18;3;6;9;12;15;18;3","intensity":50,"duration":8034}'::jsonb, 'aftercare'),
(95, 'Phase 45', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"13;16;19;4;7;10;13;16;19;4","intensity":50,"duration":8045}'::jsonb, 'tease'),
(96, 'Phase 46', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"16;19;4;7;10;13;16;19;4;7;10","intensity":50,"duration":8056}'::jsonb, 'build'),
(97, 'Phase 47', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"19;4;7;10;13;16;19;4;7;10;13;16","intensity":50,"duration":8067}'::jsonb, 'climax'),
(98, 'Phase 48', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"4;7;10;13;16;19","intensity":50,"duration":8078}'::jsonb, 'edge'),
(99, 'Phase 49', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:700#","strength":"7;10;13;16;19;4;7","intensity":50,"duration":8089}'::jsonb, 'aftercare'),
(100, 'Phase 50', '{"command":"pattern","patternMode":"custom","rule":"V:1;F:v;S:300#","strength":"5;8;11;14;17;20;5;8","intensity":50,"duration":8100}'::jsonb, 'tease')
ON CONFLICT (pool_index) DO NOTHING;

-- Rebuild assignments so everyone draws from pool indices 1–100.
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
