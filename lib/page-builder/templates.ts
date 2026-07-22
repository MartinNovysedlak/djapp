import {
  defaultSectionStyle,
  newId,
  type MediaItem,
  type PageSection,
  type SectionType,
} from "@/lib/page-builder/types";

export type SectionTemplate = {
  id: string;
  type: SectionType;
  name: string;
  description: string;
  previewHint: string;
};

/** Hero is fixed — not in add catalog. */
export const SECTION_CATALOG: {
  type: SectionType;
  label: string;
  description: string;
}[] = [
  { type: "about", label: "O mne", description: "Bio zo profilu" },
  { type: "text", label: "Text / Foto", description: "Banner, split, overlay" },
  { type: "gallery", label: "Galéria", description: "Fotky z profilu" },
  { type: "calendar", label: "Kalendár", description: "Dostupnosť termínov" },
  { type: "media", label: "Video", description: "Videoná z profilu" },
  {
    type: "packages",
    label: "Špeciálne balíky",
    description: "Import zo Špeciálnej ponuky",
  },
  { type: "reviews", label: "Recenzie", description: "Reálne hodnotenia" },
  { type: "faq", label: "FAQ", description: "Časté otázky" },
  { type: "contact", label: "Kontakt", description: "Lokalita a sociálne siete" },
  { type: "cta", label: "CTA", description: "Výrazná rezervácia" },
];

export const TEMPLATES: SectionTemplate[] = [
  {
    id: "hero.cover",
    type: "hero",
    name: "Cover + avatar",
    description: "Veľký cover, avatar a CTA",
    previewHint: "Cover banner",
  },
  {
    id: "hero.minimal",
    type: "hero",
    name: "Minimal",
    description: "Len meno, podnadpis a tlačidlo",
    previewHint: "Čistý úvod",
  },
  {
    id: "hero.centered",
    type: "hero",
    name: "Centrovaný",
    description: "Cover, meno a CTA v strede",
    previewHint: "Center hero",
  },
  {
    id: "about.simple",
    type: "about",
    name: "Jednoduchý text",
    description: "Nadpis + bio z profilu",
    previewHint: "Text blok",
  },
  {
    id: "about.split",
    type: "about",
    name: "Text + accent",
    description: "Centrovaný text s väčším nadpisom",
    previewHint: "Centered",
  },
  {
    id: "about.quote",
    type: "about",
    name: "Citát / intro",
    description: "Veľký úvodný odsek ako citát",
    previewHint: "„ … “",
  },
  {
    id: "text.plain",
    type: "text",
    name: "Nadpis + text",
    description: "Čistý textový blok",
    previewHint: "Aa",
  },
  {
    id: "text.photoLeft",
    type: "text",
    name: "Foto vľavo",
    description: "Fotka vľavo, nadpis a text vpravo",
    previewHint: "▣ | Aa",
  },
  {
    id: "text.photoRight",
    type: "text",
    name: "Foto vpravo",
    description: "Nadpis a text vľavo, fotka vpravo",
    previewHint: "Aa | ▣",
  },
  {
    id: "text.feature",
    type: "text",
    name: "Feature band",
    description: "Výrazný nadpis, krátky popis",
    previewHint: "Feature",
  },
  {
    id: "text.banner",
    type: "text",
    name: "Banner + text",
    description: "Titulná fotka od kraja po kraj + text pod ňou",
    previewHint: "Cover | Aa",
  },
  {
    id: "text.overlay",
    type: "text",
    name: "Foto + text na nej",
    description: "Fotka na pozadí, text cez ňu",
    previewHint: "Aa on photo",
  },
  {
    id: "gallery.grid3",
    type: "gallery",
    name: "3 fotky s popismi",
    description: "Tri karty — fotky z profilu alebo vlastný výber",
    previewHint: "▎▎▎",
  },
  {
    id: "gallery.grid",
    type: "gallery",
    name: "Mriežka",
    description: "Fotky z tvojej galérie",
    previewHint: "Grid",
  },
  {
    id: "gallery.grid2",
    type: "gallery",
    name: "2 stĺpce",
    description: "Širšie fotky v dvoch stĺpcoch",
    previewHint: "▏▏",
  },
  {
    id: "gallery.slideshow",
    type: "gallery",
    name: "Slideshow",
    description: "Jedna fotka, pomalé prechádzanie",
    previewHint: "▶ ▢",
  },
  {
    id: "gallery.marquee",
    type: "gallery",
    name: "Marquee",
    description: "Nekonečný pohyb fotiek",
    previewHint: "→ → →",
  },
  {
    id: "gallery.bento",
    type: "gallery",
    name: "Bento mosaic",
    description: "Veľká fotka + dlaždice",
    previewHint: "▣ ▢▢",
  },
  {
    id: "calendar.month",
    type: "calendar",
    name: "Mesačný kalendár",
    description: "Tvoja reálna obsadenosť",
    previewHint: "Kalendár",
  },
  {
    id: "calendar.weeks",
    type: "calendar",
    name: "2 týždne",
    description: "Štvorčeky na 14 dní s preklikom",
    previewHint: "▢▢▢",
  },
  {
    id: "calendar.compact",
    type: "calendar",
    name: "Kompaktný",
    description: "Najbližšie obsadené dni",
    previewHint: "Zoznam",
  },
  {
    id: "calendar.card",
    type: "calendar",
    name: "Karta dostupnosti",
    description: "CTA karta + kalendár",
    previewHint: "Karta",
  },
  {
    id: "media.stack",
    type: "media",
    name: "Video stack",
    description: "Videoná z profilu pod sebou",
    previewHint: "Video",
  },
  {
    id: "media.featured",
    type: "media",
    name: "Hlavné video",
    description: "Prvé video veľké, zvyšok menšie",
    previewHint: "▶ Video",
  },
  {
    id: "media.filmstrip",
    type: "media",
    name: "Filmstrip",
    description: "Videoná vodorovne vedľa seba",
    previewHint: "▶ ▶ ▶",
  },
  {
    id: "packages.cards",
    type: "packages",
    name: "Karty balíkov",
    description: "Aktívne položky zo Špeciálnej ponuky",
    previewHint: "€ €",
  },
  {
    id: "packages.list",
    type: "packages",
    name: "Zoznam",
    description: "Špeciálna ponuka ako zoznam",
    previewHint: "List",
  },
  {
    id: "packages.highlight",
    type: "packages",
    name: "S highlightom",
    description: "Prvá položka zvýraznená",
    previewHint: "★ €",
  },
  {
    id: "reviews.list",
    type: "reviews",
    name: "Zoznam recenzií",
    description: "Reálne hodnotenia klientov",
    previewHint: "★★★",
  },
  {
    id: "reviews.grid",
    type: "reviews",
    name: "Mriežka",
    description: "Recenzie vedľa seba",
    previewHint: "★ ★",
  },
  {
    id: "reviews.spotlight",
    type: "reviews",
    name: "Spotlight citát",
    description: "Jedna veľká recenzia v strede",
    previewHint: "„ ★ “",
  },
  {
    id: "reviews.strip",
    type: "reviews",
    name: "Horizontálny strip",
    description: "Recenzie v posuvnom rade",
    previewHint: "→ ★ →",
  },
  {
    id: "faq.accordion",
    type: "faq",
    name: "Accordion",
    description: "Rozbaliteľné otázky",
    previewHint: "Q/A",
  },
  {
    id: "faq.stack",
    type: "faq",
    name: "Otvorený zoznam",
    description: "Všetky odpovede viditeľné",
    previewHint: "Q\nA",
  },
  {
    id: "faq.columns",
    type: "faq",
    name: "Dva stĺpce",
    description: "FAQ vedľa seba",
    previewHint: "Q|Q",
  },
  {
    id: "contact.simple",
    type: "contact",
    name: "Kontakt",
    description: "Lokalita + sociálne siete z profilu",
    previewHint: "@",
  },
  {
    id: "contact.cards",
    type: "contact",
    name: "Kontakt karty",
    description: "Lokalita a siete ako karty",
    previewHint: "📍 @",
  },
  {
    id: "contact.pill",
    type: "contact",
    name: "Pills / strip",
    description: "Kompaktný rad odkazov",
    previewHint: "● ● ●",
  },
  {
    id: "cta.banner",
    type: "cta",
    name: "Banner CTA",
    description: "Centrovaný call-to-action",
    previewHint: "CTA",
  },
  {
    id: "cta.split",
    type: "cta",
    name: "CTA split",
    description: "Text vľavo, tlačidlo vpravo",
    previewHint: "Aa  [→]",
  },
  {
    id: "cta.minimal",
    type: "cta",
    name: "Minimal CTA",
    description: "Len tlačidlo, čistý stred",
    previewHint: "[ CTA ]",
  },
];

export function templatesForType(type: SectionType): SectionTemplate[] {
  return TEMPLATES.filter((t) => t.type === type);
}

export function getTemplate(templateId: string): SectionTemplate | undefined {
  return TEMPLATES.find((t) => t.id === templateId);
}

function emptyMedia(count: number): MediaItem[] {
  return Array.from({ length: count }, () => ({
    id: newId(),
    url: "",
    caption: "",
  }));
}

const NICHE = {
  heroSub: "",
  heroCta: "Rezervácia",
  aboutTitle: "O mne",
  aboutBody: "",
  textTitle: "",
  textBody: "",
  textFeatureTitle: "",
  textFeatureBody: "",
  galleryTitle: "Galéria",
  calendarTitle: "Dostupnosť",
  calendarCardTitle: "Dostupnosť",
  calendarSub: "",
  mediaTitle: "Videá",
  packagesTitle: "Ponuka",
  reviewsTitle: "Recenzie",
  faqTitle: "FAQ",
  contactTitle: "Kontakt",
  ctaTitle: "",
  ctaLabel: "Poslať dopyt",
};

export function createSectionFromTemplate(
  templateId: string,
  seed?: { name?: string; location?: string; bio?: string; avatarUrl?: string }
): PageSection | null {
  const tpl = getTemplate(templateId);
  if (!tpl) return null;
  const id = newId();
  const name = seed?.name?.trim() || "DJ";
  const bio = seed?.bio?.trim() || "";

  switch (tpl.id) {
    case "hero.cover":
    case "hero.minimal":
    case "hero.centered":
      return {
        id,
        type: "hero",
        templateId: tpl.id,
        visible: true,
        style: defaultSectionStyle({
          align:
            tpl.id === "hero.minimal" || tpl.id === "hero.centered"
              ? "center"
              : "left",
          titleSizePx: 34,
          bodySizePx: 15,
        }),
        props: {
          headline: name,
          subheadline: seed?.location?.trim() || NICHE.heroSub,
          showCover: tpl.id !== "hero.minimal",
          showAvatar: true,
          coverImageUrl: "",
          sideImageUrl: "",
          imageOpacity: 100,
          imageBlur: 0,
          ctaLabel: NICHE.heroCta,
        },
      };
    case "about.simple":
    case "about.split":
    case "about.quote":
      return {
        id,
        type: "about",
        templateId: tpl.id,
        visible: true,
        style: defaultSectionStyle({
          align:
            tpl.id === "about.split" || tpl.id === "about.quote"
              ? "center"
              : "left",
          titleSizePx: tpl.id === "about.quote" ? 26 : 22,
          bodySizePx: tpl.id === "about.quote" ? 17 : 15,
        }),
        props: {
          title: NICHE.aboutTitle,
          body: bio || NICHE.aboutBody,
          useProfileBio: Boolean(bio),
          syncToProfile: true,
        },
      };
    case "text.plain":
    case "text.photoLeft":
    case "text.photoRight":
    case "text.feature":
    case "text.banner":
    case "text.overlay":
      return {
        id,
        type: "text",
        templateId: tpl.id,
        visible: true,
        style: defaultSectionStyle({
          align:
            tpl.id === "text.feature" || tpl.id === "text.overlay"
              ? "center"
              : "left",
          titleSizePx:
            tpl.id === "text.feature" || tpl.id === "text.overlay" ? 28 : 22,
          bodySizePx: 15,
          paddingY: tpl.id === "text.banner" || tpl.id === "text.overlay" ? "md" : "md",
        }),
        props: {
          title:
            tpl.id === "text.feature" ? NICHE.textFeatureTitle : NICHE.textTitle,
          body:
            tpl.id === "text.feature" ? NICHE.textFeatureBody : NICHE.textBody,
          imageUrl: seed?.avatarUrl || "",
          imageCaption: "",
          imageOpacity: 100,
          imageBlur: 0,
          showCover: true,
          showImageCaption: true,
          photoWidth: "md",
          photoAspect: "portrait",
          contentLayout: "side",
          titlePosition: "bottom",
        },
      };
    case "gallery.grid3":
      return {
        id,
        type: "gallery",
        templateId: tpl.id,
        visible: true,
        style: defaultSectionStyle({
          align: "center",
          titleSizePx: 22,
        }),
        props: {
          title: NICHE.galleryTitle,
          source: "profile",
          limit: 3,
          speedMs: 4000,
          showCaptions: true,
          showTitle: true,
          tileSize: "md",
          items: emptyMedia(3).map((m) => ({
            ...m,
            caption: "",
          })),
        },
      };
    case "gallery.grid":
    case "gallery.grid2":
    case "gallery.slideshow":
    case "gallery.marquee":
    case "gallery.bento":
      return {
        id,
        type: "gallery",
        templateId: tpl.id,
        visible: true,
        style: defaultSectionStyle({ titleSizePx: 22 }),
        props: {
          title: NICHE.galleryTitle,
          source: "profile",
          limit: tpl.id === "gallery.bento" ? 5 : 12,
          speedMs: tpl.id === "gallery.slideshow" ? 4500 : 40000,
          showCaptions: tpl.id !== "gallery.marquee",
          showTitle: true,
          tileSize: "md",
          items: [] as MediaItem[],
        },
      };
    case "calendar.month":
    case "calendar.weeks":
    case "calendar.compact":
    case "calendar.card":
      return {
        id,
        type: "calendar",
        templateId: tpl.id,
        visible: true,
        style: defaultSectionStyle({ align: "center", titleSizePx: 22 }),
        props: {
          title:
            tpl.id === "calendar.card"
              ? NICHE.calendarCardTitle
              : NICHE.calendarTitle,
          subtitle: NICHE.calendarSub,
        },
      };
    case "media.stack":
    case "media.featured":
    case "media.filmstrip":
      return {
        id,
        type: "media",
        templateId: tpl.id,
        visible: true,
        style: defaultSectionStyle({ titleSizePx: 22 }),
        props: { title: NICHE.mediaTitle },
      };
    case "packages.cards":
    case "packages.list":
    case "packages.highlight":
      return {
        id,
        type: "packages",
        templateId: tpl.id,
        visible: true,
        style: defaultSectionStyle({ titleSizePx: 22 }),
        props: {
          title: NICHE.packagesTitle,
          source: "extras",
          items: [],
        },
      };
    case "reviews.list":
    case "reviews.grid":
    case "reviews.spotlight":
    case "reviews.strip":
      return {
        id,
        type: "reviews",
        templateId: tpl.id,
        visible: true,
        style: defaultSectionStyle({ titleSizePx: 22 }),
        props: {
          title: NICHE.reviewsTitle,
          limit: tpl.id === "reviews.spotlight" ? 1 : 6,
        },
      };
    case "faq.accordion":
    case "faq.stack":
    case "faq.columns":
      return {
        id,
        type: "faq",
        templateId: tpl.id,
        visible: true,
        style: defaultSectionStyle({ titleSizePx: 22 }),
        props: {
          title: NICHE.faqTitle,
          items: [
            { id: newId(), question: "", answer: "" },
            { id: newId(), question: "", answer: "" },
            { id: newId(), question: "", answer: "" },
          ],
        },
      };
    case "contact.simple":
    case "contact.cards":
    case "contact.pill":
      return {
        id,
        type: "contact",
        templateId: tpl.id,
        visible: true,
        style: defaultSectionStyle({ titleSizePx: 22 }),
        props: {
          title: NICHE.contactTitle,
          showSocials: true,
          showLocation: true,
        },
      };
    case "cta.banner":
    case "cta.split":
    case "cta.minimal":
      return {
        id,
        type: "cta",
        templateId: tpl.id,
        visible: true,
        style: defaultSectionStyle({
          align: tpl.id === "cta.split" ? "left" : "center",
          titleSizePx: 26,
          bodySizePx: 15,
        }),
        props: {
          title: NICHE.ctaTitle,
          label: NICHE.ctaLabel,
          buttonStyle: "solid",
        },
      };
    default:
      return null;
  }
}
