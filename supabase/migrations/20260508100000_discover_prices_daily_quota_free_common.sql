-- Discover card FC prices (keep in sync with src/lib/forgeEconomy.ts discoverCardPriceFc)
-- Daily chat message quota + one-time free Common discover unlock

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discover_free_common_claimed boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chat_daily_quota_date date;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chat_daily_quota_used integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.discover_free_common_claimed IS 'True after user unlocks their one-time free Common card from Discover.';
COMMENT ON COLUMN public.profiles.chat_daily_quota_date IS 'UTC calendar date for which chat_daily_quota_used applies.';
COMMENT ON COLUMN public.profiles.chat_daily_quota_used IS 'User text chat messages consumed today (UTC); first 20 are free.';

CREATE OR REPLACE FUNCTION public.discover_purchase_price_fc (p_rarity text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(p_rarity))
    WHEN 'common' THEN 180
    WHEN 'rare' THEN 350
    WHEN 'epic' THEN 520
    WHEN 'legendary' THEN 850
    WHEN 'mythic' THEN 720
    WHEN 'abyssal' THEN 950
    ELSE 350
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
  claimed boolean;
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
  SELECT p.tokens_balance, COALESCE(p.discover_free_common_claimed, false)
  INTO cur, claimed
  FROM public.profiles p
  WHERE p.user_id = u
  FOR UPDATE;
  IF NOT FOUND OR cur IS NULL THEN
    RETURN QUERY SELECT false, false, 0, price, 'no_profile'::text;
    RETURN;
  END IF;
  IF lower(rar) = 'common' AND NOT claimed THEN
    price := 0;
  END IF;
  IF price < 0 THEN
    RETURN QUERY SELECT false, false, cur, price, 'invalid_price'::text;
    RETURN;
  END IF;
  IF price > 0 AND cur < price THEN
    RETURN QUERY SELECT false, false, cur, price, 'insufficient_funds'::text;
    RETURN;
  END IF;
  nxt := cur - price;
  UPDATE public.profiles p
  SET
    tokens_balance = nxt,
    discover_free_common_claimed = CASE
      WHEN lower(rar) = 'common' AND NOT p.discover_free_common_claimed AND price = 0 THEN true
      ELSE p.discover_free_common_claimed
    END
  WHERE p.user_id = u;
  INSERT INTO public.user_discover_pins (user_id, companion_id) VALUES (u, v) ON CONFLICT DO NOTHING;
  IF price > 0 THEN
    INSERT INTO public.user_transactions (user_id, credits_change, balance_after, transaction_type, description, metadata)
    VALUES (
      u,
      -price,
      nxt,
      'card_purchase',
      'Discover: collection unlock',
      jsonb_build_object('companion_id', v, 'rarity', rar, 'fc', price)
    );
  END IF;
  RETURN QUERY SELECT true, false, nxt, price, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_discover_companion (text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_discover_companion (text) TO authenticated;

REVOKE ALL ON FUNCTION public.discover_purchase_price_fc (text) FROM PUBLIC;

-- After 20 free text messages (UTC day), each message costs this many FC (match app CHAT_MESSAGE_FC_AFTER_DAILY_FREE).
CREATE OR REPLACE FUNCTION public.chat_consume_message_quota ()
RETURNS TABLE (ok boolean, remaining_free integer, charged_fc integer, new_balance integer, err text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u uuid;
  today date := (timezone('utc', now()))::date;
  cur_bal integer;
  prev_used integer;
  prev_date date;
  new_used integer;
  rem integer;
  daily_max constant integer := 20;
  overage_fc constant integer := 2;
  nxt integer;
BEGIN
  u := auth.uid();
  IF u IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 0, 'not_authenticated'::text;
    RETURN;
  END IF;
  SELECT p.tokens_balance, p.chat_daily_quota_date, p.chat_daily_quota_used
  INTO cur_bal, prev_date, prev_used
  FROM public.profiles p
  WHERE p.user_id = u
  FOR UPDATE;
  IF NOT FOUND OR cur_bal IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 0, 'no_profile'::text;
    RETURN;
  END IF;

  IF prev_date IS NULL OR prev_date < today THEN
    new_used := 1;
    UPDATE public.profiles p
    SET chat_daily_quota_date = today, chat_daily_quota_used = new_used
    WHERE p.user_id = u;
    SELECT p.tokens_balance INTO cur_bal FROM public.profiles p WHERE p.user_id = u;
    rem := daily_max - new_used;
    RETURN QUERY SELECT true, GREATEST(0, rem), 0, cur_bal, NULL::text;
    RETURN;
  END IF;

  IF prev_used < daily_max THEN
    new_used := prev_used + 1;
    UPDATE public.profiles p
    SET chat_daily_quota_used = new_used, chat_daily_quota_date = today
    WHERE p.user_id = u;
    SELECT p.tokens_balance INTO cur_bal FROM public.profiles p WHERE p.user_id = u;
    rem := daily_max - new_used;
    RETURN QUERY SELECT true, GREATEST(0, rem), 0, cur_bal, NULL::text;
    RETURN;
  END IF;

  IF cur_bal < overage_fc THEN
    RETURN QUERY SELECT false, 0, overage_fc, cur_bal, 'insufficient_funds'::text;
    RETURN;
  END IF;

  nxt := cur_bal - overage_fc;
  new_used := prev_used + 1;
  UPDATE public.profiles p
  SET
    tokens_balance = nxt,
    chat_daily_quota_used = new_used,
    chat_daily_quota_date = today
  WHERE p.user_id = u;
  INSERT INTO public.user_transactions (user_id, credits_change, balance_after, transaction_type, description, metadata)
  VALUES (u, -overage_fc, nxt, 'chat_message', 'Chat message (after daily free quota)', jsonb_build_object('fc', overage_fc));
  RETURN QUERY SELECT true, 0, overage_fc, nxt, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.chat_consume_message_quota () FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chat_consume_message_quota () TO authenticated;
