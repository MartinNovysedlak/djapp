"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";
import {
  GOOGLE_MAPS_URL_ERROR,
  isValidGoogleMapsUrl,
  normalizeGoogleMapsUrl,
} from "@/lib/google-maps";

export type UpdateDjProfileInput = {
  fullName: string;
  realFirstName?: string;
  realLastName?: string;
  phone?: string;
  showRealName: boolean;
  artistKind?: "dj" | "band" | "dj_band";
  bio: string;
  location: string | null;
  googleMapsUrl?: string;
  socialLinks: Record<string, string> | null;
  galleryUrls: string[];
  videoUrls: string[];
};

export type UpdateDjProfileResult = {
  ok: boolean;
  error?: string;
  googleMapsUrl?: string | null;
};

/**
 * Persists DJ profile fields with server-side validation for Google Maps URLs.
 * Public slug is intentionally not writable here — it stays fixed for sharing.
 */
export async function updateDjProfile(
  input: UpdateDjProfileInput
): Promise<UpdateDjProfileResult> {
  const googleMapsUrl = normalizeGoogleMapsUrl(input.googleMapsUrl);

  if (!isValidGoogleMapsUrl(googleMapsUrl)) {
    return { ok: false, error: GOOGLE_MAPS_URL_ERROR };
  }

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profile?.role === "client") {
      return { ok: false, error: "Len účty umelcov môžu upravovať tento profil." };
    }

    const artistKind =
      input.artistKind === "band" || input.artistKind === "dj_band"
        ? input.artistKind
        : "dj";

    const { error } = await supabase.from("profiles").upsert({
      id: authData.user.id,
      full_name: input.fullName,
      real_first_name: input.realFirstName?.trim() || null,
      real_last_name: input.realLastName?.trim() || null,
      phone: input.phone?.trim() || null,
      show_real_name: input.showRealName,
      artist_kind: artistKind,
      bio: input.bio,
      location: input.location,
      google_maps_url: googleMapsUrl || null,
      social_links: input.socialLinks,
      gallery_urls: input.galleryUrls,
      video_urls: input.videoUrls,
    });

    if (error) {
      console.error("[updateDjProfile]", error);
      return { ok: false, error: error.message };
    }

    return { ok: true, googleMapsUrl: googleMapsUrl || null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznáma chyba.";
    console.error("[updateDjProfile]", err);
    return { ok: false, error: message };
  }
}
