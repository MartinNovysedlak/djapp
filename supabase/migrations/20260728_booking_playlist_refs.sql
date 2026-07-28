-- Reference playlists (Spotify / YouTube) for music style briefing
CREATE TABLE IF NOT EXISTS public.booking_playlist_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  title TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('spotify', 'youtube', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_playlist_refs_booking_id_idx
  ON public.booking_playlist_refs (booking_id, created_at ASC);

ALTER TABLE public.booking_playlist_refs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking parties can view playlist refs" ON public.booking_playlist_refs;
CREATE POLICY "Booking parties can view playlist refs"
  ON public.booking_playlist_refs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND (b.dj_id = auth.uid() OR b.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Clients can add playlist refs" ON public.booking_playlist_refs;
CREATE POLICY "Clients can add playlist refs"
  ON public.booking_playlist_refs
  FOR INSERT
  WITH CHECK (
    (added_by IS NULL OR auth.uid() = added_by)
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND b.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clients can delete playlist refs" ON public.booking_playlist_refs;
CREATE POLICY "Clients can delete playlist refs"
  ON public.booking_playlist_refs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND b.client_id = auth.uid()
    )
  );
