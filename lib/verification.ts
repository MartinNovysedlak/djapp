/** DJ profile verification (verified badge) helpers. */

export const VERIFICATION_MIN_GALLERY_PHOTOS = 2;

export type VerificationStatus = "pending" | "approved" | "rejected";

export type VerificationRequirementKey =
  | "realFirstName"
  | "realLastName"
  | "phone"
  | "location"
  | "permanentAddress"
  | "social"
  | "avatar"
  | "gallery";

export type VerificationRequirement = {
  key: VerificationRequirementKey;
  label: string;
  ok: boolean;
  hint: string;
  /** Anchor on /dashboard/profile to scroll to the field */
  anchor?: string;
};

export type VerificationEligibilityInput = {
  realFirstName?: string | null;
  realLastName?: string | null;
  phone?: string | null;
  location?: string | null;
  permanentAddress?: string | null;
  avatarUrl?: string | null;
  galleryUrls?: string[] | null;
  socialLinks?: Record<string, string> | null;
};

const SOCIAL_KEYS = ["instagram", "soundcloud", "youtube", "website"] as const;

export function getFilledSocialLinks(
  socialLinks?: Record<string, string> | null
): { key: string; url: string }[] {
  if (!socialLinks) return [];
  return SOCIAL_KEYS.flatMap((key) => {
    const url = socialLinks[key]?.trim();
    return url ? [{ key, url }] : [];
  });
}

export function hasSocialLink(
  socialLinks?: Record<string, string> | null
): boolean {
  return getFilledSocialLinks(socialLinks).length > 0;
}

export function getVerificationRequirements(
  input: VerificationEligibilityInput
): VerificationRequirement[] {
  const galleryCount = (input.galleryUrls ?? []).filter(Boolean).length;

  return [
    {
      key: "realFirstName",
      label: "Skutočné meno",
      ok: Boolean(input.realFirstName?.trim()),
      hint: "Vyplň krstné meno vyššie v profile a ulož.",
      anchor: "verification-identity",
    },
    {
      key: "realLastName",
      label: "Priezvisko",
      ok: Boolean(input.realLastName?.trim()),
      hint: "Vyplň priezvisko vyššie v profile a ulož.",
      anchor: "verification-identity",
    },
    {
      key: "phone",
      label: "Telefón",
      ok: Boolean(input.phone?.trim()),
      hint: "Pridaj telefón vyššie v profile a ulož.",
      anchor: "verification-identity",
    },
    {
      key: "location",
      label: "Lokalita (odkiaľ pôsobíš)",
      ok: Boolean(input.location?.trim()),
      hint: "Vyber mesto / lokalitu vyššie v profile a ulož.",
      anchor: "verification-location",
    },
    {
      key: "permanentAddress",
      label: "Trvalé bydlisko",
      ok: Boolean(input.permanentAddress?.trim()),
      hint: "Vyplň súkromnú adresu trvalého bydliska (nie je verejná) a ulož.",
      anchor: "verification-residence",
    },
    {
      key: "social",
      label: "Sociálna sieť",
      ok: hasSocialLink(input.socialLinks),
      hint: "Pridaj aspoň jeden odkaz (Instagram, YouTube, SoundCloud alebo web) a ulož.",
      anchor: "verification-social",
    },
    {
      key: "avatar",
      label: "Profilová fotka",
      ok: Boolean(input.avatarUrl?.trim()),
      hint: "Nahraj profilovú fotku vyššie.",
      anchor: "verification-avatar",
    },
    {
      key: "gallery",
      label: `Galéria (min. ${VERIFICATION_MIN_GALLERY_PHOTOS} fotky)`,
      ok: galleryCount >= VERIFICATION_MIN_GALLERY_PHOTOS,
      hint: `Nahraj aspoň ${VERIFICATION_MIN_GALLERY_PHOTOS} fotky do galérie.`,
      anchor: "verification-photos",
    },
  ];
}

export function isVerificationEligible(
  input: VerificationEligibilityInput
): boolean {
  return getVerificationRequirements(input).every((r) => r.ok);
}

export type VerificationSnapshot = {
  email: string | null;
  stageName: string | null;
  realFirstName: string | null;
  realLastName: string | null;
  phone: string | null;
  location: string | null;
  permanentAddress: string | null;
  avatarUrl: string | null;
  galleryUrls: string[];
  videoUrls?: string[];
  publicSlug: string | null;
  artistKind: string | null;
  bio?: string | null;
  socialLinks: Record<string, string>;
  planType?: string | null;
};
