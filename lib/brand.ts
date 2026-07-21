/** Canonical product branding — use across UI, emails and SEO. */
export const BRAND = {
  name: "BookTheVibe",
  tagline: "Rezervuj vibe. Spravuj biznis.",
  shortDescription:
    "Platforma, ktorá spája klientov s DJ-mi a dáva DJ-om nástroje na rezervácie, kalendár, zmluvy a eventy.",
  description:
    "BookTheVibe je webová platforma pre DJ-ov a klientov: katalóg, nezáväzné rezervácie, kalendár, zmluvy, faktúry, playlist a live requesty — všetko na jednom mieste.",
  url: "https://bookthevibe.com",
  email: "bookthevibeonline@gmail.com",
  locale: "sk_SK",
} as const;

export const SEO_DEFAULT = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  titleTemplate: `%s | ${BRAND.name}`,
  description: BRAND.description,
  keywords: [
    "BookTheVibe",
    "DJ rezervácia",
    "DJ katalóg",
    "prenájom DJ",
    "svadba DJ",
    "event DJ Slovensko",
    "DJ kalendár",
    "DJ zmluvy",
    "book the vibe",
  ],
} as const;
