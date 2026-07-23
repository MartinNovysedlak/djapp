/** Minimum fields required after signup (esp. Google OAuth). */

export type OnboardingProfile = {
  role?: string | null;
  full_name?: string | null;
  real_first_name?: string | null;
  real_last_name?: string | null;
  phone?: string | null;
  artist_kind?: string | null;
  avatar_url?: string | null;
  location?: string | null;
};

export type OnboardingGap =
  | "full_name"
  | "real_first_name"
  | "real_last_name"
  | "phone"
  | "artist_kind"
  | "location";

export function getOnboardingGaps(
  profile: OnboardingProfile | null | undefined
): OnboardingGap[] {
  if (!profile) {
    return ["full_name", "real_first_name", "real_last_name", "phone", "location"];
  }

  const gaps: OnboardingGap[] = [];
  const isClient = profile.role === "client";

  if (!profile.real_first_name?.trim()) gaps.push("real_first_name");
  if (!profile.real_last_name?.trim()) gaps.push("real_last_name");
  if (!profile.phone?.trim()) gaps.push("phone");

  if (!isClient) {
    if (!profile.full_name?.trim()) gaps.push("full_name");
    if (
      profile.artist_kind !== "dj" &&
      profile.artist_kind !== "band" &&
      profile.artist_kind !== "dj_band"
    ) {
      gaps.push("artist_kind");
    }
    if (!profile.location?.trim()) gaps.push("location");
  }

  return gaps;
}

export function isProfileOnboardingComplete(
  profile: OnboardingProfile | null | undefined
): boolean {
  return getOnboardingGaps(profile).length === 0;
}

/** DJ is listable in the public catalog only with a stage name + location. */
export function isCatalogEligible(
  profile: {
    role?: string | null;
    full_name?: string | null;
    location?: string | null;
  } | null | undefined
): boolean {
  if (!profile || profile.role === "client" || profile.role === "admin") {
    return false;
  }
  return Boolean(profile.full_name?.trim() && profile.location?.trim());
}

/** Split "Martin Novysedlák" → first / last for Google prefill. */
export function splitPersonName(raw: string): {
  firstName: string;
  lastName: string;
} {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function pickGoogleDisplayName(meta: Record<string, unknown>): string {
  const keys = ["display_name", "full_name", "name"] as const;
  for (const key of keys) {
    const v = meta[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export function pickGoogleAvatarUrl(meta: Record<string, unknown>): string | null {
  for (const key of ["avatar_url", "picture"] as const) {
    const v = meta[key];
    if (typeof v === "string" && /^https?:\/\//i.test(v.trim())) {
      return v.trim();
    }
  }
  return null;
}
