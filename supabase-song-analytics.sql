-- Song URL + normalized_title + fuzzy analytics (pg_trgm)
-- Applied remotely; kept here for reference.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

ALTER TABLE public.booking_songs
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS normalized_title TEXT;

ALTER TABLE public.live_requests
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS normalized_title TEXT;

CREATE INDEX IF NOT EXISTS booking_songs_normalized_title_trgm_idx
  ON public.booking_songs USING gin (normalized_title extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS live_requests_normalized_title_trgm_idx
  ON public.live_requests USING gin (normalized_title extensions.gin_trgm_ops);

-- See migration: dj_fuzzy_song_top(p_source, p_limit, p_threshold)
-- See migration: dj_booking_activity_stats()
