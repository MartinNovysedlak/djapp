-- Technical rider (DJ → venue/client) + venue questionnaire (client → DJ)

CREATE TABLE IF NOT EXISTS public.booking_tech_riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  power_requirements TEXT,
  table_or_stage TEXT,
  needs_di_boxes BOOLEAN NOT NULL DEFAULT false,
  di_boxes_count INTEGER,
  lighting_notes TEXT,
  pa_provided_by TEXT CHECK (pa_provided_by IS NULL OR pa_provided_by IN ('dj', 'venue', 'shared', 'other')),
  pa_notes TEXT,
  space_notes TEXT,
  parking_needed BOOLEAN NOT NULL DEFAULT false,
  load_in_notes TEXT,
  other_notes TEXT,
  visible_to_client BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booking_tech_riders_di_count_chk
    CHECK (di_boxes_count IS NULL OR (di_boxes_count >= 0 AND di_boxes_count <= 50))
);

CREATE TABLE IF NOT EXISTS public.booking_venue_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  venue_setting TEXT CHECK (venue_setting IS NULL OR venue_setting IN ('indoor', 'outdoor', 'mixed', 'unknown')),
  guest_count INTEGER,
  hall_size TEXT CHECK (hall_size IS NULL OR hall_size IN ('small', 'medium', 'large', 'unknown')),
  hall_size_notes TEXT,
  ceiling_height TEXT,
  power_available TEXT CHECK (power_available IS NULL OR power_available IN ('yes', 'no', 'unknown')),
  power_notes TEXT,
  stage_available BOOLEAN,
  outdoor_notes TEXT,
  other_notes TEXT,
  submitted_at TIMESTAMPTZ,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booking_venue_guest_count_chk
    CHECK (guest_count IS NULL OR (guest_count >= 1 AND guest_count <= 20000))
);

CREATE INDEX IF NOT EXISTS booking_tech_riders_booking_id_idx
  ON public.booking_tech_riders (booking_id);

CREATE INDEX IF NOT EXISTS booking_venue_questionnaires_booking_id_idx
  ON public.booking_venue_questionnaires (booking_id);

ALTER TABLE public.booking_tech_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_venue_questionnaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking parties view tech rider" ON public.booking_tech_riders;
CREATE POLICY "Booking parties view tech rider"
  ON public.booking_tech_riders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND (
          b.dj_id = auth.uid()
          OR (b.client_id = auth.uid() AND visible_to_client = true)
        )
    )
  );

DROP POLICY IF EXISTS "DJs manage tech rider" ON public.booking_tech_riders;
CREATE POLICY "DJs manage tech rider"
  ON public.booking_tech_riders
  FOR ALL
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

DROP POLICY IF EXISTS "Booking parties view venue questionnaire" ON public.booking_venue_questionnaires;
CREATE POLICY "Booking parties view venue questionnaire"
  ON public.booking_venue_questionnaires
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND (b.dj_id = auth.uid() OR b.client_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Clients upsert venue questionnaire" ON public.booking_venue_questionnaires;
CREATE POLICY "Clients upsert venue questionnaire"
  ON public.booking_venue_questionnaires
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND b.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clients update venue questionnaire" ON public.booking_venue_questionnaires;
CREATE POLICY "Clients update venue questionnaire"
  ON public.booking_venue_questionnaires
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND b.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'accepted'
        AND b.client_id = auth.uid()
    )
  );
