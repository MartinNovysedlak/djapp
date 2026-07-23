import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getPublicSiteUrl } from "@/lib/site-url";
import {
  getStripe,
  getStripePriceId,
} from "@/lib/stripe/config";
import { ensureStripeCustomer } from "@/lib/stripe/sync";
import { isPaidPremiumActive } from "@/lib/plans";

export const runtime = "nodejs";

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for Premium monthly subscription.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { error: "Musíš byť prihlásený." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "id, role, full_name, plan_type, premium_until, stripe_customer_id, stripe_subscription_id, stripe_subscription_status"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "dj") {
      return NextResponse.json(
        { error: "Premium predplatné je len pre DJ / kapely." },
        { status: 403 }
      );
    }

    if (isPaidPremiumActive(profile) && profile.stripe_subscription_id) {
      return NextResponse.json(
        {
          error:
            "Už máš aktívne Premium. Spravuj ho cez Zákaznícky portál.",
          code: "already_subscribed",
        },
        { status: 409 }
      );
    }

    const stripe = getStripe();
    const priceId = getStripePriceId();
    const site = getPublicSiteUrl();

    const customerId = await ensureStripeCustomer({
      userId: user.id,
      email: user.email,
      existingCustomerId: profile.stripe_customer_id,
      displayName: profile.full_name,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${site}/dashboard/profile?billing=success`,
      cancel_url: `${site}/dashboard/profile?billing=cancel`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: {
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout sa nepodarilo vytvoriť." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    const message =
      err instanceof Error ? err.message : "Neznáma chyba pri Checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
