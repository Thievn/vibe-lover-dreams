-- Free chat lines: same calendar key as `src/lib/chatDailyQuota.ts` — America/New_York, new period at 03:00 local.

COMMENT ON COLUMN public.profiles.chat_daily_quota_date IS 'Eastern (America/New_York) quota-period date for chat_daily_quota_used; period starts 03:00 ET.';
COMMENT ON COLUMN public.profiles.chat_daily_quota_used IS 'User text chat messages consumed in the current Eastern quota period; first 20 per period are free.';

CREATE OR REPLACE FUNCTION public.chat_consume_message_quota ()
RETURNS TABLE (ok boolean, remaining_free integer, charged_fc integer, new_balance integer, err text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u uuid;
  today date := (((now() AT TIME ZONE 'America/New_York')::timestamp - interval '3 hours'))::date;
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
