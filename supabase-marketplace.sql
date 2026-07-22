-- =============================================
-- DJ App - Marketplace Refactor (Clients, Booking flow, Reviews)
-- Run this in Supabase SQL Editor
-- Depends on: public.profiles, public.bookings
--   (see supabase-setup.sql and supabase-bookings.sql)
-- =============================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. profiles.role — 'dj' (default, backwards compatible) or 'client'
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'dj';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('dj', 'client'));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. bookings — status workflow, multi-day range, linked client account
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'accepted', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS bookings_client_id_idx ON public.bookings (client_id);

-- Bookings now require a logged-in client account, so the old "anyone can
-- insert" policy is replaced with one that ties the row to the caller.
DROP POLICY IF EXISTS "Anyone can create a booking request" ON public.bookings;

CREATE POLICY "Clients can create booking requests"
  ON public.bookings
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- Clients can see the requests they sent (incl. legacy rows matched by email).
DROP POLICY IF EXISTS "Clients can view their own booking requests" ON public.bookings;
CREATE POLICY "Clients can view their own booking requests"
  ON public.bookings
  FOR SELECT
  USING (
    auth.uid() = client_id
    OR (
      client_id IS NULL
      AND lower(client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

DROP POLICY IF EXISTS "Clients can claim orphaned bookings" ON public.bookings;
CREATE POLICY "Clients can claim orphaned bookings"
  ON public.bookings
  FOR UPDATE
  USING (
    client_id IS NULL
    AND lower(client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  WITH CHECK (
    auth.uid() = client_id
    AND lower(client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- DJs can accept/reject their own incoming requests.
DROP POLICY IF EXISTS "DJs can update their own booking requests" ON public.bookings;
CREATE POLICY "DJs can update their own booking requests"
  ON public.bookings
  FOR UPDATE
  USING (auth.uid() = dj_id)
  WITH CHECK (auth.uid() = dj_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. reviews — clients rate a DJ after an accepted, past event
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS reviews_dj_id_idx ON public.reviews (dj_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews"
  ON public.reviews
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Clients can create their own reviews" ON public.reviews;
CREATE POLICY "Clients can create their own reviews"
  ON public.reviews
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can update their own reviews" ON public.reviews;
CREATE POLICY "Clients can update their own reviews"
  ON public.reviews
  FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Signup trigger now also stores the chosen role ('dj' | 'client'),
--    read from the auth signUp `options.data.role` metadata.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, public_slug, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''),
    public.allocate_unique_public_slug(
      public.slugify_artist_name(COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''))
    ),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'dj')
  );
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Exact start/end times + public busy dates for /djs/[slug]
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS start_time TIME NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS end_time TIME NOT NULL DEFAULT '23:00';

CREATE OR REPLACE VIEW public.dj_busy_dates AS
SELECT
  dj_id,
  event_date,
  COALESCE(end_date, event_date) AS end_date,
  start_time,
  end_time,
  event_type,
  type,
  title,
  all_day
FROM public.bookings
WHERE status = 'accepted' OR type = 'blockout';

GRANT SELECT ON public.dj_busy_dates TO anon, authenticated;

-- Blockouts / DJ self-managed calendar entries
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'booking',
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS all_day BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.bookings ALTER COLUMN client_name DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN client_email DROP NOT NULL;

-- Review likes / dislikes
CREATE TABLE IF NOT EXISTS public.review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS review_votes_review_id_idx ON public.review_votes (review_id);

ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view review votes" ON public.review_votes;
CREATE POLICY "Anyone can view review votes"
  ON public.review_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert their votes" ON public.review_votes;
CREATE POLICY "Authenticated users can insert their votes"
  ON public.review_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own votes" ON public.review_votes;
CREATE POLICY "Users can update their own votes"
  ON public.review_votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own votes" ON public.review_votes;
CREATE POLICY "Users can delete their own votes"
  ON public.review_votes FOR DELETE
  USING (auth.uid() = user_id);

