-- Public slug from artist/band display name: /djs/{slug}, duplicates → slug1, slug2, …

CREATE OR REPLACE FUNCTION public.slugify_artist_name(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $function$
DECLARE
  s text;
BEGIN
  s := lower(trim(coalesce(raw, '')));
  s := translate(
    s,
    'áäčďéěíľĺňóôöŕšťúüýžàâãåæçèêëìîïðñòõøùûũūýÿþÁÄČĎÉĚÍĽĹŇÓÔÖŔŠŤÚÜÝŽÀÂÃÅÆÇÈÊËÌÎÏÐÑÒÕØÙÛŨŪÝŸÞ',
    'aacdeeillnooorstuuyzaaaaaaceeeeiiiidnoooouuuuyytAACDEEILLNOOORSTUUYZAAAAAACEEEEIIIIDNOOOOUUUUYYT'
  );
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  s := left(s, 60);
  s := regexp_replace(s, '-+$', '', 'g');
  IF s IS NULL OR s = '' THEN
    RETURN 'umelec';
  END IF;
  RETURN s;
END;
$function$;

CREATE OR REPLACE FUNCTION public.allocate_unique_public_slug(base_slug text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  candidate text;
  n int := 0;
BEGIN
  candidate := coalesce(nullif(trim(base_slug), ''), 'umelec');
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.public_slug = candidate
    ) THEN
      RETURN candidate;
    END IF;
    n := n + 1;
    candidate := base_slug || n::text;
    IF n > 10000 THEN
      RETURN base_slug || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    END IF;
  END LOOP;
END;
$function$;

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
BEGIN
  kind := COALESCE(NEW.raw_user_meta_data ->> 'artist_kind', 'dj');
  IF kind NOT IN ('dj', 'band', 'dj_band') THEN
    kind := 'dj';
  END IF;

  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'dj');
  IF user_role = 'dj' THEN
    trial_end := NOW() + INTERVAL '14 days';
  ELSE
    trial_end := NULL;
  END IF;

  base_slug := public.slugify_artist_name(
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', '')
  );
  unique_slug := public.allocate_unique_public_slug(base_slug);

  INSERT INTO public.profiles (
    id, full_name, public_slug, role,
    real_first_name, real_last_name, phone, show_real_name,
    artist_kind, plan_type, trial_ends_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''),
    unique_slug,
    user_role,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE((NEW.raw_user_meta_data ->> 'show_real_name')::boolean, false),
    kind,
    'free',
    trial_end
  );
  RETURN NEW;
END;
$function$;
