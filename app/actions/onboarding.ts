"use server";

import { createClient } from "@/utils/supabase/server";
import { createBillingAdminClient } from "@/lib/stripe/config";
import { slugifyArtistName } from "@/lib/public-slug";
import {
  isProfileOnboardingComplete,
  type OnboardingGap,
} from "@/lib/profile-completeness";

export type CompleteOnboardingInput = {
  fullName?: string;
  realFirstName: string;
  realLastName: string;
  phone: string;
  location?: string | null;
  artistKind?: "dj" | "band" | "dj_band";
};

export async function completeOnboarding(
  input: CompleteOnboardingInput
): Promise<{ ok: true } | { ok: false; error: string; gaps?: OnboardingGap[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Musíš byť prihlásený." };

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, role, full_name, real_first_name, real_last_name, phone, artist_kind, public_slug, avatar_url, location"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { ok: false, error: "Profil sa nenašiel." };
  if (profile.role === "admin") {
    return { ok: false, error: "Admin účet nepotrebuje onboarding." };
  }

  const first = input.realFirstName.trim();
  const last = input.realLastName.trim();
  const phone = input.phone.trim();
  if (!first || !last) {
    return { ok: false, error: "Vyplň krstné meno a priezvisko." };
  }
  if (!phone) {
    return { ok: false, error: "Vyplň telefónne číslo." };
  }

  const isClient = profile.role === "client";
  const artistKind =
    input.artistKind === "band" || input.artistKind === "dj_band"
      ? input.artistKind
      : "dj";

  let fullName = (input.fullName ?? profile.full_name ?? "").trim();
  if (isClient) {
    fullName = `${first} ${last}`.trim();
  } else if (!fullName) {
    return {
      ok: false,
      error:
        artistKind === "band"
          ? "Zadaj názov kapely."
          : "Zadaj umelecké meno.",
    };
  }

  const location = (input.location ?? "").trim();
  if (!isClient && !location) {
    return {
      ok: false,
      error: "Vyber miesto pôsobenia — bez neho ťa klienti v katalógu nenájdu.",
    };
  }

  const patch: Record<string, string | boolean | null> = {
    full_name: fullName,
    real_first_name: first,
    real_last_name: last,
    phone,
  };
  if (!isClient) {
    patch.artist_kind = artistKind;
    patch.location = location;
  }

  // Refresh placeholder slug (umelec / empty) from the new display name.
  const slug = profile.public_slug?.trim() || "";
  if (!slug || slug === "umelec" || /^umelec\d*$/i.test(slug)) {
    try {
      const admin = createBillingAdminClient();
      const base = slugifyArtistName(fullName);
      const { data: allocated } = await admin.rpc("allocate_unique_public_slug", {
        base_slug: base,
      });
      if (typeof allocated === "string" && allocated) {
        patch.public_slug = allocated;
      }
    } catch (err) {
      console.error("[completeOnboarding] slug", err);
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data: refreshed } = await supabase
    .from("profiles")
    .select(
      "role, full_name, real_first_name, real_last_name, phone, artist_kind, location"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!isProfileOnboardingComplete(refreshed)) {
    return {
      ok: false,
      error: "Ešte chýbajú povinné údaje.",
      gaps: undefined,
    };
  }

  return { ok: true };
}
