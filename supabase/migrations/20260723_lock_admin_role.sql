-- CRITICAL: Prevent privilege escalation to admin via signup metadata or self-update.

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

  -- NEVER trust client metadata for admin. Only dj | client.
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'dj');
  IF user_role NOT IN ('dj', 'client') THEN
    user_role := 'dj';
  END IF;

  IF user_role = 'dj' THEN
    trial_end := NOW() + INTERVAL '14 days';
  ELSE
    trial_end := NULL;
  END IF;

  base_slug := public.slugify_artist_name(
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    )
  );
  unique_slug := public.allocate_unique_public_slug(base_slug);

  INSERT INTO public.profiles (
    id, full_name, public_slug, role,
    real_first_name, real_last_name, phone, show_real_name,
    artist_kind, plan_type, trial_ends_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      ''
    ),
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

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    -- Service role / SQL console may change roles intentionally.
    IF coalesce(auth.jwt() ->> 'role', '') = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF current_user IN ('postgres', 'supabase_admin') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Changing profiles.role is not allowed';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_escalation();
