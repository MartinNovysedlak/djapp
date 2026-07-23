import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getStripe,
  getStripeWebhookSecret,
} from "@/lib/stripe/config";
import {
  clearSubscriptionFromProfile,
  syncSubscriptionToProfile,
} from "@/lib/stripe/sync";

export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook
 * Verifies Stripe signature and syncs subscription state → profiles.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret()
    );
  } catch (err) {
    console.error("[stripe/webhook] signature", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const stripe = getStripe();
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subId);
          // Prefer client_reference_id / metadata on session if sub metadata empty
          if (
            !subscription.metadata?.supabase_user_id &&
            (session.client_reference_id || session.metadata?.supabase_user_id)
          ) {
            await stripe.subscriptions.update(subId, {
              metadata: {
                ...subscription.metadata,
                supabase_user_id:
                  session.client_reference_id ||
                  session.metadata?.supabase_user_id ||
                  "",
              },
            });
            const refreshed = await stripe.subscriptions.retrieve(subId);
            await syncSubscriptionToProfile(refreshed);
          } else {
            await syncSubscriptionToProfile(subscription);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionToProfile(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await clearSubscriptionFromProfile(subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler", event.type, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
