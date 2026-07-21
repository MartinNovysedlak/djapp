import { hasPremiumAccess } from "@/lib/plans";

/**
 * Public identity helpers for artist profiles (DJ / Kapela / mix).
 * `full_name` is the stage / artist name; real first/last are private unless
 * the artist opts in via `show_real_name`.
 */

export type ArtistKind = "dj" | "band" | "dj_band";

export type DjIdentity = {
  full_name: string | null;
  real_first_name?: string | null;
  real_last_name?: string | null;
  show_real_name?: boolean | null;
  artist_kind?: ArtistKind | string | null;
};

export function normalizeArtistKind(
  kind: string | null | undefined
): ArtistKind {
  if (kind === "band" || kind === "dj_band") return kind;
  return "dj";
}

/** Parenthetical label next to the name — empty for pure DJ. */
export function getArtistKindLabel(kind: ArtistKind | string | null | undefined): string {
  switch (normalizeArtistKind(kind)) {
    case "band":
      return "Kapela";
    case "dj_band":
      return "DJ + Kapela";
    default:
      return "";
  }
}

/** Catalog / plan badge. */
export function getArtistPlanBadge(
  planType: string | null | undefined,
  kind: ArtistKind | string | null | undefined,
  opts?: {
    trial_ends_at?: string | null;
    premium_until?: string | null;
  }
): string {
  const premium = hasPremiumAccess({
    plan_type: planType,
    trial_ends_at: opts?.trial_ends_at,
    premium_until: opts?.premium_until,
  });

  switch (normalizeArtistKind(kind)) {
    case "band":
      return premium ? "PREMIUM Kapela" : "FREE Kapela";
    case "dj_band":
      return premium ? "PREMIUM" : "FREE";
    default:
      return premium ? "PREMIUM DJ" : "FREE DJ";
  }
}

export function getArtistStageNameFallback(
  kind: ArtistKind | string | null | undefined
): string {
  switch (normalizeArtistKind(kind)) {
    case "band":
      return "Neznáma kapela";
    case "dj_band":
      return "Neznámy umelec";
    default:
      return "Neznámy DJ";
  }
}

/** Primary public label — always the artist / stage name. */
export function getDjStageName(
  dj: DjIdentity,
  fallback?: string
): string {
  const fb =
    fallback ?? getArtistStageNameFallback(dj.artist_kind);
  return dj.full_name?.trim() || fb;
}

/** Stage name + optional (Kapela) / (DJ + Kapela). */
export function formatArtistDisplayName(
  dj: DjIdentity,
  fallback?: string
): string {
  const name = getDjStageName(dj, fallback);
  const label = getArtistKindLabel(dj.artist_kind);
  return label ? `${name} (${label})` : name;
}

/** Optional real-name subtitle shown only when the DJ opted in. */
export function getDjRealName(dj: DjIdentity): string | null {
  if (!dj.show_real_name) return null;
  const first = dj.real_first_name?.trim() ?? "";
  const last = dj.real_last_name?.trim() ?? "";
  const combined = `${first} ${last}`.trim();
  return combined || null;
}

export type ArtistNounCase =
  | "nom" // DJ / kapela / umelec
  | "gen" // DJ-a / kapely / umelca
  | "dat" // DJ-ovi / kapele / umelcovi
  | "acc"; // DJ-a / kapelu / umelca

/** Short inflected noun for UI copy tied to a known artist kind. */
export function getArtistNoun(
  kind: ArtistKind | string | null | undefined,
  nounCase: ArtistNounCase = "nom"
): string {
  const k = normalizeArtistKind(kind);
  const table: Record<ArtistKind, Record<ArtistNounCase, string>> = {
    dj: {
      nom: "DJ",
      gen: "DJ-a",
      dat: "DJ-ovi",
      acc: "DJ-a",
    },
    band: {
      nom: "kapela",
      gen: "kapely",
      dat: "kapele",
      acc: "kapelu",
    },
    dj_band: {
      nom: "umelec",
      gen: "umelca",
      dat: "umelcovi",
      acc: "umelca",
    },
  };
  return table[k][nounCase];
}

/** Sentence-start form (Kapela / DJ / Umelec). */
export function getArtistNounCap(
  kind: ArtistKind | string | null | undefined,
  nounCase: ArtistNounCase = "nom"
): string {
  const n = getArtistNoun(kind, nounCase);
  if (!n) return n;
  return n.charAt(0).toUpperCase() + n.slice(1);
}

/** Possessive-ish subject for “X ti pošle…” */
export function getArtistWillSend(kind: ArtistKind | string | null | undefined): string {
  switch (normalizeArtistKind(kind)) {
    case "band":
      return "Kapela ti pošle";
    case "dj_band":
      return "Umelec ti pošle";
    default:
      return "DJ ti pošle";
  }
}

/** Profile field label for stage / band name. */
export function getArtistNameFieldLabel(
  kind: ArtistKind | string | null | undefined
): string {
  switch (normalizeArtistKind(kind)) {
    case "band":
      return "Názov kapely";
    case "dj_band":
      return "Umelecké meno / názov";
    default:
      return "Umelecké meno";
  }
}

export function getArtistNameFieldHint(
  kind: ArtistKind | string | null | undefined
): string | null {
  switch (normalizeArtistKind(kind)) {
    case "band":
      return null;
    case "dj_band":
      return "Meno, pod ktorým vystupujete (DJ + kapela).";
    default:
      return "DJ prezývka";
  }
}

export const ARTIST_KIND_OPTIONS: {
  value: ArtistKind;
  label: string;
  description: string;
}[] = [
  {
    value: "dj",
    label: "DJ",
    description: "Sólo DJ sety a eventy",
  },
  {
    value: "band",
    label: "Kapela",
    description: "Živá kapela / live act",
  },
  {
    value: "dj_band",
    label: "DJ + Kapela",
    description: "Kombinácia DJ a kapely",
  },
];
