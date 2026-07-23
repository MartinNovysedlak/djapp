import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getPublicSiteUrl } from "@/lib/site-url";
import { getStripe } from "@/lib/stripe/config";
import { ensureStripeCustomer } from "@/lib/stripe/sync";

export const runtime = "nodejs";

/**
 * POST /api/stripe/portal
 * Opens Stripe Customer Portal for managing / canceling Premium.
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
      .select("id, role, full_name, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "dj") {
      return NextResponse.json(
        { error: "Portál je len pre DJ / kapely." },
        { status: 403 }
      );
    }

    const customerId = await ensureStripeCustomer({
      userId: user.id,
      email: user.email,
      existingCustomerId: profile.stripe_customer_id,
      displayName: profile.full_name,
    });

    const stripe = getStripe();
    const site = getPublicSiteUrl();

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${site}/dashboard/profile`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error("[stripe/portal]", err);
    const message =
      err instanceof Error ? err.message : "Neznáma chyba pri portáli.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
