-- =============================================
-- DJ App - Bookings (Rezervácie) Setup Script
-- Run this in Supabase SQL Editor
-- Depends on: public.profiles (see supabase-setup.sql)
-- =============================================

-- 1. Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL,
  event_location TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upgrade path for databases created before these columns existed.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS event_location TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- Speed up "how many requests does this DJ have" lookups
CREATE INDEX IF NOT EXISTS bookings_dj_id_created_at_idx
  ON public.bookings (dj_id, created_at DESC);

-- 2. Enable Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Anyone (including anonymous visitors on a public DJ profile) can submit
-- a non-binding booking request.
CREATE POLICY "Anyone can create a booking request"
  ON public.bookings
  FOR INSERT
  WITH CHECK (true);

-- A DJ can only see the booking requests addressed to them.
CREATE POLICY "DJs can view their own booking requests"
  ON public.bookings
  FOR SELECT
  USING (auth.uid() = dj_id);

-- A DJ can remove their own booking requests.
CREATE POLICY "DJs can delete their own booking requests"
  ON public.bookings
  FOR DELETE
  USING (auth.uid() = dj_id);
