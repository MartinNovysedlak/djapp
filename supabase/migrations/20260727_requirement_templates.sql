-- Fold sound into items JSON; add reusable requirement templates for DJs

UPDATE public.booking_dj_requirements
SET items = (
  CASE
    WHEN sound_provided_by IS NOT NULL THEN
      jsonb_build_array(
        jsonb_strip_nulls(
          jsonb_build_object(
            'id', 'sound',
            'choice', sound_provided_by,
            'note', sound_notes
          )
        )
      ) || COALESCE(items, '[]'::jsonb)
    ELSE COALESCE(items, '[]'::jsonb)
  END
)
WHERE sound_provided_by IS NOT NULL
   OR sound_notes IS NOT NULL;

ALTER TABLE public.booking_dj_requirements
  DROP COLUMN IF EXISTS sound_provided_by,
  DROP COLUMN IF EXISTS sound_notes;

CREATE TABLE IF NOT EXISTS public.requirement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT requirement_templates_items_is_array
    CHECK (jsonb_typeof(items) = 'array')
);

CREATE INDEX IF NOT EXISTS requirement_templates_dj_id_idx
  ON public.requirement_templates (dj_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS requirement_templates_one_default_per_dj
  ON public.requirement_templates (dj_id)
  WHERE is_default = true;

ALTER TABLE public.requirement_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DJs manage own requirement templates" ON public.requirement_templates;
CREATE POLICY "DJs manage own requirement templates"
  ON public.requirement_templates
  FOR ALL
  USING (dj_id = auth.uid())
  WITH CHECK (dj_id = auth.uid());
