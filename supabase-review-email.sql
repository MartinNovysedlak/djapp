-- Post-event Google review email automation
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS review_email_sent boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS google_review_link text;

COMMENT ON COLUMN public.bookings.review_email_sent IS
  'True after post-event Google review thank-you email was sent to client';
COMMENT ON COLUMN public.profiles.google_review_link IS
  'Short Google review / Google Business Profile write-review URL';

CREATE INDEX IF NOT EXISTS bookings_review_email_cron_idx
  ON public.bookings (status, review_email_sent, event_date)
  WHERE review_email_sent = false AND status = 'accepted';
