-- =============================================
-- Bulk inquiry: get offers from up to 4 DJs
-- =============================================

CREATE TABLE IF NOT EXISTS public.bulk_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  end_date DATE,
  start_time TIME NOT NULL DEFAULT '18:00',
  end_time TIME NOT NULL DEFAULT '23:00',
  event_type TEXT NOT NULL,
  event_location TEXT,
  message TEXT,
  genre TEXT,
  max_djs SMALLINT NOT NULL DEFAULT 3 CHECK (max_djs BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'cancelled')),
  chosen_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bulk_inquiries_client_created_idx
  ON public.bulk_inquiries (client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.bulk_inquiry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES public.bulk_inquiries(id) ON DELETE CASCADE,
  dj_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  offer_price NUMERIC(12, 2),
  offer_message TEXT,
  item_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (item_status IN ('pending', 'offered', 'declined', 'accepted', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (inquiry_id, dj_id)
);

CREATE INDEX IF NOT EXISTS bulk_inquiry_items_dj_idx
  ON public.bulk_inquiry_items (dj_id, item_status);

CREATE INDEX IF NOT EXISTS bulk_inquiry_items_inquiry_idx
  ON public.bulk_inquiry_items (inquiry_id);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS bulk_inquiry_id UUID
    REFERENCES public.bulk_inquiries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_bulk_inquiry_id_idx
  ON public.bookings (bulk_inquiry_id)
  WHERE bulk_inquiry_id IS NOT NULL;

ALTER TABLE public.bulk_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_inquiry_items ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER helpers avoid infinite recursion between the two tables' policies
CREATE OR REPLACE FUNCTION public.is_bulk_inquiry_owner(p_inquiry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bulk_inquiries b
    WHERE b.id = p_inquiry_id
      AND b.client_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.dj_in_bulk_inquiry(p_inquiry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bulk_inquiry_items i
    WHERE i.inquiry_id = p_inquiry_id
      AND i.dj_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_bulk_inquiry_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dj_in_bulk_inquiry(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_bulk_inquiry_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dj_in_bulk_inquiry(uuid) TO authenticated;

DROP POLICY IF EXISTS "Clients manage own bulk inquiries" ON public.bulk_inquiries;
CREATE POLICY "Clients manage own bulk inquiries"
  ON public.bulk_inquiries
  FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "DJs view related bulk inquiries" ON public.bulk_inquiries;
CREATE POLICY "DJs view related bulk inquiries"
  ON public.bulk_inquiries
  FOR SELECT
  USING (public.dj_in_bulk_inquiry(id));

DROP POLICY IF EXISTS "Clients manage own inquiry items" ON public.bulk_inquiry_items;
CREATE POLICY "Clients manage own inquiry items"
  ON public.bulk_inquiry_items
  FOR ALL
  USING (public.is_bulk_inquiry_owner(inquiry_id))
  WITH CHECK (public.is_bulk_inquiry_owner(inquiry_id));

DROP POLICY IF EXISTS "DJs manage own inquiry items" ON public.bulk_inquiry_items;
CREATE POLICY "DJs manage own inquiry items"
  ON public.bulk_inquiry_items
  FOR SELECT
  USING (dj_id = auth.uid());

DROP POLICY IF EXISTS "DJs update own inquiry items" ON public.bulk_inquiry_items;
CREATE POLICY "DJs update own inquiry items"
  ON public.bulk_inquiry_items
  FOR UPDATE
  USING (dj_id = auth.uid())
  WITH CHECK (dj_id = auth.uid());
