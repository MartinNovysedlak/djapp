-- Rename/replace tech rider → clear DJ requirements for private events

DROP TABLE IF EXISTS public.booking_tech_riders CASCADE;

CREATE TABLE IF NOT EXISTS public.booking_dj_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- Ozvučenie (PA)
  sound_provided_by TEXT
    CHECK (sound_provided_by IS NULL OR sound_provided_by IN (
      'dj_brings', 'venue_has', 'shared', 'need_from_venue'
    )),
  sound_notes TEXT,

  -- Stôl / pult pre DJ
  booth_table_notes TEXT,

  -- Prúd
  power_sockets_min INTEGER
    CHECK (power_sockets_min IS NULL OR (power_sockets_min >= 1 AND power_sockets_min <= 20)),
  power_dedicated_circuit BOOLEAN NOT NULL DEFAULT false,
  power_notes TEXT,

  -- Booth monitor (reproduktory pri DJ)
  needs_booth_monitor BOOLEAN NOT NULL DEFAULT false,

  -- Mikrofón (svadby / moderovanie)
  microphone_need TEXT
    CHECK (microphone_need IS NULL OR microphone_need IN (
      'none', 'dj_brings', 'venue_wired', 'venue_wireless'
    )),
  microphone_notes TEXT,

  -- Svetlá
  lights_setup TEXT
    CHECK (lights_setup IS NULL OR lights_setup IN (
      'dj_brings', 'venue_has', 'both', 'none'
    )),
  lights_notes TEXT,

  -- Vonku
  needs_weather_cover BOOLEAN NOT NULL DEFAULT false,

  -- Parkovanie / vykládka
  needs_parking BOOLEAN NOT NULL DEFAULT false,
  load_in_notes TEXT,

  other_notes TEXT,
  visible_to_client BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_dj_requirements_booking_id_idx
  ON public.booking_dj_requirements (booking_id);

ALTER TABLE public.booking_dj_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking parties view dj requirements" ON public.booking_dj_requirements;
CREATE POLICY "Booking parties view dj requirements"
  ON public.booking_dj_requirements
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

DROP POLICY IF EXISTS "DJs manage dj requirements" ON public.booking_dj_requirements;
CREATE POLICY "DJs manage dj requirements"
  ON public.booking_dj_requirements
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
