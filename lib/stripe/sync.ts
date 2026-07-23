import type Stripe from "stripe";
import {
  createBillingAdminClient,
  STRIPE_ACTIVE_STATUSES,
} from "@/lib/stripe/config";
import { PLAN_FREE, PLAN_PREMIUM } from "@/lib/plans";

function periodEndIso(subscription: Stripe.Subscription): string | null {
  const ends = (subscription.items?.data ?? [])
    .map((item) => item.current_period_end)
    .filter((n): n is number => typeof n === "number" && n > 0);
  if (ends.length === 0) {
    if (typeof subscription.cancel_at === "number" && subscription.cancel_at > 0) {
      return new Date(subscription.cancel_at * 1000).toISOString();
    }
    return null;
  }
  return new Date(Math.max(...ends) * 1000).toISOString();
}

function resolveUserId(subscription: Stripe.Subscription): string | null {
  const fromMeta = subscription.metadata?.supabase_user_id?.trim();
  if (fromMeta) return fromMeta;
  return null;
}

/**
 * Upsert Premium state from a Stripe Subscription.
 * Webhook-only — never trust the client for plan changes.
 */
export async function syncSubscriptionToProfile(
  subscription: Stripe.Subscription
): Promise<void> {
  const admin = createBillingAdminClient();
  const status = subscription.status;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const premiumUntil = periodEndIso(subscription);
  const isActive = STRIPE_ACTIVE_STATUSES.has(status);
  const userIdFromMeta = resolveUserId(subscription);

  let profileId = userIdFromMeta;

  if (!profileId) {
    const { data: byCustomer } = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    profileId = byCustomer?.id ?? null;
  }

  if (!profileId) {
    const { data: bySub } = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();
    profileId = bySub?.id ?? null;
  }

  if (!profileId) {
    console.error(
      "[stripe:sync] No profile for subscription",
      subscription.id,
      customerId
    );
    return;
  }

  const patch: Record<string, string | null> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: status,
    plan_type: isActive ? PLAN_PREMIUM : PLAN_FREE,
    premium_until: isActive ? premiumUntil : new Date().toISOString(),
  };

  const { error } = await admin.from("profiles").update(patch).eq("id", profileId);
  if (error) {
    console.error("[stripe:sync] profile update failed", error.message);
    throw error;
  }
}

/** Mark subscription ended (deleted / fully canceled). */
export async function clearSubscriptionFromProfile(
  subscription: Stripe.Subscription
): Promise<void> {
  const admin = createBillingAdminClient();
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const userId = resolveUserId(subscription);

  let query = admin.from("profiles").update({
    stripe_subscription_id: null,
    stripe_subscription_status: "canceled",
    plan_type: PLAN_FREE,
    premium_until: new Date().toISOString(),
    stripe_customer_id: customerId,
  });

  if (userId) {
    query = query.eq("id", userId);
  } else {
    query = query.eq("stripe_subscription_id", subscription.id);
  }

  const { error } = await query;
  if (error) {
    console.error("[stripe:clear] profile update failed", error.message);
    throw error;
  }
}

export async function ensureStripeCustomer(params: {
  userId: string;
  email: string;
  existingCustomerId?: string | null;
  displayName?: string | null;
}): Promise<string> {
  const { getStripe } = await import("@/lib/stripe/config");
  const stripe = getStripe();
  const admin = createBillingAdminClient();

  if (params.existingCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(params.existingCustomerId);
      if (!existing.deleted) return params.existingCustomerId;
    } catch {
      // recreate below
    }
  }

  const customer = await stripe.customers.create({
    email: params.email,
    name: params.displayName?.trim() || undefined,
    metadata: { supabase_user_id: params.userId },
  });

  const { error } = await admin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", params.userId);

  if (error) {
    console.error("[stripe:customer] failed to save customer id", error.message);
  }

  return customer.id;
}
