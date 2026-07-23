-- Stripe subscription fields on profiles (synced via webhook only)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_uidx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_subscription_id_uidx
  ON public.profiles (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe Customer id (cus_…)';
COMMENT ON COLUMN public.profiles.stripe_subscription_id IS 'Stripe Subscription id (sub_…)';
COMMENT ON COLUMN public.profiles.stripe_subscription_status IS 'Stripe subscription status: active, trialing, past_due, canceled, …';
