-- =============================================
-- Špeciálna ponuka (dj_extras + booking_extras)
-- DJ pripraví ponuku; klient si vyberá „Špeciálne požiadavky“
-- Cena sa v UI nepoužíva (price / unit_price default 0)
-- =============================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS base_price NUMERIC;

CREATE TABLE IF NOT EXISTS public.dj_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0 CHECK (price >= 0),
  icon TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  extra_id UUID REFERENCES public.dj_extras(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  unit_price NUMERIC NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, extra_id)
);

ALTER TABLE public.dj_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_extras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DJs manage own extras" ON public.dj_extras;
CREATE POLICY "DJs manage own extras"
  ON public.dj_extras
  FOR ALL
  USING (auth.uid() = dj_id)
  WITH CHECK (auth.uid() = dj_id);

DROP POLICY IF EXISTS "Clients view active extras for their bookings" ON public.dj_extras;
CREATE POLICY "Clients view active extras for their bookings"
  ON public.dj_extras
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.dj_id = dj_extras.dj_id
        AND b.client_id = auth.uid()
        AND b.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Booking parties view booking extras" ON public.booking_extras;
CREATE POLICY "Booking parties view booking extras"
  ON public.booking_extras
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND (b.dj_id = auth.uid() OR b.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Clients add booking extras" ON public.booking_extras;
CREATE POLICY "Clients add booking extras"
  ON public.booking_extras
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND b.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clients delete booking extras" ON public.booking_extras;
CREATE POLICY "Clients delete booking extras"
  ON public.booking_extras
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND b.client_id = auth.uid()
    )
  );
