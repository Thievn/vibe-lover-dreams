-- 5-tier chat affection: message-count progression + rewards (client-driven)
ALTER TABLE public.companion_relationships
  ADD COLUMN IF NOT EXISTS chat_affection_level integer NOT NULL DEFAULT 1
    CHECK (chat_affection_level >= 1 AND chat_affection_level <= 5),
  ADD COLUMN IF NOT EXISTS chat_affection_progress integer NOT NULL DEFAULT 0
    CHECK (chat_affection_progress >= 0);

COMMENT ON COLUMN public.companion_relationships.chat_affection_level IS 'Chat bond tier 1–5 (separate from legacy affection_level 0–100 mood sync).';
COMMENT ON COLUMN public.companion_relationships.chat_affection_progress IS 'User–assistant exchanges counted toward the next tier within the current tier.';

-- Map existing mood score into a starting tier so long-time users are not reset to 1
UPDATE public.companion_relationships
SET
  chat_affection_level = CASE
    WHEN affection_level >= 85 THEN 5
    WHEN affection_level >= 65 THEN 4
    WHEN affection_level >= 45 THEN 3
    WHEN affection_level >= 25 THEN 2
    ELSE 1
  END,
  chat_affection_progress = 0
;
