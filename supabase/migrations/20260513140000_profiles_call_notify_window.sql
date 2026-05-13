-- When call_notify_window_enabled, call pushes (web-push-send) only send during
-- [call_notify_start_min, call_notify_end_min) in call_notify_tz (IANA), with overnight wrap if start > end.

alter table public.profiles
  add column if not exists call_notify_window_enabled boolean not null default false;

alter table public.profiles
  add column if not exists call_notify_tz text;

alter table public.profiles
  add column if not exists call_notify_start_min integer not null default 540;

alter table public.profiles
  add column if not exists call_notify_end_min integer not null default 1320;

comment on column public.profiles.call_notify_window_enabled is 'If true, restrict incoming-call Web Push to local window in call_notify_tz.';
comment on column public.profiles.call_notify_tz is 'IANA timezone for call_notify_*_min (e.g. America/New_York).';
comment on column public.profiles.call_notify_start_min is 'Allowed window start: minutes from midnight [0,1439].';
comment on column public.profiles.call_notify_end_min is 'Allowed window end: minutes from midnight [0,1439], exclusive same-day; overnight if start > end.';
