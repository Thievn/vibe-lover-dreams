-- One-time: seed character_reference from existing appearance_reference where empty (idempotent).

update public.companions
set character_reference = appearance_reference
where coalesce(nullif(btrim(character_reference), ''), '') = ''
  and appearance_reference is not null
  and length(btrim(appearance_reference)) >= 40;

update public.custom_characters
set character_reference = appearance_reference
where coalesce(nullif(btrim(character_reference), ''), '') = ''
  and appearance_reference is not null
  and length(btrim(appearance_reference)) >= 40;
