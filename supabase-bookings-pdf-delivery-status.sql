-- Manual PDF / contract delivery status on bookings (when no generated PDF exists).
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pdf_delivery_status TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_pdf_delivery_status_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_pdf_delivery_status_check
      CHECK (
        pdf_delivery_status IS NULL
        OR pdf_delivery_status IN (
          'none',
          'manual_sent',
          'email_sent',
          'confirmed_in_person',
          'printed_handed',
          'other'
        )
      );
  END IF;
END $$;
