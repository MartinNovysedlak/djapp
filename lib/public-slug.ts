/**
 * Slug helpers for public /djs/{slug} URLs.
 * Keep in sync with SQL `public.slugify_artist_name` in migrations.
 */

export function slugifyArtistName(raw: string): string {
  const map: Record<string, string> = {
    á: "a",
    ä: "a",
    č: "c",
    ď: "d",
    é: "e",
    ě: "e",
    í: "i",
    ľ: "l",
    ĺ: "l",
    ň: "n",
    ó: "o",
    ô: "o",
    ö: "o",
    ŕ: "r",
    š: "s",
    ť: "t",
    ú: "u",
    ü: "u",
    ý: "y",
    ž: "z",
  };

  let s = raw.trim().toLowerCase();
  s = s
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("");
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  s = s.slice(0, 60).replace(/-+$/g, "");
  return s || "umelec";
}
