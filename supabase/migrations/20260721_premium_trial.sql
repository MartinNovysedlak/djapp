-- Free / Premium + 14-day trial for DJ signups
-- Apply in Supabase SQL editor or via MCP if not already applied.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

UPDATE public.profiles
SET plan_type = 'premium'
WHERE plan_type = 'pro';

UPDATE public.profiles
SET trial_ends_at = NOW() + INTERVAL '14 days'
WHERE role = 'dj'
  AND plan_type = 'free'
  AND trial_ends_at IS NULL
  AND (premium_until IS NULL OR premium_until < NOW());

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

  INSERT INTO public.profiles (
    id, full_name, public_slug, role,
    real_first_name, real_last_name, phone, show_real_name,
    artist_kind, plan_type, trial_ends_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''),
    public.allocate_unique_public_slug(
      public.slugify_artist_name(COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''))
    ),
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
