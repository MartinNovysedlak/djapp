-- Guest share hub: unique per-booking link for playlist + timeline (no registration)
-- Live requests keep using live_slug separately.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guest_share_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_guest_share_slug_uidx
  ON public.bookings (guest_share_slug)
  WHERE guest_share_slug IS NOT NULL;

-- Guest contributors have no profiles.id
ALTER TABLE public.booking_songs
  ALTER COLUMN added_by DROP NOT NULL;

ALTER TABLE public.booking_timeline
  ALTER COLUMN added_by DROP NOT NULL;
