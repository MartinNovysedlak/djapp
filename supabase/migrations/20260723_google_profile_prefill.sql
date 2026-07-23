-- Prefill Google OAuth fields on signup (name, avatar). Role still only dj|client.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  kind TEXT;
  user_role TEXT;
  trial_end TIMESTAMPTZ;
  base_slug TEXT;
  unique_slug TEXT;
  display TEXT;
  avatar TEXT;
  first_name TEXT;
  last_name TEXT;
BEGIN
  kind := COALESCE(NEW.raw_user_meta_data ->> 'artist_kind', 'dj');
  IF kind NOT IN ('dj', 'band', 'dj_band') THEN
    kind := 'dj';
  END IF;

  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'dj');
  IF user_role NOT IN ('dj', 'client') THEN
    user_role := 'dj';
  END IF;

  IF user_role = 'dj' THEN
    trial_end := NOW() + INTERVAL '14 days';
  ELSE
    trial_end := NULL;
  END IF;

  display := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
    ''
  );

  avatar := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'picture', '')
  );

  first_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'first_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'given_name', ''),
    NULLIF(split_part(display, ' ', 1), '')
  );

  last_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'last_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'family_name', ''),
    NULLIF(
      NULLIF(trim(substring(display from length(split_part(display, ' ', 1)) + 1)), ''),
      NULL
    )
  );

  base_slug := public.slugify_artist_name(display);
  unique_slug := public.allocate_unique_public_slug(base_slug);

  INSERT INTO public.profiles (
    id, full_name, public_slug, role,
    real_first_name, real_last_name, phone, show_real_name,
    artist_kind, plan_type, trial_ends_at, avatar_url
  )
  VALUES (
    NEW.id,
    display,
    unique_slug,
    user_role,
    NULLIF(first_name, ''),
    NULLIF(last_name, ''),
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE((NEW.raw_user_meta_data ->> 'show_real_name')::boolean, false),
    kind,
    'free',
    trial_end,
    avatar
  );
  RETURN NEW;
END;
$function$;
