export type PageAccent =
  | "violet"
  | "rose"
  | "emerald"
  | "amber"
  | "sky"
  | "cyan"
  | "fuchsia"
  | "orange";
export type PageCardLayout = "cards" | "stacked" | "floating" | "flush";
export type PageStatus = "draft" | "published";
export type PageBgStyle =
  | "dark"
  | "gradient"
  | "mesh"
  | "spotlight"
  | "radial"
  | "vignette"
  | "beam"
  | "horizon";
export type PageAtmosphere =
  | "none"
  | "aurora"
  | "grid"
  | "orbs"
  | "haze"
  | "stars"
  | "scanlines"
  | "dust";
export type PageSurface = "glass" | "solid" | "outline" | "soft" | "neon";
export type PageRadius = "sm" | "md" | "xl" | "pill";
export type PageDensity = "compact" | "comfortable" | "airy";
export type PageHeroStyle =
  | "classic"
  | "overlap"
  | "immersive"
  | "split"
  | "poster";
export type PageTitleWeight = "medium" | "semibold" | "bold" | "black";
export type PageMotion = "static" | "subtle" | "lively";

export type PageTheme = {
  accent: PageAccent;
  cardLayout: PageCardLayout;
  bgStyle: PageBgStyle;
  atmosphere: PageAtmosphere;
  surface: PageSurface;
  radius: PageRadius;
  density: PageDensity;
  heroStyle: PageHeroStyle;
  titleWeight: PageTitleWeight;
  glow: boolean;
  motion: PageMotion;
  /** Hairline rules between sections (Editorial Heat, etc.) */
  sectionDividers: boolean;
};

export type SectionType =
  | "hero"
  | "about"
  | "text"
  | "gallery"
  | "media"
  | "packages"
  | "reviews"
  | "faq"
  | "contact"
  | "cta"
  | "calendar";

export type SectionAlign = "left" | "center" | "right";
/** @deprecated use titleSizePx */
export type TitleSize = "sm" | "md" | "lg" | "xl";
export type Entrance = "none" | "fade" | "slideUp";
export type PaddingY = "sm" | "md" | "lg";
/** auto = content-driven; fixed = contentHeightPx */
export type SectionContentHeight = "auto" | "fixed";

/** Per-section bubble / card background */
export type SectionSurfaceBg =
  | "theme"
  | "transparent"
  | "glass"
  | "solid"
  | "soft"
  | "dark"
  | "accent";

export type SectionStyle = {
  align: SectionAlign;
  /** Title font size in px */
  titleSizePx: number;
  /** Body / paragraph font size in px */
  bodySizePx: number;
  entrance: Entrance;
  paddingY: PaddingY;
  /** auto or fixed pixel height */
  contentHeight: SectionContentHeight;
  /** Used when contentHeight === "fixed" */
  contentHeightPx: number;
  /** Bubble background (overrides theme surface when not "theme") */
  surfaceBg: SectionSurfaceBg;
  /** Bubble fill opacity 0–100 */
  surfaceOpacity: number;
  /** @deprecated migrated to titleSizePx */
  titleSize?: TitleSize;
};

export type MediaItem = {
  id: string;
  url: string;
  caption: string;
};

export type PackageItem = {
  id: string;
  name: string;
  price: string;
  description: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type GallerySource = "profile" | "custom";

export type PageSection = {
  id: string;
  type: SectionType;
  templateId: string;
  visible: boolean;
  style: SectionStyle;
  props: Record<string, unknown>;
};

/** @deprecated old v1 shape — used only for migration */
export type LegacyPageBlock = {
  id: string;
  type: string;
  visible: boolean;
  props: Record<string, unknown>;
};

export type DjPageRecord = {
  dj_id: string;
  status: PageStatus;
  theme: PageTheme;
  sections: PageSection[];
  published_sections: PageSection[] | null;
  published_theme: PageTheme | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

/** Draft sa líši od verejnej verzie (alebo ešte nikdy nebola publikovaná). */
export function hasUnpublishedPageChanges(page: {
  status: PageStatus;
  theme: PageTheme;
  sections: PageSection[];
  published_sections: PageSection[] | null;
  published_theme: PageTheme | null;
}): boolean {
  if (page.status !== "published") return true;
  if (!page.published_sections?.length || !page.published_theme) return true;
  return (
    JSON.stringify(page.sections) !== JSON.stringify(page.published_sections) ||
    JSON.stringify(page.theme) !== JSON.stringify(page.published_theme)
  );
}

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  hero: "Hero / úvod",
  about: "O mne",
  text: "Text / obsah",
  gallery: "Fotogaléria",
  media: "Video",
  packages: "Balíčky / cenník",
  reviews: "Recenzie",
  faq: "FAQ",
  contact: "Kontakt",
  cta: "Rezervácia (CTA)",
  calendar: "Kalendár",
};

export const ACCENT_CLASSES: Record<
  PageAccent,
  { text: string; bg: string; border: string; gradient: string }
> = {
  violet: {
    text: "text-violet-300",
    bg: "bg-violet-500",
    border: "border-violet-500/40",
    gradient: "from-violet-500 to-fuchsia-500",
  },
  rose: {
    text: "text-rose-300",
    bg: "bg-rose-500",
    border: "border-rose-500/40",
    gradient: "from-rose-500 to-orange-400",
  },
  emerald: {
    text: "text-emerald-300",
    bg: "bg-emerald-500",
    border: "border-emerald-500/40",
    gradient: "from-emerald-500 to-teal-400",
  },
  amber: {
    text: "text-amber-300",
    bg: "bg-amber-500",
    border: "border-amber-500/40",
    gradient: "from-amber-500 to-orange-500",
  },
  sky: {
    text: "text-sky-300",
    bg: "bg-sky-500",
    border: "border-sky-500/40",
    gradient: "from-sky-500 to-blue-500",
  },
  cyan: {
    text: "text-cyan-300",
    bg: "bg-cyan-500",
    border: "border-cyan-500/40",
    gradient: "from-cyan-500 to-teal-400",
  },
  fuchsia: {
    text: "text-fuchsia-300",
    bg: "bg-fuchsia-500",
    border: "border-fuchsia-500/40",
    gradient: "from-fuchsia-500 to-pink-500",
  },
  orange: {
    text: "text-orange-300",
    bg: "bg-orange-500",
    border: "border-orange-500/40",
    gradient: "from-orange-500 to-amber-400",
  },
};

/** OKLCH components for CSS vars on the page shell */
export const ACCENT_OKLCH: Record<PageAccent, string> = {
  violet: "0.62 0.25 295",
  rose: "0.66 0.2 15",
  emerald: "0.68 0.17 165",
  amber: "0.78 0.16 75",
  sky: "0.72 0.14 230",
  cyan: "0.74 0.14 195",
  fuchsia: "0.66 0.28 330",
  orange: "0.72 0.18 45",
};

export const TITLE_SIZE_PX_LEGACY: Record<TitleSize, number> = {
  sm: 16,
  md: 20,
  lg: 26,
  xl: 34,
};

export const TITLE_SIZE_CLASS: Record<TitleSize, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl sm:text-2xl",
  xl: "text-2xl sm:text-3xl",
};

export const ALIGN_CLASS: Record<SectionAlign, string> = {
  left: "text-left items-start",
  center: "text-center items-center",
  right: "text-right items-end",
};

export const PADDING_Y_CLASS: Record<PaddingY, string> = {
  sm: "py-2 sm:py-3",
  md: "py-6 sm:py-8",
  lg: "py-12 sm:py-16",
};

/** Legacy preset → px (for older drafts) */
const LEGACY_HEIGHT_PX: Record<string, number> = {
  sm: 180,
  md: 280,
  lg: 380,
  xl: 500,
};

export function clampSectionHeightPx(value: unknown, fallback = 280) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(900, Math.max(80, Math.round(n)));
}

export function clampFontPx(value: unknown, fallback: number, min = 12, max = 72) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function clampOpacityPct(value: unknown, fallback = 100) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultTheme(): PageTheme {
  return {
    accent: "violet",
    cardLayout: "cards",
    bgStyle: "gradient",
    atmosphere: "aurora",
    surface: "glass",
    radius: "xl",
    density: "comfortable",
    heroStyle: "classic",
    titleWeight: "bold",
    glow: true,
    motion: "subtle",
    sectionDividers: false,
  };
}

export function defaultSectionStyle(
  partial?: Partial<SectionStyle>
): SectionStyle {
  const legacy =
    partial?.titleSize && TITLE_SIZE_PX_LEGACY[partial.titleSize]
      ? TITLE_SIZE_PX_LEGACY[partial.titleSize]
      : undefined;
  return {
    align: partial?.align ?? "left",
    titleSizePx: clampFontPx(
      partial?.titleSizePx ?? legacy,
      22
    ),
    bodySizePx: clampFontPx(partial?.bodySizePx, 15),
    entrance: partial?.entrance ?? "fade",
    paddingY: partial?.paddingY ?? "md",
    surfaceBg: (() => {
      const v = partial?.surfaceBg as string | undefined;
      const allowed: SectionSurfaceBg[] = [
        "theme",
        "transparent",
        "glass",
        "solid",
        "soft",
        "dark",
        "accent",
      ];
      return allowed.includes(v as SectionSurfaceBg)
        ? (v as SectionSurfaceBg)
        : "theme";
    })(),
    surfaceOpacity: clampOpacityPct(partial?.surfaceOpacity, 100),
    ...normalizeContentHeight(partial),
  };
}

function normalizeContentHeight(partial?: Partial<SectionStyle>): {
  contentHeight: SectionContentHeight;
  contentHeightPx: number;
} {
  const raw = partial?.contentHeight as string | undefined;
  if (raw && raw in LEGACY_HEIGHT_PX) {
    return {
      contentHeight: "fixed",
      contentHeightPx: LEGACY_HEIGHT_PX[raw]!,
    };
  }
  if (raw === "fixed") {
    return {
      contentHeight: "fixed",
      contentHeightPx: clampSectionHeightPx(partial?.contentHeightPx, 280),
    };
  }
  return {
    contentHeight: "auto",
    contentHeightPx: clampSectionHeightPx(partial?.contentHeightPx, 280),
  };
}

export function normalizeTheme(raw: unknown): PageTheme {
  const base = defaultTheme();
  if (!raw || typeof raw !== "object") return base;
  const t = raw as Partial<PageTheme>;
  const accents: PageAccent[] = [
    "violet",
    "rose",
    "emerald",
    "amber",
    "sky",
    "cyan",
    "fuchsia",
    "orange",
  ];
  const bgStyles: PageBgStyle[] = [
    "dark",
    "gradient",
    "mesh",
    "spotlight",
    "radial",
    "vignette",
    "beam",
    "horizon",
  ];
  const atmospheres: PageAtmosphere[] = [
    "none",
    "aurora",
    "grid",
    "orbs",
    "haze",
    "stars",
    "scanlines",
    "dust",
  ];
  const surfaces: PageSurface[] = ["glass", "solid", "outline", "soft", "neon"];
  const radii: PageRadius[] = ["sm", "md", "xl", "pill"];
  const densities: PageDensity[] = ["compact", "comfortable", "airy"];
  const layouts: PageCardLayout[] = ["cards", "stacked", "floating", "flush"];
  const heroStyles: PageHeroStyle[] = [
    "classic",
    "overlap",
    "immersive",
    "split",
    "poster",
  ];
  const weights: PageTitleWeight[] = ["medium", "semibold", "bold", "black"];
  const motions: PageMotion[] = ["static", "subtle", "lively"];

  return {
    accent: accents.includes(t.accent as PageAccent)
      ? (t.accent as PageAccent)
      : base.accent,
    cardLayout: layouts.includes(t.cardLayout as PageCardLayout)
      ? (t.cardLayout as PageCardLayout)
      : base.cardLayout,
    bgStyle: bgStyles.includes(t.bgStyle as PageBgStyle)
      ? (t.bgStyle as PageBgStyle)
      : base.bgStyle,
    atmosphere: atmospheres.includes(t.atmosphere as PageAtmosphere)
      ? (t.atmosphere as PageAtmosphere)
      : base.atmosphere,
    surface: surfaces.includes(t.surface as PageSurface)
      ? (t.surface as PageSurface)
      : base.surface,
    radius: (() => {
      const r = t.radius as string | undefined;
      if (r === "2xl") return "xl";
      return radii.includes(r as PageRadius) ? (r as PageRadius) : base.radius;
    })(),
    density: densities.includes(t.density as PageDensity)
      ? (t.density as PageDensity)
      : base.density,
    heroStyle: heroStyles.includes(t.heroStyle as PageHeroStyle)
      ? (t.heroStyle as PageHeroStyle)
      : base.heroStyle,
    titleWeight: weights.includes(t.titleWeight as PageTitleWeight)
      ? (t.titleWeight as PageTitleWeight)
      : base.titleWeight,
    glow: typeof t.glow === "boolean" ? t.glow : base.glow,
    motion: motions.includes(t.motion as PageMotion)
      ? (t.motion as PageMotion)
      : base.motion,
    sectionDividers:
      typeof t.sectionDividers === "boolean"
        ? t.sectionDividers
        : base.sectionDividers,
  };
}

export function isPageSection(value: unknown): value is PageSection {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.type === "string" &&
    typeof s.templateId === "string" &&
    typeof s.visible === "boolean" &&
    typeof s.props === "object" &&
    s.props !== null
  );
}

export function normalizeSections(raw: unknown): PageSection[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPageSection).map((s) => ({
    ...s,
    style: defaultSectionStyle(
      s.style && typeof s.style === "object"
        ? (s.style as Partial<SectionStyle>)
        : undefined
    ),
  }));
}

/** Migrate v1 blocks (no templateId) → v2 sections */
export function migrateLegacyBlocks(raw: unknown): PageSection[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (raw.some(isPageSection)) return normalizeSections(raw);

  const out: PageSection[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const b = item as LegacyPageBlock;
    if (typeof b.id !== "string" || typeof b.type !== "string") continue;
    const visible = Boolean(b.visible);
    const props = b.props && typeof b.props === "object" ? b.props : {};
    const style = defaultSectionStyle();

    switch (b.type) {
      case "hero":
        out.push({
          id: b.id,
          type: "hero",
          templateId: "hero.cover",
          visible,
          style: { ...style, align: "left", titleSizePx: 34 },
          props: {
            headline: String(props.headline ?? ""),
            subheadline: String(props.subheadline ?? ""),
            showCover: props.showCover !== false,
            ctaLabel: String(props.ctaLabel ?? "Nezáväzná rezervácia"),
          },
        });
        break;
      case "bio":
        out.push({
          id: b.id,
          type: "about",
          templateId: "about.simple",
          visible,
          style,
          props: {
            title: String(props.title ?? "O mne"),
            body: String(props.body ?? ""),
            useProfileBio: props.useProfileBio !== false,
          },
        });
        break;
      case "gallery":
        out.push({
          id: b.id,
          type: "gallery",
          templateId:
            props.layout === "list" ? "gallery.grid" : "gallery.grid",
          visible,
          style,
          props: {
            title: String(props.title ?? "Galéria"),
            source: "profile" as GallerySource,
            limit: Number(props.limit) || 12,
            speedMs: 4000,
            items: [] as MediaItem[],
          },
        });
        break;
      case "media":
        out.push({
          id: b.id,
          type: "media",
          templateId: "media.stack",
          visible,
          style,
          props: { title: String(props.title ?? "Ukážky") },
        });
        break;
      case "packages":
        out.push({
          id: b.id,
          type: "packages",
          templateId: "packages.cards",
          visible,
          style,
          props: {
            title: String(props.title ?? "Balíčky"),
            items: Array.isArray(props.items) ? props.items : [],
          },
        });
        break;
      case "reviews":
        out.push({
          id: b.id,
          type: "reviews",
          templateId: "reviews.list",
          visible,
          style,
          props: {
            title: String(props.title ?? "Recenzie"),
            limit: Number(props.limit) || 6,
          },
        });
        break;
      case "faq":
        out.push({
          id: b.id,
          type: "faq",
          templateId: "faq.accordion",
          visible,
          style,
          props: {
            title: String(props.title ?? "FAQ"),
            items: Array.isArray(props.items) ? props.items : [],
          },
        });
        break;
      case "contact":
        out.push({
          id: b.id,
          type: "contact",
          templateId: "contact.simple",
          visible,
          style,
          props: {
            title: String(props.title ?? "Kontakt"),
            showSocials: props.showSocials !== false,
            showLocation: props.showLocation !== false,
          },
        });
        break;
      case "cta":
        out.push({
          id: b.id,
          type: "cta",
          templateId: "cta.banner",
          visible,
          style: { ...style, align: "center" },
          props: {
            title: String(props.title ?? "Pripravení?"),
            label: String(props.label ?? "Poslať dopyt"),
            buttonStyle: props.style === "outline" ? "outline" : "solid",
          },
        });
        break;
      default:
        break;
    }
  }
  return out;
}

export function loadSectionsFromDb(raw: unknown): PageSection[] {
  const migrated = migrateLegacyBlocks(raw);
  return migrated.length ? migrated : [];
}

// Back-compat aliases used by older imports during transition
export type PageBlock = PageSection;
export const newBlockId = newId;
export const BLOCK_TYPE_LABELS = SECTION_TYPE_LABELS;
export function normalizeBlocks(raw: unknown): PageSection[] {
  return loadSectionsFromDb(raw);
}
