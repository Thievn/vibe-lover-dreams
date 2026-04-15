-- Globally unique display usernames (case-insensitive). Empty / null names are not part of the pool.

CREATE OR REPLACE FUNCTION public.is_display_name_available(p_name text, p_exclude_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE length(trim(COALESCE(display_name, ''))) > 0
      AND lower(trim(display_name)) = lower(trim(p_name))
      AND (p_exclude_user_id IS NULL OR user_id <> p_exclude_user_id)
  );
$$;

REVOKE ALL ON FUNCTION public.is_display_name_available(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_display_name_available(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_display_name_available(text, uuid) TO authenticated;

COMMENT ON FUNCTION public.is_display_name_available(text, uuid) IS
  'True if no other profile holds this display_name (case-insensitive). p_exclude_user_id skips current user on rename.';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_display_name_lower_unique
ON public.profiles (lower(trim(display_name)))
WHERE trim(COALESCE(display_name, '')) <> '';
