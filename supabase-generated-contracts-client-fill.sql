-- Client-fill workflow for contracts/invoices
-- Applied remotely via Supabase MCP; kept here for local documentation.

ALTER TABLE public.generated_contracts
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'complete',
  ADD COLUMN IF NOT EXISTS dj_manual_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS client_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS filled_at TIMESTAMPTZ;

UPDATE public.generated_contracts
SET status = 'complete'
WHERE status IS NULL OR status = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'generated_contracts_status_check'
  ) THEN
    ALTER TABLE public.generated_contracts
      ADD CONSTRAINT generated_contracts_status_check
      CHECK (status IN ('complete', 'pending_fill', 'filled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS generated_contracts_status_idx
  ON public.generated_contracts (status);
