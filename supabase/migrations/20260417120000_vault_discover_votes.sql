-- Personal vault vs public discover: hide admin-lab forges from "My Collection" while keeping them in Discover
ALTER TABLE public.custom_characters
  ADD COLUMN IF NOT EXISTS exclude_from_personal_vault boolean NOT NULL DEFAULT false;

UPDATE public.custom_characters SET exclude_from_personal_vault = false WHERE exclude_from_personal_vault IS NULL;

-- Thumbs up (+1) / meh (-1) per user per companion (Discover / profile)
CREATE TABLE IF NOT EXISTS public.companion_discovery_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  companion_id text NOT NULL,
  vote smallint NOT NULL CHECK (vote = ANY (ARRAY[-1, 1])),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, companion_id)
);

CREATE INDEX IF NOT EXISTS idx_companion_discovery_votes_companion_id ON public.companion_discovery_votes(companion_id);

-- Saved picks from Discover → show in "My Collection"
CREATE TABLE IF NOT EXISTS public.user_discover_pins (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  companion_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, companion_id)
);

CREATE INDEX IF NOT EXISTS idx_user_discover_pins_user_id ON public.user_discover_pins(user_id);

ALTER TABLE public.companion_discovery_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_discover_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own discovery votes" ON public.companion_discovery_votes;
CREATE POLICY "Users manage own discovery votes"
  ON public.companion_discovery_votes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all discovery votes" ON public.companion_discovery_votes;
CREATE POLICY "Admins read all discovery votes"
  ON public.companion_discovery_votes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users manage own discover pins" ON public.user_discover_pins;
CREATE POLICY "Users manage own discover pins"
  ON public.user_discover_pins FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
