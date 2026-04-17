-- TCG-style stat blocks: exactly 4 of 8 stats per companion (companions + custom_characters).
-- Values scale with rarity. Used in UI and Nexus compatibility weighting.

ALTER TABLE public.companions
  ADD COLUMN IF NOT EXISTS tcg_stats jsonb;

ALTER TABLE public.custom_characters
  ADD COLUMN IF NOT EXISTS tcg_stats jsonb;

COMMENT ON COLUMN public.companions.tcg_stats IS 'JSON object with exactly 4 keys from seduction, passion, fertility, synergy, dominance, mystique, wildness, devotion (0-100).';
COMMENT ON COLUMN public.custom_characters.tcg_stats IS 'Same TCG stat contract as companions.';

CREATE OR REPLACE FUNCTION public.generate_tcg_stats_for_row(row_id text, rarity text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  keys text[];
  sk text;
  result jsonb := '{}'::jsonb;
  tier_lo int;
  tier_hi int;
  h int;
  v int;
BEGIN
  keys := ARRAY(
    SELECT u.sk
    FROM unnest(ARRAY[
      'seduction','passion','fertility','synergy',
      'dominance','mystique','wildness','devotion'
    ]) AS u(sk)
    ORDER BY hashtext(row_id || u.sk)
    LIMIT 4
  );

  CASE lower(coalesce(rarity, 'common'))
    WHEN 'rare' THEN tier_lo := 44; tier_hi := 74;
    WHEN 'epic' THEN tier_lo := 50; tier_hi := 82;
    WHEN 'legendary' THEN tier_lo := 56; tier_hi := 88;
    WHEN 'mythic' THEN tier_lo := 60; tier_hi := 92;
    WHEN 'abyssal' THEN tier_lo := 66; tier_hi := 98;
    ELSE tier_lo := 38; tier_hi := 62;
  END CASE;

  FOREACH sk IN ARRAY keys
  LOOP
    h := abs(hashtext(row_id || sk));
    v := tier_lo + (h % (tier_hi - tier_lo + 1));
    result := result || jsonb_build_object(sk, v);
  END LOOP;

  RETURN result;
END;
$$;

UPDATE public.companions
SET tcg_stats = public.generate_tcg_stats_for_row(id::text, coalesce(rarity, 'common'))
WHERE tcg_stats IS NULL;

UPDATE public.custom_characters
SET tcg_stats = public.generate_tcg_stats_for_row(id::text, coalesce(rarity, 'rare'))
WHERE tcg_stats IS NULL;

-- Automatic portrait regeneration is not included here (would require many paid image API calls).
-- Use generate-image from the profile UI or admin tools for rows missing portraits.
