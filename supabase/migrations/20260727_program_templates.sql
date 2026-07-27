-- Program / setlist templates for DJs (reusable wedding / corporate flows)

CREATE TABLE IF NOT EXISTS public.program_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS program_templates_dj_id_idx
  ON public.program_templates (dj_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.program_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.program_templates(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  item_type TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  notes TEXT,
  duration_minutes INTEGER,
  default_offset_minutes INTEGER,
  start_mode TEXT,
  start_detail TEXT,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  song_title TEXT,
  song_artist TEXT,
  tech_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT program_template_items_duration_chk
    CHECK (duration_minutes IS NULL OR (duration_minutes >= 1 AND duration_minutes <= 1440)),
  CONSTRAINT program_template_items_offset_chk
    CHECK (default_offset_minutes IS NULL OR (default_offset_minutes >= 0 AND default_offset_minutes <= 1440 * 3))
);

CREATE INDEX IF NOT EXISTS program_template_items_template_id_idx
  ON public.program_template_items (template_id, sort_order);

ALTER TABLE public.program_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_template_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DJs manage own program templates" ON public.program_templates;
CREATE POLICY "DJs manage own program templates"
  ON public.program_templates
  FOR ALL
  USING (dj_id = auth.uid())
  WITH CHECK (dj_id = auth.uid());

DROP POLICY IF EXISTS "DJs manage own program template items" ON public.program_template_items;
CREATE POLICY "DJs manage own program template items"
  ON public.program_template_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.program_templates t
      WHERE t.id = template_id AND t.dj_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.program_templates t
      WHERE t.id = template_id AND t.dj_id = auth.uid()
    )
  );
