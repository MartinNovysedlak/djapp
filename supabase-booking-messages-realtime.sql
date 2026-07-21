-- Ensure Realtime delivers INSERT/UPDATE to both chat parties
ALTER TABLE public.booking_messages REPLICA IDENTITY FULL;
