-- Last-minute free slots with discounted price for near-term bookings
CREATE TABLE IF NOT EXISTS public.last_minute_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  discounted_price NUMERIC(10,2) NOT NULL CHECK (discounted_price >= 0),
  original_price NUMERIC(10,2) CHECK (original_price IS NULL OR original_price >= 0),
  book_within_days INTEGER NOT NULL DEFAULT 7
    CHECK (book_within_days >= 1 AND book_within_days <= 60),
  expires_at DATE NOT NULL,
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT last_minute_offers_dj_date_unique UNIQUE (dj_id, event_date),
  CONSTRAINT last_minute_offers_expires_before_event
    CHECK (expires_at <= event_date)
);

CREATE INDEX IF NOT EXISTS last_minute_offers_dj_id_idx
  ON public.last_minute_offers (dj_id);

CREATE INDEX IF NOT EXISTS last_minute_offers_active_lookup_idx
  ON public.last_minute_offers (event_date, expires_at)
  WHERE is_active = true;

ALTER TABLE public.last_minute_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DJs manage own last-minute offers" ON public.last_minute_offers;
CREATE POLICY "DJs manage own last-minute offers"
  ON public.last_minute_offers
  FOR ALL
  USING (auth.uid() = dj_id)
  WITH CHECK (auth.uid() = dj_id);

DROP POLICY IF EXISTS "Anyone can view active last-minute offers" ON public.last_minute_offers;
CREATE POLICY "Anyone can view active last-minute offers"
  ON public.last_minute_offers
  FOR SELECT
  USING (
    is_active = true
    AND event_date >= CURRENT_DATE
    AND expires_at >= CURRENT_DATE
  );
