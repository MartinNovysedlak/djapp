-- Cover image on DJ profiles + admin can review bookings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_url text;

COMMENT ON COLUMN public.profiles.cover_url IS
  'Public cover/banner image on DJ profile header';

DROP POLICY IF EXISTS "Admins can read all bookings" ON public.bookings;
CREATE POLICY "Admins can read all bookings"
  ON public.bookings FOR SELECT
  USING (public.is_admin());
