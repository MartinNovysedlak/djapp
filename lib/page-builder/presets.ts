import { createSectionFromTemplate } from "@/lib/page-builder/templates";
import { ensureRequiredSections } from "@/lib/page-builder/section-order";
import {
  defaultSectionStyle,
  type PageSection,
  type PageTheme,
  type SectionStyle,
} from "@/lib/page-builder/types";

export type PagePresetId =
  | "katalog"
  | "midnight"
  | "neon"
  | "editorial"
  | "lounge"
  | "cinema";

export type PagePreset = {
  id: PagePresetId;
  name: string;
  tagline: string;
  previewHint: string;
  swatch: string;
  /** free = available without Premium */
  tier: "free" | "premium";
  theme: PageTheme;
  sectionTemplateIds: string[];
  styleOverrides?: Partial<Record<string, Partial<SectionStyle>>>;
  /** Merged into section.props after template defaults */
  propOverrides?: Partial<Record<string, Record<string, unknown>>>;
};

export type PresetSeed = {
  name?: string;
  location?: string;
  bio?: string;
  avatarUrl?: string;
};

export function isFreePreset(id: PagePresetId): boolean {
  return PAGE_PRESETS.find((p) => p.id === id)?.tier === "free";
}

export const PAGE_PRESETS: PagePreset[] = [
  {
    id: "katalog",
    name: "Klasika",
    tagline: "Čistý glass look — classic hero, aurora, karty",
    previewHint: "Glass · Classic",
    swatch: "from-violet-500 via-fuchsia-500 to-pink-400",
    tier: "free",
    theme: {
      accent: "violet",
      cardLayout: "cards",
      bgStyle: "radial",
      atmosphere: "aurora",
      surface: "glass",
      radius: "pill",
      density: "comfortable",
      heroStyle: "classic",
      titleWeight: "bold",
      glow: true,
      motion: "subtle",
      sectionDividers: false,
    },
    sectionTemplateIds: [
      "hero.cover",
      "about.simple",
      "gallery.grid",
      "calendar.month",
      "packages.cards",
      "reviews.list",
      "faq.accordion",
      "contact.simple",
      "cta.banner",
    ],
    styleOverrides: {
      "hero.cover": {
        align: "left",
        titleSizePx: 36,
        bodySizePx: 15,
        entrance: "fade",
        paddingY: "md",
      },
      "about.simple": {
        align: "left",
        titleSizePx: 22,
        bodySizePx: 15,
        entrance: "slideUp",
        paddingY: "md",
      },
      "cta.banner": {
        align: "center",
        titleSizePx: 28,
        entrance: "fade",
        paddingY: "lg",
      },
    },
  },
  {
    id: "midnight",
    name: "Midnight Ink",
    tagline: "Gallery-night — sky line, 2-week calendar, spotlight quote",
    previewHint: "Sky · Weeks",
    swatch: "from-slate-800 via-sky-600 to-cyan-300",
    tier: "free",
    theme: {
      accent: "sky",
      cardLayout: "flush",
      bgStyle: "vignette",
      atmosphere: "stars",
      surface: "outline",
      radius: "md",
      density: "airy",
      heroStyle: "classic",
      titleWeight: "medium",
      glow: false,
      motion: "static",
      sectionDividers: true,
    },
    sectionTemplateIds: [
      "hero.minimal",
      "about.quote",
      "gallery.slideshow",
      "text.plain",
      "calendar.weeks",
      "reviews.spotlight",
      "faq.columns",
      "contact.pill",
      "cta.minimal",
    ],
    styleOverrides: {
      "hero.minimal": {
        align: "center",
        titleSizePx: 44,
        bodySizePx: 16,
        entrance: "fade",
        paddingY: "lg",
      },
      "about.quote": {
        align: "center",
        titleSizePx: 18,
        bodySizePx: 20,
        entrance: "slideUp",
        paddingY: "lg",
      },
      "text.plain": {
        align: "center",
        titleSizePx: 28,
        bodySizePx: 16,
        entrance: "fade",
        paddingY: "lg",
      },
      "gallery.slideshow": {
        align: "center",
        titleSizePx: 20,
        entrance: "fade",
        paddingY: "md",
      },
      "reviews.spotlight": {
        align: "center",
        titleSizePx: 22,
        entrance: "fade",
        paddingY: "lg",
      },
      "cta.minimal": {
        align: "center",
        titleSizePx: 22,
        entrance: "none",
        paddingY: "md",
      },
    },
    propOverrides: {
      "gallery.slideshow": { showCaptions: false, showTitle: true },
      "reviews.spotlight": { limit: 1 },
      "calendar.weeks": { title: "Dostupnosť" },
    },
  },
  {
    id: "neon",
    name: "Neon Afterhours",
    tagline: "Klubová energia — fuchsia neon, marquee, filmstrip",
    previewHint: "Neon · Motion",
    swatch: "from-fuchsia-600 via-pink-500 to-violet-400",
    tier: "premium",
    theme: {
      accent: "fuchsia",
      cardLayout: "floating",
      bgStyle: "mesh",
      atmosphere: "orbs",
      surface: "neon",
      radius: "xl",
      density: "compact",
      heroStyle: "poster",
      titleWeight: "black",
      glow: true,
      motion: "lively",
      sectionDividers: false,
    },
    sectionTemplateIds: [
      "hero.centered",
      "text.feature",
      "gallery.marquee",
      "media.filmstrip",
      "packages.highlight",
      "reviews.strip",
      "faq.accordion",
      "contact.cards",
      "cta.banner",
    ],
    styleOverrides: {
      "hero.centered": {
        align: "center",
        titleSizePx: 42,
        bodySizePx: 15,
        entrance: "slideUp",
        paddingY: "lg",
      },
      "text.feature": {
        align: "center",
        titleSizePx: 32,
        bodySizePx: 16,
        entrance: "fade",
        paddingY: "md",
      },
      "gallery.marquee": {
        align: "center",
        titleSizePx: 20,
        entrance: "fade",
        paddingY: "sm",
      },
      "media.filmstrip": {
        align: "center",
        titleSizePx: 20,
        entrance: "slideUp",
        paddingY: "sm",
      },
      "reviews.strip": {
        align: "left",
        titleSizePx: 22,
        entrance: "fade",
        paddingY: "md",
      },
      "cta.banner": {
        align: "center",
        titleSizePx: 30,
        entrance: "slideUp",
        paddingY: "lg",
      },
    },
    propOverrides: {
      "gallery.marquee": {
        showCaptions: false,
        showTitle: false,
        tileSize: "lg",
        speedMs: 28000,
      },
      "reviews.strip": { limit: 8 },
    },
  },
  {
    id: "editorial",
    name: "Editorial Heat",
    tagline: "Magazín — rose soft, foto split, bento, overlay",
    previewHint: "Rose · Bento",
    swatch: "from-rose-500 via-orange-400 to-amber-300",
    tier: "premium",
    theme: {
      accent: "rose",
      cardLayout: "flush",
      bgStyle: "spotlight",
      atmosphere: "haze",
      surface: "soft",
      radius: "xl",
      density: "airy",
      heroStyle: "split",
      titleWeight: "semibold",
      glow: true,
      motion: "subtle",
      sectionDividers: true,
    },
    sectionTemplateIds: [
      "hero.cover",
      "text.photoRight",
      "about.split",
      "gallery.bento",
      "text.overlay",
      "calendar.card",
      "reviews.spotlight",
      "faq.columns",
      "cta.split",
    ],
    styleOverrides: {
      "hero.cover": {
        align: "left",
        titleSizePx: 38,
        bodySizePx: 15,
        entrance: "fade",
        paddingY: "lg",
      },
      "text.photoRight": {
        align: "left",
        titleSizePx: 28,
        bodySizePx: 16,
        entrance: "slideUp",
        paddingY: "lg",
        contentHeight: "fixed",
        contentHeightPx: 320,
      },
      "text.overlay": {
        align: "center",
        titleSizePx: 30,
        bodySizePx: 16,
        entrance: "fade",
        paddingY: "md",
        contentHeight: "fixed",
        contentHeightPx: 360,
      },
      "about.split": {
        align: "center",
        titleSizePx: 26,
        bodySizePx: 17,
        entrance: "fade",
        paddingY: "md",
      },
      "gallery.bento": {
        align: "left",
        titleSizePx: 24,
        entrance: "slideUp",
        paddingY: "lg",
      },
      "reviews.spotlight": {
        align: "center",
        titleSizePx: 22,
        entrance: "fade",
        paddingY: "lg",
      },
    },
    propOverrides: {
      "text.photoRight": {
        photoWidth: "md",
        photoAspect: "portrait",
        contentLayout: "side",
        showImageCaption: true,
      },
      "text.overlay": { titlePosition: "bottom", showCover: true },
      "gallery.bento": { showCaptions: true, limit: 5 },
      "reviews.spotlight": { limit: 1 },
    },
  },
  {
    id: "lounge",
    name: "Emerald Velvet",
    tagline: "Lounge luxury — emerald glass, weeks calendar, pills",
    previewHint: "Emerald · Luxe",
    swatch: "from-emerald-600 via-teal-400 to-cyan-300",
    tier: "free",
    theme: {
      accent: "emerald",
      cardLayout: "floating",
      bgStyle: "horizon",
      atmosphere: "haze",
      surface: "glass",
      radius: "xl",
      density: "comfortable",
      heroStyle: "immersive",
      titleWeight: "bold",
      glow: true,
      motion: "subtle",
      sectionDividers: false,
    },
    sectionTemplateIds: [
      "hero.cover",
      "about.simple",
      "gallery.grid3",
      "text.photoLeft",
      "packages.list",
      "media.stack",
      "calendar.weeks",
      "reviews.list",
      "faq.stack",
      "contact.pill",
      "cta.banner",
    ],
    styleOverrides: {
      "hero.cover": {
        align: "center",
        titleSizePx: 40,
        bodySizePx: 16,
        entrance: "fade",
        paddingY: "lg",
      },
      "gallery.grid3": {
        align: "center",
        titleSizePx: 22,
        entrance: "slideUp",
        paddingY: "md",
      },
      "text.photoLeft": {
        align: "left",
        titleSizePx: 26,
        bodySizePx: 16,
        entrance: "slideUp",
        paddingY: "lg",
        contentHeight: "fixed",
        contentHeightPx: 300,
      },
      "about.simple": {
        align: "center",
        titleSizePx: 24,
        bodySizePx: 16,
        entrance: "slideUp",
        paddingY: "md",
      },
      "calendar.weeks": {
        align: "center",
        titleSizePx: 22,
        entrance: "fade",
        paddingY: "md",
      },
    },
    propOverrides: {
      "text.photoLeft": {
        photoWidth: "lg",
        photoAspect: "portrait",
        contentLayout: "stack",
        showImageCaption: false,
      },
      "gallery.grid3": { showCaptions: false },
    },
  },
  {
    id: "cinema",
    name: "Cinema Gold",
    tagline: "Showreel — amber beam, filmstrip, bento, bold type",
    previewHint: "Amber · Bold",
    swatch: "from-amber-500 via-orange-500 to-yellow-300",
    tier: "premium",
    theme: {
      accent: "amber",
      cardLayout: "floating",
      bgStyle: "beam",
      atmosphere: "dust",
      surface: "solid",
      radius: "xl",
      density: "comfortable",
      heroStyle: "poster",
      titleWeight: "black",
      glow: true,
      motion: "lively",
      sectionDividers: false,
    },
    sectionTemplateIds: [
      "hero.centered",
      "media.filmstrip",
      "text.feature",
      "gallery.bento",
      "packages.highlight",
      "reviews.strip",
      "calendar.weeks",
      "contact.cards",
      "cta.split",
    ],
    styleOverrides: {
      "hero.centered": {
        align: "center",
        titleSizePx: 48,
        bodySizePx: 16,
        entrance: "slideUp",
        paddingY: "lg",
      },
      "text.feature": {
        align: "center",
        titleSizePx: 34,
        bodySizePx: 17,
        entrance: "fade",
        paddingY: "lg",
      },
      "media.filmstrip": {
        align: "center",
        titleSizePx: 22,
        entrance: "fade",
        paddingY: "md",
      },
      "gallery.bento": {
        align: "center",
        titleSizePx: 22,
        entrance: "slideUp",
        paddingY: "md",
      },
      "reviews.strip": {
        align: "left",
        titleSizePx: 22,
        entrance: "fade",
        paddingY: "md",
      },
      "cta.split": {
        align: "left",
        titleSizePx: 30,
        entrance: "slideUp",
        paddingY: "lg",
      },
    },
    propOverrides: {
      "gallery.bento": { showCaptions: false, limit: 5 },
      "reviews.strip": { limit: 6 },
      "media.filmstrip": { title: "Showreel" },
    },
  },
];

export function getPreset(id: string): PagePreset | undefined {
  return PAGE_PRESETS.find((p) => p.id === id);
}

export function applyPagePreset(
  presetId: PagePresetId,
  seed?: PresetSeed
): { theme: PageTheme; sections: PageSection[] } {
  const preset = getPreset(presetId) ?? PAGE_PRESETS[0]!;
  const sections = preset.sectionTemplateIds
    .map((templateId) => {
      const section = createSectionFromTemplate(templateId, seed);
      if (!section) return null;
      const override = preset.styleOverrides?.[templateId];
      if (override) {
        section.style = defaultSectionStyle({
          ...section.style,
          ...override,
        });
      }
      const props = preset.propOverrides?.[templateId];
      if (props) {
        section.props = { ...section.props, ...props };
      }
      return section;
    })
    .filter((s): s is PageSection => Boolean(s));

  return {
    theme: { ...preset.theme },
    sections: ensureRequiredSections(sections, seed),
  };
}
