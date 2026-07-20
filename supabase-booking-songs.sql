-- =============================================
-- DJ App - Hudobný plánovač (booking_songs)
-- Run this in Supabase SQL Editor
-- Depends on: public.bookings, public.profiles
-- =============================================

CREATE TABLE IF NOT EXISTS public.booking_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  notes TEXT,
  category TEXT NOT NULL CHECK (category IN ('must_play', 'optional', 'do_not_play')),
  is_played BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_songs_booking_id_idx
  ON public.booking_songs (booking_id);

CREATE INDEX IF NOT EXISTS booking_songs_category_idx
  ON public.booking_songs (booking_id, category);

ALTER TABLE public.booking_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking parties can view songs" ON public.booking_songs;
CREATE POLICY "Booking parties can view songs"
  ON public.booking_songs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND (b.dj_id = auth.uid() OR b.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Clients can add songs" ON public.booking_songs;
CREATE POLICY "Clients can add songs"
  ON public.booking_songs
  FOR INSERT
  WITH CHECK (
    auth.uid() = added_by
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND b.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clients can delete songs" ON public.booking_songs;
CREATE POLICY "Clients can delete songs"
  ON public.booking_songs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND b.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "DJs can update song played status" ON public.booking_songs;
CREATE POLICY "DJs can update song played status"
  ON public.booking_songs
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
