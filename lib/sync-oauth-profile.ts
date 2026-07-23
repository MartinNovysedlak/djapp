import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  pickGoogleAvatarUrl,
  pickGoogleDisplayName,
  splitPersonName,
} from "@/lib/profile-completeness";
import type { OAuthSignupIntent } from "@/lib/oauth-intent";

type ProfileRow = {
  id: string;
  role: string;
  full_name: string | null;
  real_first_name: string | null;
  real_last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  artist_kind: string | null;
  public_slug: string | null;
  location: string | null;
};

const PROFILE_SELECT =
  "id, role, full_name, real_first_name, real_last_name, phone, avatar_url, artist_kind, public_slug, location";

/**
 * Prefill empty profile fields from Google / OAuth / signup user_metadata.
 * Never elevates role to admin. Applies signup intent (dj|client) when safe.
 */
export async function syncOAuthProfileFromUser(
  supabase: SupabaseClient,
  user: User,
  intent: OAuthSignupIntent | null
): Promise<ProfileRow | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName = pickGoogleDisplayName(meta);
  const avatarUrl = pickGoogleAvatarUrl(meta);
  const given =
    typeof meta.given_name === "string" ? meta.given_name.trim() : "";
  const family =
    typeof meta.family_name === "string" ? meta.family_name.trim() : "";
  const metaPhone =
    typeof meta.phone === "string" ? meta.phone.trim() : "";
  const metaLocation =
    typeof meta.location === "string" ? meta.location.trim() : "";
  const split = splitPersonName(displayName);

  const patch: Record<string, string | null> = {};

  if (!profile.full_name?.trim() && displayName) {
    patch.full_name = displayName;
  }
  if (!profile.real_first_name?.trim()) {
    const first = given || split.firstName;
    if (first) patch.real_first_name = first;
  }
  if (!profile.real_last_name?.trim()) {
    const last = family || split.lastName;
    if (last) patch.real_last_name = last;
  }
  if (!profile.avatar_url?.trim() && avatarUrl) {
    patch.avatar_url = avatarUrl;
  }
  if (!profile.phone?.trim() && metaPhone) {
    patch.phone = metaPhone;
  }
  if (!profile.location?.trim() && metaLocation) {
    patch.location = metaLocation;
  }

  // Apply role/artist from register intent only when not admin.
  if (profile.role !== "admin" && intent) {
    if (intent.role === "client" || intent.role === "dj") {
      if (profile.role !== intent.role) {
        patch.role = intent.role;
      }
    }
    if (intent.role === "dj") {
      const kind = intent.artistKind ?? "dj";
      if (!profile.artist_kind || profile.artist_kind === "dj") {
        patch.artist_kind = kind;
      }
    }
  }

  // Client display name from real name if still empty
  if (
    (patch.role === "client" || profile.role === "client") &&
    !(patch.full_name || profile.full_name)?.trim()
  ) {
    const first = patch.real_first_name || profile.real_first_name || "";
    const last = patch.real_last_name || profile.real_last_name || "";
    const combined = `${first} ${last}`.trim();
    if (combined) patch.full_name = combined;
  }

  if (Object.keys(patch).length === 0) {
    return profile as ProfileRow;
  }

  // Role change may be blocked by trigger for non-service — try without role first if fails
  const { data: updated, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error && patch.role) {
    const withoutRole = { ...patch };
    delete withoutRole.role;
    if (Object.keys(withoutRole).length > 0) {
      const { data: retry } = await supabase
        .from("profiles")
        .update(withoutRole)
        .eq("id", user.id)
        .select(PROFILE_SELECT)
        .maybeSingle();
      return (retry as ProfileRow) ?? (profile as ProfileRow);
    }
    console.error("[syncOAuthProfileFromUser]", error.message);
    return profile as ProfileRow;
  }

  if (error) {
    console.error("[syncOAuthProfileFromUser]", error.message);
    return profile as ProfileRow;
  }

  return (updated as ProfileRow) ?? (profile as ProfileRow);
}
