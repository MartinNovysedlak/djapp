import Stripe from "stripe";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  return new Stripe(key, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });
}

export function getStripePriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY?.trim();
  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID_PREMIUM_MONTHLY is not configured.");
  }
  return priceId;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }
  return secret;
}

/** Service-role client for webhook / billing writes (bypasses RLS). */
export function createBillingAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role is not configured.");
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const STRIPE_ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);
