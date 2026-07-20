-- Calendar sync: import ICS URL + secret export token
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS external_calendar_url text,
  ADD COLUMN IF NOT EXISTS calendar_export_token text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_calendar_export_token_uidx
  ON public.profiles (calendar_export_token)
  WHERE calendar_export_token IS NOT NULL;

UPDATE public.profiles
SET calendar_export_token = encode(gen_random_bytes(24), 'hex')
WHERE role = 'dj'
  AND calendar_export_token IS NULL;

COMMENT ON COLUMN public.profiles.external_calendar_url IS
  'Secret Google/Apple .ics feed URL used to block busy dates';
COMMENT ON COLUMN public.profiles.calendar_export_token IS
  'Secret token for /api/calendar/export/{token}.ics feed';
