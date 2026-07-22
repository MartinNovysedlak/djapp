-- Sync handle_new_user so signup metadata (first/last/phone/show_real_name/artist_kind) lands on profiles.
-- Applied remotely via Supabase MCP; kept here for local documentation.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS artist_kind TEXT NOT NULL DEFAULT 'dj';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  kind TEXT;
BEGIN
  kind := COALESCE(NEW.raw_user_meta_data ->> 'artist_kind', 'dj');
  IF kind NOT IN ('dj', 'band', 'dj_band') THEN
    kind := 'dj';
  END IF;

  INSERT INTO public.profiles (
    id, full_name, public_slug, role,
    real_first_name, real_last_name, phone, show_real_name,
    artist_kind
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''),
    public.allocate_unique_public_slug(
      public.slugify_artist_name(COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''))
    ),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'dj'),
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE((NEW.raw_user_meta_data ->> 'show_real_name')::boolean, false),
    kind
  );
  RETURN NEW;
END;
$$;
