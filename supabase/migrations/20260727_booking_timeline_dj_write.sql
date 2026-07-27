-- Allow DJ (as well as client) to write booking_timeline on accepted bookings

DROP POLICY IF EXISTS "Clients can add timeline items" ON public.booking_timeline;
CREATE POLICY "Booking parties can add timeline items"
  ON public.booking_timeline
  FOR INSERT
  WITH CHECK (
    auth.uid() = added_by
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND (b.client_id = auth.uid() OR b.dj_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Clients can delete timeline items" ON public.booking_timeline;
CREATE POLICY "Booking parties can delete timeline items"
  ON public.booking_timeline
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND (b.client_id = auth.uid() OR b.dj_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Clients can update timeline items" ON public.booking_timeline;
CREATE POLICY "Booking parties can update timeline items"
  ON public.booking_timeline
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND (b.client_id = auth.uid() OR b.dj_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND (b.client_id = auth.uid() OR b.dj_id = auth.uid())
    )
  );
