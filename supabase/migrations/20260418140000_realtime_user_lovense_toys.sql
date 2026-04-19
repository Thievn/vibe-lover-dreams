-- Let clients subscribe to toy rows during QR pairing (instant “connected” when callback writes).
DO $do$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_lovense_toys;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END
$do$;
