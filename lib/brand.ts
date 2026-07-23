/** Canonical product branding — use across UI, emails and SEO. */
export const BRAND = {
  name: "BookTheVibe",
  tagline: "Rezervuj vibe. Spravuj biznis.",
  shortDescription:
    "Platforma pre umelcov a klientov s katalógom, rezerváciami, kalendárom, zmluvami a live requesty — všetky nástroje na jednom mieste.",
  description:
    "BookTheVibe je webová platforma pre DJ-ov, kapely a klientov. Katalóg so smart filtrami podľa SK/CZ kraja, regiónu a mesta, hromadný dopyt až 4 umelcom, page builder, rezervácie, kalendár, PDF zmluvy, faktúry, live requesty a verifikácia profilu.",
  url: "https://bookthevibe.com",
  email: "bookthevibeonline@gmail.com",
  locale: "sk_SK",
  logoPath: "/brand/bookthevibe-logo.svg",
  logoPngPath: "/brand/bookthevibe-logo.png",
} as const;

export const SEO_DEFAULT = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  titleTemplate: `%s | ${BRAND.name}`,
  description: BRAND.description,
  keywords: [
    "BookTheVibe",
    "DJ rezervácia",
    "kapela rezervácia",
    "DJ katalóg Slovensko",
    "prenájom DJ",
    "svadba DJ",
    "svadba kapela",
    "DJ kalendár",
    "DJ zmluvy",
    "katalóg umelcov",
    "hromadný dopyt",
    "DJ page builder",
    "live requesty",
    "DJ Slovensko",
    "DJ Česko",
    "rezervácia kapely online",
    "book the vibe",
  ],
} as const;
