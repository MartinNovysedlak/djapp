-- Public review invite link (no platform account required)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS review_share_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_review_share_slug_uidx
  ON public.bookings (review_share_slug)
  WHERE review_share_slug IS NOT NULL;

COMMENT ON COLUMN public.bookings.review_share_slug IS
  'Public token for /hodnotenie/[slug] — rate DJ without platform account';

ALTER TABLE public.reviews
  ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

COMMENT ON COLUMN public.reviews.reviewer_name IS
  'Display name for guest reviews submitted via invite link';
