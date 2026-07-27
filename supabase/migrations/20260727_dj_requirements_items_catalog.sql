-- Checklist-style DJ requirements: sound + selectable items with optional notes

ALTER TABLE public.booking_dj_requirements
  DROP COLUMN IF EXISTS booth_table_notes,
  DROP COLUMN IF EXISTS power_sockets_min,
  DROP COLUMN IF EXISTS power_dedicated_circuit,
  DROP COLUMN IF EXISTS power_notes,
  DROP COLUMN IF EXISTS needs_booth_monitor,
  DROP COLUMN IF EXISTS microphone_need,
  DROP COLUMN IF EXISTS microphone_notes,
  DROP COLUMN IF EXISTS lights_setup,
  DROP COLUMN IF EXISTS lights_notes,
  DROP COLUMN IF EXISTS needs_weather_cover,
  DROP COLUMN IF EXISTS needs_parking,
  DROP COLUMN IF EXISTS load_in_notes,
  DROP COLUMN IF EXISTS other_notes;

ALTER TABLE public.booking_dj_requirements
  ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.booking_dj_requirements
  DROP CONSTRAINT IF EXISTS booking_dj_requirements_items_is_array;

ALTER TABLE public.booking_dj_requirements
  ADD CONSTRAINT booking_dj_requirements_items_is_array
  CHECK (jsonb_typeof(items) = 'array');
