-- =============================================
-- DJ App - Generated contracts history + client inbox
-- Depends on: public.profiles, public.bookings, public.contract_templates
-- =============================================

CREATE TABLE IF NOT EXISTS public.generated_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_name TEXT,
  template_name TEXT,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  sent_to_client_at TIMESTAMPTZ,
  client_seen_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'complete'
    CHECK (status IN ('complete', 'pending_fill', 'filled')),
  dj_manual_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generated_contracts_dj_created_idx
  ON public.generated_contracts (dj_id, created_at DESC);

CREATE INDEX IF NOT EXISTS generated_contracts_client_sent_idx
  ON public.generated_contracts (client_id, sent_to_client_at DESC)
  WHERE sent_to_client_at IS NOT NULL;

ALTER TABLE public.generated_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DJs manage own generated contracts" ON public.generated_contracts;
CREATE POLICY "DJs manage own generated contracts"
  ON public.generated_contracts
  FOR ALL
  USING (auth.uid() = dj_id)
  WITH CHECK (auth.uid() = dj_id);

DROP POLICY IF EXISTS "Clients view sent contracts" ON public.generated_contracts;
CREATE POLICY "Clients view sent contracts"
  ON public.generated_contracts
  FOR SELECT
  USING (
    auth.uid() = client_id
    AND sent_to_client_at IS NOT NULL
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-pdfs',
  'contract-pdfs',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
