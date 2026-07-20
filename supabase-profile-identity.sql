-- Sync handle_new_user so signup metadata (first/last/phone/show_real_name) lands on profiles.
-- Applied remotely via Supabase MCP; kept here for local documentation.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, public_slug, role,
    real_first_name, real_last_name, phone, show_real_name
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''),
    'dj-' || substr(md5(NEW.id::text), 1, 8),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'dj'),
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE((NEW.raw_user_meta_data ->> 'show_real_name')::boolean, false)
  );
  RETURN NEW;
END;
$$;
