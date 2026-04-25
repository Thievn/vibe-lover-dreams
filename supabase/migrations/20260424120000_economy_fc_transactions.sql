-- Forge Coins (FC): 1 FC = $0.01. profiles.tokens_balance = FC.
-- user_transactions: ledger (credits_change negative = spend, positive = credit).

CREATE TABLE IF NOT EXISTS public.user_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  credits_change integer NOT NULL CHECK (credits_change <> 0),
  balance_after integer NOT NULL,
  transaction_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_transactions_user_id_created_at_idx
  ON public.user_transactions (user_id, created_at DESC);

COMMENT ON TABLE public.user_transactions IS 'Forge Coins ledger. credits_change: negative = user spent FC, positive = user received.';

ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own transactions" ON public.user_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.spend_forge_coins(
  p_amount integer,
  p_transaction_type text,
  p_description text DEFAULT '',
  p_metadata jsonb DEFAULT '{}'
)
RETURNS TABLE (ok boolean, new_balance integer, err text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u uuid;
  cur integer;
  nxt integer;
BEGIN
  u := auth.uid();
  IF u IS NULL THEN
    RETURN QUERY SELECT false, 0, 'not_authenticated'::text;
    RETURN;
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT false, 0, 'invalid_amount'::text;
    RETURN;
  END IF;
  IF p_transaction_type IS NULL OR btrim(p_transaction_type) = '' THEN
    RETURN QUERY SELECT false, 0, 'invalid_type'::text;
    RETURN;
  END IF;
  SELECT tokens_balance INTO cur FROM public.profiles WHERE user_id = u FOR UPDATE;
  IF NOT FOUND OR cur IS NULL THEN
    RETURN QUERY SELECT false, 0, 'no_profile'::text;
    RETURN;
  END IF;
  IF cur < p_amount THEN
    RETURN QUERY SELECT false, cur, 'insufficient_funds'::text;
    RETURN;
  END IF;
  nxt := cur - p_amount;
  UPDATE public.profiles SET tokens_balance = nxt WHERE user_id = u;
  INSERT INTO public.user_transactions (user_id, credits_change, balance_after, transaction_type, description, metadata)
  VALUES (u, -p_amount, nxt, p_transaction_type, p_description, COALESCE(p_metadata, '{}'));
  RETURN QUERY SELECT true, nxt, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.spend_forge_coins (integer, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spend_forge_coins (integer, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.credit_forge_coins(
  p_amount integer,
  p_transaction_type text,
  p_description text DEFAULT '',
  p_metadata jsonb DEFAULT '{}'
)
RETURNS TABLE (ok boolean, new_balance integer, err text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u uuid;
  cur integer;
  nxt integer;
BEGIN
  u := auth.uid();
  IF u IS NULL THEN
    RETURN QUERY SELECT false, 0, 'not_authenticated'::text;
    RETURN;
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT false, 0, 'invalid_amount'::text;
    RETURN;
  END IF;
  IF p_transaction_type IS NULL OR btrim(p_transaction_type) = '' THEN
    RETURN QUERY SELECT false, 0, 'invalid_type'::text;
    RETURN;
  END IF;
  SELECT tokens_balance INTO cur FROM public.profiles WHERE user_id = u FOR UPDATE;
  IF NOT FOUND OR cur IS NULL THEN
    RETURN QUERY SELECT false, 0, 'no_profile'::text;
    RETURN;
  END IF;
  nxt := cur + p_amount;
  UPDATE public.profiles SET tokens_balance = nxt WHERE user_id = u;
  INSERT INTO public.user_transactions (user_id, credits_change, balance_after, transaction_type, description, metadata)
  VALUES (u, p_amount, nxt, p_transaction_type, p_description, COALESCE(p_metadata, '{}'));
  RETURN QUERY SELECT true, nxt, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_forge_coins (integer, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_forge_coins (integer, text, text, jsonb) TO authenticated;

-- Rarity -> FC for Discover (must match src/lib/forgeEconomy.ts)
CREATE OR REPLACE FUNCTION public.discover_purchase_price_fc (p_rarity text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(p_rarity))
    WHEN 'common' THEN 12
    WHEN 'rare' THEN 20
    WHEN 'epic' THEN 32
    WHEN 'legendary' THEN 45
    WHEN 'mythic' THEN 68
    WHEN 'abyssal' THEN 95
    ELSE 20
  END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_discover_companion (p_companion_id text)
RETURNS TABLE (ok boolean, already_owned boolean, new_balance integer, price_fc integer, err text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u uuid;
  rar text;
  price integer;
  cur integer;
  nxt integer;
  v text;
  inner_u uuid;
BEGIN
  u := auth.uid();
  v := btrim(p_companion_id);
  IF u IS NULL THEN
    RETURN QUERY SELECT false, false, 0, 0, 'not_authenticated'::text;
    RETURN;
  END IF;
  IF v = '' THEN
    RETURN QUERY SELECT false, false, 0, 0, 'invalid_companion'::text;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_discover_pins p WHERE p.user_id = u AND p.companion_id = v) THEN
    SELECT p.tokens_balance INTO nxt FROM public.profiles p WHERE p.user_id = u;
    RETURN QUERY SELECT true, true, COALESCE(nxt, 0), 0, NULL::text;
    RETURN;
  END IF;
  rar := NULL;
  IF v ~* '^cc-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    inner_u := (substring(v from 4))::uuid;
    SELECT c.rarity INTO rar
    FROM public.custom_characters c
    WHERE c.id = inner_u
      AND c.is_public = true
      AND c.approved = true
    LIMIT 1;
  ELSE
    SELECT c2.rarity INTO rar
    FROM public.companions c2
    WHERE c2.id = v AND c2.is_active = true
    LIMIT 1;
  END IF;
  IF rar IS NULL THEN
    RETURN QUERY SELECT false, false, 0, 0, 'companion_not_found'::text;
    RETURN;
  END IF;
  price := public.discover_purchase_price_fc(rar);
  IF price <= 0 THEN
    RETURN QUERY SELECT false, false, 0, 0, 'invalid_price'::text;
    RETURN;
  END IF;
  SELECT p.tokens_balance INTO cur FROM public.profiles p WHERE p.user_id = u FOR UPDATE;
  IF NOT FOUND OR cur IS NULL THEN
    RETURN QUERY SELECT false, false, 0, price, 'no_profile'::text;
    RETURN;
  END IF;
  IF cur < price THEN
    RETURN QUERY SELECT false, false, cur, price, 'insufficient_funds'::text;
    RETURN;
  END IF;
  nxt := cur - price;
  UPDATE public.profiles p SET tokens_balance = nxt WHERE p.user_id = u;
  INSERT INTO public.user_discover_pins (user_id, companion_id) VALUES (u, v) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_transactions (user_id, credits_change, balance_after, transaction_type, description, metadata)
  VALUES (u, -price, nxt, 'card_purchase', 'Discover: collection unlock', jsonb_build_object('companion_id', v, 'rarity', rar, 'fc', price));
  RETURN QUERY SELECT true, false, nxt, price, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_discover_companion (text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_discover_companion (text) TO authenticated;

REVOKE ALL ON FUNCTION public.discover_purchase_price_fc (text) FROM PUBLIC;
