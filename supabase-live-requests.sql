-- =============================================
-- Live Guest Song Requests
-- Public /live/[slug] + DJ booth Realtime
-- =============================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS live_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_live_slug_uidx
  ON public.bookings (live_slug)
  WHERE live_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.live_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  song_title TEXT NOT NULL,
  artist TEXT NOT NULL,
  guest_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'played', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_requests_booking_id_created_idx
  ON public.live_requests (booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS live_requests_booking_id_status_idx
  ON public.live_requests (booking_id, status);

ALTER TABLE public.live_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking parties view live requests" ON public.live_requests;
CREATE POLICY "Booking parties view live requests"
  ON public.live_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND (b.dj_id = auth.uid() OR b.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "DJs update live requests" ON public.live_requests;
CREATE POLICY "DJs update live requests"
  ON public.live_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND b.dj_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND b.dj_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "DJs delete live requests" ON public.live_requests;
CREATE POLICY "DJs delete live requests"
  ON public.live_requests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND b.dj_id = auth.uid()
    )
  );

-- Realtime (run once)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.live_requests;
