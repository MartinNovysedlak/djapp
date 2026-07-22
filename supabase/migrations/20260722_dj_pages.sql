-- DJ custom landing pages (page builder)
CREATE TABLE IF NOT EXISTS public.dj_pages (
  dj_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status = ANY (ARRAY['draft'::text, 'published'::text])),
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_blocks JSONB,
  published_theme JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS dj_pages_status_idx ON public.dj_pages (status);

ALTER TABLE public.dj_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DJs manage own page" ON public.dj_pages;
CREATE POLICY "DJs manage own page"
  ON public.dj_pages FOR ALL
  USING (dj_id = auth.uid())
  WITH CHECK (dj_id = auth.uid());

DROP POLICY IF EXISTS "Public can read published pages" ON public.dj_pages;
CREATE POLICY "Public can read published pages"
  ON public.dj_pages FOR SELECT
  USING (status = 'published' OR dj_id = auth.uid() OR public.is_admin());
