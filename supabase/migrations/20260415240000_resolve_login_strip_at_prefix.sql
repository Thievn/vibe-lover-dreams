-- Allow sign-in with @Handle (same as Handle) for display usernames.

CREATE OR REPLACE FUNCTION public.resolve_login_email(p_login text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_trim text;
  v_count int;
  v_email text;
BEGIN
  v_trim := trim(p_login);
  IF v_trim IS NULL OR length(v_trim) < 3 THEN
    RETURN NULL;
  END IF;

  IF left(v_trim, 1) = '@' THEN
    v_trim := trim(substring(v_trim from 2));
  END IF;

  IF v_trim IS NULL OR length(v_trim) < 3 THEN
    RETURN NULL;
  END IF;

  IF v_trim ~* '^[^[:space:]]+@[^[:space:]]+\.[^[:space:]]+$' THEN
    RETURN lower(v_trim);
  END IF;

  WITH candidates AS (
    SELECT DISTINCT u.email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE lower(trim(COALESCE(p.display_name, ''))) = lower(v_trim)
       OR lower(trim(COALESCE(u.raw_user_meta_data ->> 'username', ''))) = lower(v_trim)
       OR lower(trim(COALESCE(u.raw_user_meta_data ->> 'full_name', ''))) = lower(v_trim)
  )
  SELECT count(*)::int INTO v_count FROM candidates;

  IF v_count IS DISTINCT FROM 1 THEN
    RETURN NULL;
  END IF;

  WITH candidates AS (
    SELECT DISTINCT u.email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE lower(trim(COALESCE(p.display_name, ''))) = lower(v_trim)
       OR lower(trim(COALESCE(u.raw_user_meta_data ->> 'username', ''))) = lower(v_trim)
       OR lower(trim(COALESCE(u.raw_user_meta_data ->> 'full_name', ''))) = lower(v_trim)
  )
  SELECT email INTO v_email FROM candidates LIMIT 1;

  RETURN v_email;
END;
$$;
