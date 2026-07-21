-- =============================================
-- Booking chat messages (DJ ↔ client)
-- Realtime + private chat-attachments bucket
-- =============================================

CREATE TABLE IF NOT EXISTS public.booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT,
  attachment_path TEXT,
  attachment_mime TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  CONSTRAINT booking_messages_body_or_attachment CHECK (
    (
      body IS NOT NULL
      AND length(trim(body)) > 0
      AND char_length(body) <= 4000
    )
    OR attachment_path IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS booking_messages_booking_created_idx
  ON public.booking_messages (booking_id, created_at ASC);

CREATE INDEX IF NOT EXISTS booking_messages_unread_idx
  ON public.booking_messages (booking_id, read_at)
  WHERE read_at IS NULL;

ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_booking_chat_party(p_booking_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = p_booking_id
      AND b.status IN ('pending', 'accepted')
      AND (b.dj_id = auth.uid() OR b.client_id = auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.is_booking_chat_party(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_booking_chat_party(UUID) TO authenticated;

DROP POLICY IF EXISTS "Booking parties view messages" ON public.booking_messages;
CREATE POLICY "Booking parties view messages"
  ON public.booking_messages
  FOR SELECT
  USING (public.is_booking_chat_party(booking_id));

DROP POLICY IF EXISTS "Booking parties send messages" ON public.booking_messages;
CREATE POLICY "Booking parties send messages"
  ON public.booking_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_booking_chat_party(booking_id)
  );

DROP POLICY IF EXISTS "Recipient marks messages read" ON public.booking_messages;
CREATE POLICY "Recipient marks messages read"
  ON public.booking_messages
  FOR UPDATE
  USING (
    sender_id <> auth.uid()
    AND public.is_booking_chat_party(booking_id)
  )
  WITH CHECK (
    sender_id <> auth.uid()
    AND public.is_booking_chat_party(booking_id)
  );

-- Storage: private chat attachments (path: {booking_id}/{user_id}/{file})
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Chat parties read attachments" ON storage.objects;
CREATE POLICY "Chat parties read attachments"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'chat-attachments'
    AND public.is_booking_chat_party((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "Chat parties upload attachments" ON storage.objects;
CREATE POLICY "Chat parties upload attachments"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[2]
    AND public.is_booking_chat_party((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "Chat parties delete own attachments" ON storage.objects;
CREATE POLICY "Chat parties delete own attachments"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[2]
    AND public.is_booking_chat_party((storage.foldername(name))[1]::uuid)
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
