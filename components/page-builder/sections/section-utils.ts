import type { CSSProperties } from "react";
import {
  ALIGN_CLASS,
  PADDING_Y_CLASS,
  clampOpacityPct,
  clampSectionHeightPx,
  type Entrance,
  type PageSection,
  type PageTheme,
  type SectionStyle,
  type SectionSurfaceBg,
} from "@/lib/page-builder/types";
import { cn } from "@/lib/utils";

export function sectionTitleStyle(style: SectionStyle): CSSProperties {
  return { fontSize: `${style.titleSizePx}px`, lineHeight: 1.25 };
}

export function sectionBodyStyle(style: SectionStyle): CSSProperties {
  return { fontSize: `${style.bodySizePx}px`, lineHeight: 1.65 };
}

/** @deprecated prefer sectionTitleStyle */
export function sectionTitleClass() {
  return cn("text-white");
}

export function sectionAlignClass(style: SectionStyle) {
  return ALIGN_CLASS[style.align];
}

export function sectionPadClass(style: SectionStyle) {
  return PADDING_Y_CLASS[style.paddingY];
}

export function hasLockedSectionHeight(style: SectionStyle) {
  return (style.contentHeight ?? "auto") === "fixed";
}

/** Classes for fixed-height section "window". Pair with sectionHeightStyle(). */
export function sectionHeightClass(style: SectionStyle) {
  if (!hasLockedSectionHeight(style)) return "";
  return "flex flex-col overflow-hidden min-h-0";
}

export function sectionHeightStyle(
  style: SectionStyle
): CSSProperties | undefined {
  if (!hasLockedSectionHeight(style)) return undefined;
  const px = clampSectionHeightPx(style.contentHeightPx, 280);
  return { height: `${px}px` };
}

type BubbleFillKind =
  | "transparent"
  | "glass"
  | "solid"
  | "soft"
  | "dark"
  | "outline"
  | "neon"
  | "accent";

function resolveBubbleKind(
  surfaceBg: SectionSurfaceBg,
  theme: PageTheme
): BubbleFillKind {
  if (surfaceBg === "transparent") return "transparent";
  if (surfaceBg === "glass") return "glass";
  if (surfaceBg === "solid") return "solid";
  if (surfaceBg === "soft") return "soft";
  if (surfaceBg === "dark") return "dark";
  if (surfaceBg === "accent") return "accent";

  // surfaceBg === "theme"
  if (theme.cardLayout === "flush" || theme.cardLayout === "stacked") {
    return "transparent";
  }

  switch (theme.surface) {
    case "solid":
      return "solid";
    case "soft":
      return "soft";
    case "outline":
      return "outline";
    case "neon":
      return "neon";
    case "glass":
    default:
      return "glass";
  }
}

/** True when section should use structure shell + inline fill (not Tailwind bg). */
export function sectionUsesBubbleFill(
  style: SectionStyle,
  _theme: PageTheme
): boolean {
  // Always — so style + opacity controls never fight Tailwind bg utilities
  void style;
  void _theme;
  return true;
}

/** Whether fill is visibly a "card" (needs border/radius chrome). */
export function sectionBubbleHasChrome(
  style: SectionStyle,
  theme: PageTheme
): boolean {
  const kind = resolveBubbleKind(style.surfaceBg ?? "theme", theme);
  return kind !== "transparent";
}

/**
 * Inline fill for the section element itself (full width/height of the bubble).
 * Opacity 0–100 scales alpha linearly.
 */
export function sectionBubbleFillStyle(
  style: SectionStyle,
  theme: PageTheme
): CSSProperties {
  const surfaceBg: SectionSurfaceBg = style.surfaceBg ?? "theme";
  const opacityPct = clampOpacityPct(style.surfaceOpacity, 100);
  const o = Math.max(0, Math.min(1, opacityPct / 100));
  const kind = resolveBubbleKind(surfaceBg, theme);

  if (kind === "transparent" || o <= 0) {
    return {
      backgroundColor: "transparent",
      backgroundImage: "none",
      backdropFilter: "none",
      WebkitBackdropFilter: "none",
    };
  }

  if (kind === "accent") {
    const mix = Math.round(18 + 42 * o);
    return {
      backgroundColor: `color-mix(in oklab, var(--page-accent-glow) ${mix}%, rgba(10,10,10,${(0.55 * o).toFixed(3)}))`,
      backgroundImage: "none",
      backdropFilter: `blur(${Math.round(8 + 12 * o)}px)`,
      WebkitBackdropFilter: `blur(${Math.round(8 + 12 * o)}px)`,
    };
  }

  const presets: Record<
    Exclude<BubbleFillKind, "transparent" | "accent">,
    { rgb: string; alpha: number; blur: number }
  > = {
    // Distinct looks so switching style is obvious
    glass: { rgb: "24, 24, 27", alpha: 0.78, blur: 22 },
    solid: { rgb: "28, 28, 32", alpha: 1, blur: 0 },
    soft: { rgb: "255, 255, 255", alpha: 0.16, blur: 16 },
    dark: { rgb: "0, 0, 0", alpha: 0.88, blur: 10 },
    outline: { rgb: "12, 12, 14", alpha: 0.35, blur: 8 },
    neon: { rgb: "8, 0, 18", alpha: 0.75, blur: 18 },
  };

  const p = presets[kind];
  const alpha = +(p.alpha * o).toFixed(3);
  const blur = p.blur > 0 ? Math.round(p.blur * (0.35 + 0.65 * o)) : 0;

  return {
    backgroundColor: `rgba(${p.rgb}, ${alpha})`,
    backgroundImage: "none",
    backdropFilter: blur ? `blur(${blur}px)` : "none",
    WebkitBackdropFilter: blur ? `blur(${blur}px)` : "none",
  };
}

export function entranceClass(entrance: Entrance) {
  if (entrance === "fade") return "page-section-enter page-section-enter-fade";
  if (entrance === "slideUp")
    return "page-section-enter page-section-enter-slide";
  return "";
}

export function textRevealClass(enabled: boolean) {
  return enabled ? "page-text-reveal" : "";
}

export function propString(
  props: Record<string, unknown>,
  key: string,
  fallback = ""
) {
  const v = props[key];
  return typeof v === "string" ? v : fallback;
}

export function propBool(
  props: Record<string, unknown>,
  key: string,
  fallback = false
) {
  const v = props[key];
  return typeof v === "boolean" ? v : fallback;
}

export function propNum(
  props: Record<string, unknown>,
  key: string,
  fallback = 0
) {
  const v = props[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export type GalleryResolvedItem = {
  id: string;
  url: string;
  caption: string;
};

export function resolveGalleryItems(
  section: PageSection,
  profileUrls: string[]
): GalleryResolvedItem[] {
  const source = propString(section.props, "source", "profile");
  const limit = propNum(section.props, "limit", 12);
  const rawItems = Array.isArray(section.props.items)
    ? (section.props.items as { id?: string; url?: string; caption?: string }[])
    : [];

  if (source === "custom") {
    return rawItems
      .filter((i) => i.url?.trim())
      .slice(0, limit || 99)
      .map((i, idx) => ({
        id: i.id || `g_${idx}`,
        url: i.url!.trim(),
        caption: i.caption?.trim() || "",
      }));
  }

  return profileUrls
    .filter(Boolean)
    .slice(0, limit || 12)
    .map((url, idx) => ({
      id: `p_${idx}`,
      url,
      caption: rawItems[idx]?.caption?.trim() || "",
    }));
}
