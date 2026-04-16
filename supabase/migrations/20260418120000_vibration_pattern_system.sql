-- Phase 1: Central pool of 50 Lovense vibration patterns + per-companion assignments by rarity.
-- Rarity → count: common 1, rare 2, epic 3, legendary 4, mythic 5, abyssal 5 + signature "Abyssal Pulse" (pool slot 50).

CREATE TABLE IF NOT EXISTS public.vibration_pattern_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_index int NOT NULL UNIQUE CHECK (pool_index >= 1 AND pool_index <= 50),
  internal_label text NOT NULL,
  /** Payload for send-device-command body: pattern uses command "pattern" + pattern name; else vibrate + intensity 0-100 */
  payload jsonb NOT NULL,
  vibe_family text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.companion_vibration_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id text NOT NULL,
  pool_pattern_id uuid NOT NULL REFERENCES public.vibration_pattern_pool(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  sort_order int NOT NULL CHECK (sort_order >= 1 AND sort_order <= 20),
  is_abyssal_signature boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (companion_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_companion_vibration_patterns_companion_id ON public.companion_vibration_patterns(companion_id);

ALTER TABLE public.vibration_pattern_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_vibration_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read vibration pattern pool" ON public.vibration_pattern_pool;
CREATE POLICY "Read vibration pattern pool"
  ON public.vibration_pattern_pool FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Read companion vibration patterns" ON public.companion_vibration_patterns;
CREATE POLICY "Read companion vibration patterns"
  ON public.companion_vibration_patterns FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.themed_pattern_label(p_companion_name text, p_slot int, p_for_signature boolean)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_for_signature THEN 'Abyssal Pulse'
    ELSE (
      (ARRAY['Lunar','Void','Velvet','Neon','Obsidian','Crimson','Ether','Shadow','Silk','Chrome','Oracle','Nocturne','Rune','Glimmer','Dusk'])
        [1 + (abs(hashtext(coalesce(nullif(trim(p_companion_name), ''), 'Companion') || ':' || p_slot::text)) % 15)]
      || ' '
      || (ARRAY['Whisper','Pulse','Surge','Drift','Hex','Cascade','Thrum','Ritual','Tide','Veil','Sway','Burn','Lock','Haze','Chord'])
        [1 + ((abs(hashtext(coalesce(nullif(trim(p_companion_name), ''), 'Companion') || ':' || p_slot::text)) / 7) % 15)]
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.assign_vibration_patterns_for_companion(
  p_companion_id text,
  p_companion_name text,
  p_rarity text
)
RETURNS void
LANGUAGE plpgsql
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
      RAISE EXCEPTION 'Missing pool pattern %%', pi;
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

-- Seed: 50 high-quality patterns (preset + vibrate mixes). Intensity 0-100 for vibrate path on edge function.
INSERT INTO public.vibration_pattern_pool (pool_index, internal_label, payload, vibe_family) VALUES
(1, 'Feather Touch', '{"command":"vibrate","intensity":18,"duration":7000}'::jsonb, 'tease'),
(2, 'Slow Bloom', '{"command":"vibrate","intensity":22,"duration":9000}'::jsonb, 'tease'),
(3, 'Pulse Lite', '{"command":"pattern","pattern":"Pulse","intensity":50,"duration":8000}'::jsonb, 'tease'),
(4, 'Wave Tease', '{"command":"pattern","pattern":"Wave","intensity":50,"duration":10000}'::jsonb, 'tease'),
(5, 'Circle Draw', '{"command":"pattern","pattern":"Circle","intensity":50,"duration":9000}'::jsonb, 'tease'),
(6, 'Breath Sync', '{"command":"vibrate","intensity":28,"duration":12000}'::jsonb, 'tease'),
(7, 'Flutter', '{"command":"vibrate","intensity":25,"duration":6000}'::jsonb, 'tease'),
(8, 'Ripple', '{"command":"pattern","pattern":"ChaCha","intensity":50,"duration":8000}'::jsonb, 'tease'),
(9, 'Candle Flicker', '{"command":"vibrate","intensity":30,"duration":8000}'::jsonb, 'build'),
(10, 'Silk Drag', '{"command":"vibrate","intensity":32,"duration":9000}'::jsonb, 'build'),
(11, 'Tide In', '{"command":"pattern","pattern":"Wave","intensity":50,"duration":12000}'::jsonb, 'build'),
(12, 'Heat Rise', '{"command":"vibrate","intensity":38,"duration":8000}'::jsonb, 'build'),
(13, 'Spark Line', '{"command":"vibrate","intensity":40,"duration":7000}'::jsonb, 'build'),
(14, 'Glass Hum', '{"command":"vibrate","intensity":35,"duration":10000}'::jsonb, 'build'),
(15, 'Midnight Crawl', '{"command":"pattern","pattern":"Pulse","intensity":50,"duration":11000}'::jsonb, 'build'),
(16, 'Voltage Kiss', '{"command":"vibrate","intensity":45,"duration":6000}'::jsonb, 'build'),
(17, 'Copper Wire', '{"command":"vibrate","intensity":42,"duration":8000}'::jsonb, 'build'),
(18, 'Storm Front', '{"command":"pattern","pattern":"Fireworks","intensity":50,"duration":9000}'::jsonb, 'climax'),
(19, 'Redline', '{"command":"vibrate","intensity":72,"duration":5000}'::jsonb, 'climax'),
(20, 'Overload', '{"command":"vibrate","intensity":85,"duration":4500}'::jsonb, 'climax'),
(21, 'Earthquake Ride', '{"command":"pattern","pattern":"Earthquake","intensity":50,"duration":12000}'::jsonb, 'climax'),
(22, 'Nova Burst', '{"command":"pattern","pattern":"Fireworks","intensity":50,"duration":10000}'::jsonb, 'climax'),
(23, 'Edge Hold', '{"command":"vibrate","intensity":55,"duration":15000}'::jsonb, 'edge'),
(24, 'Denial Gate', '{"command":"vibrate","intensity":48,"duration":14000}'::jsonb, 'edge'),
(25, 'Stutter Peak', '{"command":"pattern","pattern":"Pulse","intensity":50,"duration":13000}'::jsonb, 'edge'),
(26, 'Cliff Hanger', '{"command":"vibrate","intensity":60,"duration":8000}'::jsonb, 'edge'),
(27, 'Afterglow', '{"command":"vibrate","intensity":22,"duration":14000}'::jsonb, 'aftercare'),
(28, 'Warm Towel', '{"command":"vibrate","intensity":20,"duration":16000}'::jsonb, 'aftercare'),
(29, 'Heartbeat Fade', '{"command":"pattern","pattern":"Pulse","intensity":50,"duration":15000}'::jsonb, 'aftercare'),
(30, 'Mist Settle', '{"command":"vibrate","intensity":24,"duration":12000}'::jsonb, 'aftercare'),
(31, 'Random Walk', '{"command":"pattern","pattern":"Random","intensity":50,"duration":10000}'::jsonb, 'build'),
(32, 'Roller Climb', '{"command":"pattern","pattern":"Wave","intensity":50,"duration":11000}'::jsonb, 'climax'),
(33, 'Echo Chamber', '{"command":"vibrate","intensity":50,"duration":9000}'::jsonb, 'build'),
(34, 'Neon Staccato', '{"command":"vibrate","intensity":58,"duration":6500}'::jsonb, 'climax'),
(35, 'Velvet Hammer', '{"command":"vibrate","intensity":68,"duration":5500}'::jsonb, 'climax'),
(36, 'Deep Coil', '{"command":"vibrate","intensity":52,"duration":10000}'::jsonb, 'build'),
(37, 'Satellite Orbit', '{"command":"pattern","pattern":"Circle","intensity":50,"duration":13000}'::jsonb, 'build'),
(38, 'Glitch Tease', '{"command":"vibrate","intensity":44,"duration":7000}'::jsonb, 'tease'),
(39, 'Chrome Surge', '{"command":"vibrate","intensity":62,"duration":6000}'::jsonb, 'climax'),
(40, 'Obsidian Drag', '{"command":"vibrate","intensity":36,"duration":11000}'::jsonb, 'edge'),
(41, 'Rose Thorn', '{"command":"vibrate","intensity":48,"duration":8000}'::jsonb, 'edge'),
(42, 'Midnight Train', '{"command":"pattern","pattern":"Wave","intensity":50,"duration":14000}'::jsonb, 'build'),
(43, 'Cryo Kiss', '{"command":"vibrate","intensity":28,"duration":9000}'::jsonb, 'tease'),
(44, 'Solar Flare', '{"command":"pattern","pattern":"Fireworks","intensity":50,"duration":8000}'::jsonb, 'climax'),
(45, 'Gravity Well', '{"command":"vibrate","intensity":75,"duration":5000}'::jsonb, 'climax'),
(46, 'Cipher Lock', '{"command":"vibrate","intensity":40,"duration":9000}'::jsonb, 'build'),
(47, 'Phantom Bite', '{"command":"vibrate","intensity":55,"duration":7500}'::jsonb, 'climax'),
(48, 'Hush Money', '{"command":"vibrate","intensity":26,"duration":13000}'::jsonb, 'aftercare'),
(49, 'Last Call', '{"command":"vibrate","intensity":65,"duration":4500}'::jsonb, 'climax'),
(50, 'Abyssal Signature Wave', '{"command":"pattern","pattern":"Earthquake","intensity":50,"duration":15000}'::jsonb, 'signature')
ON CONFLICT (pool_index) DO NOTHING;

CREATE OR REPLACE FUNCTION public.trg_custom_characters_vibration_patterns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.assign_vibration_patterns_for_companion(
    'cc-' || NEW.id::text,
    NEW.name,
    COALESCE(NEW.rarity::text, 'common')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS custom_characters_vibration_patterns_aiu ON public.custom_characters;
CREATE TRIGGER custom_characters_vibration_patterns_aiu
  AFTER INSERT OR UPDATE OF rarity, name ON public.custom_characters
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_custom_characters_vibration_patterns();

-- Backfill stock companions
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, name, rarity FROM public.companions
  LOOP
    PERFORM public.assign_vibration_patterns_for_companion(r.id::text, r.name, COALESCE(r.rarity, 'common'));
  END LOOP;
END $$;

-- Backfill custom forges
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, name, rarity FROM public.custom_characters
  LOOP
    PERFORM public.assign_vibration_patterns_for_companion('cc-' || r.id::text, r.name, COALESCE(r.rarity, 'common'));
  END LOOP;
END $$;
