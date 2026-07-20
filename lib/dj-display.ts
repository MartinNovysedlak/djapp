/**
 * Helpers for how a DJ's identity is shown publicly.
 * `full_name` is the stage / artist name; real first/last are private unless
 * the DJ explicitly opts in via `show_real_name`.
 */

export type DjIdentity = {
  full_name: string | null;
  real_first_name?: string | null;
  real_last_name?: string | null;
  show_real_name?: boolean | null;
};

/** Primary public label — always the artist / stage name. */
export function getDjStageName(dj: DjIdentity, fallback = "Neznámy DJ") {
  return dj.full_name?.trim() || fallback;
}

/** Optional real-name subtitle shown only when the DJ opted in. */
export function getDjRealName(dj: DjIdentity): string | null {
  if (!dj.show_real_name) return null;
  const first = dj.real_first_name?.trim() ?? "";
  const last = dj.real_last_name?.trim() ?? "";
  const combined = `${first} ${last}`.trim();
  return combined || null;
}
