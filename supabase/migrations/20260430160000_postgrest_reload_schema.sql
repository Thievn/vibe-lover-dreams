-- Bust PostgREST schema cache so new columns (e.g. custom_characters.profile_loop_video_enabled) are visible to the API.
-- Safe no-op if listener not attached during migration run.
NOTIFY pgrst, 'reload schema';
