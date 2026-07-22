-- Private permanent residence for verification only (not public)
CREATE TABLE IF NOT EXISTS public.dj_verification_private (
  dj_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  permanent_address TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dj_verification_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DJs manage own verification private" ON public.dj_verification_private;
CREATE POLICY "DJs manage own verification private"
  ON public.dj_verification_private
  FOR ALL
  USING (dj_id = auth.uid())
  WITH CHECK (dj_id = auth.uid());

DROP POLICY IF EXISTS "Admins read verification private" ON public.dj_verification_private;
CREATE POLICY "Admins read verification private"
  ON public.dj_verification_private
  FOR SELECT
  USING (public.is_admin());

COMMENT ON TABLE public.dj_verification_private IS
  'Private verification-only fields (permanent address). Never join into public catalog queries.';
