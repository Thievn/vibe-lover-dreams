-- X Marketing: optional companion profile URL + CTA appended to Zernio post body.

ALTER TABLE public.marketing_social_settings
  ADD COLUMN IF NOT EXISTS x_append_profile_link boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS x_profile_link_cta_preset text NOT NULL DEFAULT 'check_out',
  ADD COLUMN IF NOT EXISTS x_profile_link_cta_custom text;

COMMENT ON COLUMN public.marketing_social_settings.x_append_profile_link IS 'When true, append themed CTA + profile URL to X post body (Compose) when a companion is selected.';
COMMENT ON COLUMN public.marketing_social_settings.x_profile_link_cta_preset IS 'check_out | meet | tap | custom';
COMMENT ON COLUMN public.marketing_social_settings.x_profile_link_cta_custom IS 'When preset is custom: template with {name} and optional {tagline}.';
