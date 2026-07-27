import { createClient as createServiceClient } from "@supabase/supabase-js";
import { BRAND } from "@/lib/brand";

export type GuestSharePublic = {
  slug: string;
  bookingId: string;
  eventType: string | null;
  eventDate: string | null;
  djName: string | null;
};

/** Guest-facing collaboration URL — always production domain (QR must work on phones). */
export function guestShareUrl(slug: string) {
  return `${BRAND.url.replace(/\/$/, "")}/akcia/${slug}`;
}

export function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function normalizeText(value: string | undefined | null, max: number) {
  return (value ?? "").trim().slice(0, max);
}

/**
 * Resolve an accepted booking for guest share token.
 * Always requires bookingId + token match (never trust bookingId alone).
 */
export async function resolveGuestShareBooking(
  bookingId: string,
  shareToken: string
): Promise<
  | { ok: true; bookingId: string; admin: ReturnType<typeof adminClient> }
  | { ok: false; error: string }
> {
  const clean = normalizeText(shareToken, 32).toLowerCase();
  if (!bookingId || !clean) {
    return { ok: false, error: "Neplatný odkaz." };
  }

  const admin = adminClient();
  const { data: booking, error } = await admin
    .from("bookings")
    .select("id, status, guest_share_slug")
    .eq("id", bookingId)
    .eq("guest_share_slug", clean)
    .maybeSingle();

  if (error || !booking) {
    return { ok: false, error: "Tento odkaz nie je platný." };
  }
  if (booking.status !== "accepted") {
    return {
      ok: false,
      error: "Spolupráca pre túto akciu nie je aktívna.",
    };
  }

  return { ok: true, bookingId: booking.id, admin };
}
