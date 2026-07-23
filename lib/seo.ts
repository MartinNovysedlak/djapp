import type { Metadata } from "next";
import { BRAND, SEO_DEFAULT } from "@/lib/brand";
import { getPublicSiteUrl } from "@/lib/site-url";

const siteUrl = getPublicSiteUrl();

/** Meta descriptions tuned for Google SERP snippets (~150–160 znakov). */
export const SEO_PAGES = {
  home: {
    title: SEO_DEFAULT.title,
    absoluteTitle: true,
    description: SEO_DEFAULT.description,
    path: "/",
  },
  catalog: {
    title: "Katalóg umelcov",
    description:
      "Nájdi DJ-a alebo kapelu na Slovensku a v Česku. Filtruj podľa mesta, kraja aj regiónu, porovnaj až 4 umelcov a pošli nezáväzný dopyt online.",
    path: "/djs",
  },
  register: {
    title: "Registrácia",
    description:
      "Vytvor si free účet na BookTheVibe. Ako umelec sa pridaj do katalógu, ako klient rezervuj DJ-a alebo kapelu na svoju akciu.",
    path: "/register",
  },
  login: {
    title: "Prihlásenie",
    description:
      "Prihlás sa do BookTheVibe — dashboard pre umelcov a klientov. Správa rezervácií, kalendára a dokumentov na jednom mieste.",
    path: "/login",
    noIndex: true,
  },
  kontakt: {
    title: "Kontakt",
    description:
      "Kontaktuj tím BookTheVibe. Otázky k rezerváciám, profilu umelca, Premium plánu alebo spolupráci — ozveme sa ti čo najskôr.",
    path: "/kontakt",
  },
  blog: {
    title: "Blog o svadbe a DJ",
    description:
      "Tipy na svadbu, výber DJ-a, reálne ceny a praktické rady pre plánovanie eventu. Blog BookTheVibe pre snúbencov aj umelcov.",
    path: "/blog",
  },
  podmienky: {
    title: "Podmienky používania",
    description:
      "Všeobecné podmienky používania BookTheVibe — práva a povinnosti používateľov, rezervácie, obsah profilov a zodpovednosť.",
    path: "/podmienky",
  },
  obchodnePodmienky: {
    title: "Obchodné podmienky",
    description:
      "Obchodné podmienky BookTheVibe pre Premium plán, dokumenty, fakturáciu a komerčné využívanie platformy umelcami.",
    path: "/obchodne-podmienky",
  },
} as const;

type SeoPageKey = keyof typeof SEO_PAGES;

type BuildOpts = {
  /** Override description without changing the shared SEO_PAGES entry. */
  description?: string;
  /** Extra Open Graph images (absolute or site-relative). */
  images?: string[];
};

/**
 * Consistent title + description + OG/Twitter for public pages
 * so Google can show a clear snippet under each URL.
 */
export function buildPageMetadata(
  key: SeoPageKey,
  opts: BuildOpts = {}
): Metadata {
  const page = SEO_PAGES[key];
  const description = opts.description ?? page.description;
  const path = page.path;
  const url = `${siteUrl}${path === "/" ? "" : path}`;
  const titleForOg =
    "absoluteTitle" in page && page.absoluteTitle
      ? page.title
      : `${page.title} | ${BRAND.name}`;
  const noIndex = "noIndex" in page && page.noIndex;

  const images = (opts.images ?? [BRAND.logoPngPath]).map((img) =>
    img.startsWith("http") ? img : `${siteUrl}${img}`
  );

  return {
    title:
      "absoluteTitle" in page && page.absoluteTitle
        ? { absolute: page.title }
        : page.title,
    description,
    keywords: [...SEO_DEFAULT.keywords],
    alternates: { canonical: path },
    robots: noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title: titleForOg,
      description,
      url,
      siteName: BRAND.name,
      locale: BRAND.locale,
      type: "website",
      images: images.map((url) => ({ url })),
    },
    twitter: {
      card: "summary_large_image",
      title: titleForOg,
      description,
      images,
    },
  };
}

/** JSON-LD for the homepage — helps Google understand the brand & site. */
export function getHomeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: BRAND.name,
        url: siteUrl,
        email: BRAND.email,
        logo: `${siteUrl}${BRAND.logoPngPath}`,
        sameAs: [],
        description: BRAND.shortDescription,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: BRAND.name,
        description: BRAND.description,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "sk-SK",
      },
    ],
  };
}
