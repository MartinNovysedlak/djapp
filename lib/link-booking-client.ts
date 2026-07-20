import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolveClientLinkResult =
  | { ok: true; clientId: string; linked: boolean }
  | { ok: false; error: string };

/**
 * Ensures a booking has `client_id` when the client has an auth account
 * matching `client_email`. Updates the booking row when linking succeeds.
 */
export async function resolveAndLinkBookingClient(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  booking: {
    id: string;
    client_id: string | null;
    client_email: string | null;
  }
): Promise<ResolveClientLinkResult> {
  if (booking.client_id) {
    return { ok: true, clientId: booking.client_id, linked: false };
  }

  const email = booking.client_email?.trim() || "";
  if (!email) {
    return {
      ok: false,
      error:
        "Rezervácia nemá e-mail zákazníka ani prepojený účet — dokument nie je kam poslať.",
    };
  }

  const { data: foundId, error: rpcError } = await supabase.rpc(
    "find_auth_user_id_by_email",
    { p_email: email }
  );

  if (rpcError) {
    console.error("[resolveAndLinkBookingClient:rpc]", rpcError);
    return {
      ok: false,
      error: "Nepodarilo sa overiť klientsky účet podľa e-mailu.",
    };
  }

  if (!foundId || typeof foundId !== "string") {
    return {
      ok: false,
      error:
        "Zákazník s týmto e-mailom ešte nemá účet. Po registrácii mu dokument uvidí v Dokumentoch — alebo mu pošli e-mail s výzvou na registráciu.",
    };
  }

  const clientId = foundId as string;

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ client_id: clientId })
    .eq("id", booking.id)
    .is("client_id", null);

  if (updateError) {
    console.error("[resolveAndLinkBookingClient:update]", updateError);
    // Still return the id — invoice/contract can use it even if booking update failed.
  }

  return { ok: true, clientId, linked: true };
}
