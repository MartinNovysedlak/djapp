import {
  ACCENT_CLASSES,
  ACCENT_OKLCH,
  type PageAccent,
  type PageDensity,
  type PageRadius,
  type PageTheme,
  type PageTitleWeight,
} from "@/lib/page-builder/types";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

export function themeAccentStyle(accent: PageAccent): CSSProperties {
  const oklch = ACCENT_OKLCH[accent];
  return {
    ["--page-accent" as string]: `oklch(${oklch})`,
    ["--page-accent-soft" as string]: `oklch(${oklch} / 0.42)`,
    ["--page-accent-glow" as string]: `oklch(${oklch} / 0.55)`,
    ["--page-accent-dim" as string]: `oklch(${oklch} / 0.18)`,
  };
}

export function themeBgClass(theme: PageTheme): string {
  switch (theme.bgStyle) {
    case "mesh":
      return "bg-[#06060b] page-bg-mesh";
    case "spotlight":
      return "bg-[#050508] page-bg-spotlight";
    case "radial":
      return "bg-[#08080c] page-bg-radial";
    case "vignette":
      return "bg-[#0c0c10] page-bg-vignette";
    case "beam":
      return "bg-[#07070a] page-bg-beam";
    case "horizon":
      return "bg-[#08080c] page-bg-horizon";
    case "gradient":
      return "page-bg-gradient";
    default:
      return "bg-[#0A0A0A]";
  }
}

/** Clear visual steps: sharp → soft → soft+ → pill */
export function themeRadiusClass(radius: PageRadius): string {
  switch (radius) {
    case "sm":
      return "rounded-md";
    case "md":
      return "rounded-2xl";
    case "pill":
      return "rounded-[2.75rem]";
    case "xl":
    default:
      return "rounded-[1.75rem]";
  }
}

export function themeRadiusTopClass(radius: PageRadius): string {
  switch (radius) {
    case "sm":
      return "rounded-t-md";
    case "md":
      return "rounded-t-2xl";
    case "pill":
      return "rounded-t-[2.75rem]";
    case "xl":
    default:
      return "rounded-t-[1.75rem]";
  }
}

export function themeBleedClass(theme: PageTheme): string {
  if (theme.cardLayout === "stacked" || theme.cardLayout === "flush") {
    return cn("relative overflow-hidden", themeRadiusClass(theme.radius));
  }
  switch (theme.density) {
    case "compact":
      return cn(
        "relative -mx-3 -mt-3 overflow-hidden sm:-mx-4 sm:-mt-4",
        themeRadiusTopClass(theme.radius)
      );
    case "airy":
      return cn(
        "relative -mx-7 -mt-6 overflow-hidden sm:-mx-10 sm:-mt-8",
        themeRadiusTopClass(theme.radius)
      );
    default:
      return cn(
        "relative -mx-5 -mt-5 overflow-hidden sm:-mx-7 sm:-mt-7",
        themeRadiusTopClass(theme.radius)
      );
  }
}

/** Compact = almost touching; airy = lots of air */
export function themeDensityGap(
  density: PageDensity,
  layout: PageTheme["cardLayout"]
): string {
  if (layout === "floating") {
    switch (density) {
      case "compact":
        return "gap-2 sm:gap-3";
      case "airy":
        return "gap-14 sm:gap-20";
      default:
        return "gap-7 sm:gap-10";
    }
  }
  if (layout === "flush") {
    switch (density) {
      case "compact":
        return "gap-0";
      case "airy":
        return "gap-10 sm:gap-14";
      default:
        return "gap-4 sm:gap-5";
    }
  }
  switch (density) {
    case "compact":
      return "gap-1 sm:gap-1.5";
    case "airy":
      return "gap-12 sm:gap-16";
    default:
      return "gap-5 sm:gap-6";
  }
}

export function themeDensityPad(density: PageDensity): string {
  switch (density) {
    case "compact":
      return "px-3 sm:px-4";
    case "airy":
      return "px-7 sm:px-11";
    default:
      return "px-5 sm:px-7";
  }
}

/**
 * Hero card shell: edge-to-edge media (like /djs katalog card).
 * No padding — cover sits flush; content pads itself.
 */
export function themeHeroShellClass(
  theme: PageTheme,
  accent: (typeof ACCENT_CLASSES)[PageAccent]
): string {
  const radius = themeRadiusClass(theme.radius);
  const glow = theme.glow
    ? "shadow-[0_24px_70px_-36px_var(--page-accent-glow)]"
    : "shadow-[0_20px_50px_-40px_oklch(0_0_0/0.75)]";

  if (theme.cardLayout === "stacked") {
    return "overflow-hidden border-b border-white/10 pb-8 last:border-b-0";
  }

  if (theme.cardLayout === "flush") {
    return "overflow-hidden";
  }

  const base = cn(radius, "overflow-hidden p-0");

  if (theme.cardLayout === "floating") {
    const floatGlow = theme.glow
      ? "shadow-[0_32px_90px_-28px_var(--page-accent-glow)]"
      : "shadow-[0_28px_70px_-36px_oklch(0_0_0/0.85)]";
    switch (theme.surface) {
      case "solid":
        return cn(base, floatGlow, "border border-white/10 bg-card");
      case "outline":
        return cn(base, "border border-white/15 bg-black/30 backdrop-blur-md");
      case "soft":
        return cn(base, floatGlow, "border border-white/5 bg-white/[0.05]");
      case "neon":
        return cn(
          base,
          accent.border,
          "border bg-black/60 backdrop-blur-xl",
          theme.glow &&
            "shadow-[0_0_64px_-10px_var(--page-accent-glow)]"
        );
      default:
        return cn(
          base,
          floatGlow,
          "border border-white/12 bg-card/85 backdrop-blur-2xl"
        );
    }
  }

  switch (theme.surface) {
    case "solid":
      return cn(base, glow, "border border-white/10 bg-card");
    case "outline":
      return cn(base, "border border-white/15 bg-transparent backdrop-blur-sm");
    case "soft":
      return cn(base, theme.glow ? glow : "", "border border-white/5 bg-white/[0.04]");
    case "neon":
      return cn(
        base,
        accent.border,
        "border bg-black/55 backdrop-blur-xl",
        theme.glow && "shadow-[0_0_56px_-8px_var(--page-accent-glow)]"
      );
    case "glass":
    default:
      return cn(
        base,
        glow,
        "border border-white/10 bg-card/70 backdrop-blur-xl"
      );
  }
}

export function themeTitleWeightClass(weight: PageTitleWeight): string {
  switch (weight) {
    case "medium":
      return "font-medium";
    case "semibold":
      return "font-semibold";
    case "black":
      return "font-black tracking-tight";
    default:
      return "font-bold tracking-tight";
  }
}

export function themeSurfaceClass(
  theme: PageTheme,
  accent: (typeof ACCENT_CLASSES)[PageAccent]
): string {
  const radius = themeRadiusClass(theme.radius);
  const pad = themeDensityPad(theme.density);
  const glow = theme.glow
    ? "shadow-[0_24px_70px_-36px_var(--page-accent-glow)]"
    : "shadow-[0_20px_50px_-40px_oklch(0_0_0/0.75)]";

  if (theme.cardLayout === "stacked") {
    return cn(
      "border-b border-white/10 py-8 last:border-b-0",
      pad,
      "bg-transparent"
    );
  }

  if (theme.cardLayout === "flush") {
    return cn(pad, "border-0 bg-transparent shadow-none");
  }

  if (theme.cardLayout === "floating") {
    const floatGlow = theme.glow
      ? "shadow-[0_32px_90px_-28px_var(--page-accent-glow)]"
      : "shadow-[0_28px_70px_-36px_oklch(0_0_0/0.85)]";
    const base = cn(radius, pad, floatGlow);
    switch (theme.surface) {
      case "solid":
        return cn(base, "border border-white/10 bg-card");
      case "outline":
        return cn(base, "border border-white/15 bg-black/30 backdrop-blur-md");
      case "soft":
        return cn(base, "border border-white/5 bg-white/[0.05]");
      case "neon":
        return cn(
          base,
          accent.border,
          "border bg-black/60 backdrop-blur-xl",
          theme.glow &&
            "shadow-[0_0_64px_-10px_var(--page-accent-glow),0_28px_70px_-36px_oklch(0_0_0/0.7)]"
        );
      case "glass":
      default:
        return cn(base, "border border-white/12 bg-card/85 backdrop-blur-2xl");
    }
  }

  switch (theme.surface) {
    case "solid":
      return cn(radius, pad, glow, "border border-white/10 bg-card");
    case "outline":
      return cn(
        radius,
        pad,
        "border border-white/15 bg-transparent backdrop-blur-sm"
      );
    case "soft":
      return cn(
        radius,
        pad,
        theme.glow ? glow : "",
        "border border-white/5 bg-white/[0.04]"
      );
    case "neon":
      return cn(
        radius,
        pad,
        accent.border,
        "border bg-black/55 backdrop-blur-xl",
        theme.glow
          ? "shadow-[0_0_56px_-8px_var(--page-accent-glow),inset_0_1px_0_oklch(1_0_0/0.08)]"
          : "shadow-none"
      );
    case "glass":
    default:
      return cn(
        radius,
        pad,
        glow,
        "border border-white/10 bg-card/70 backdrop-blur-xl"
      );
  }
}

/**
 * Structure only (radius / pad / border / shadow) — no Tailwind background.
 * Use with inline bubble fill so opacity/style controls always win.
 */
export function themeSurfaceStructureClass(
  theme: PageTheme,
  accent: (typeof ACCENT_CLASSES)[PageAccent],
  opts?: { forceCardChrome?: boolean }
): string {
  const radius = themeRadiusClass(theme.radius);
  const pad = themeDensityPad(theme.density);
  const glow = theme.glow
    ? "shadow-[0_24px_70px_-36px_var(--page-accent-glow)]"
    : "shadow-[0_20px_50px_-40px_oklch(0_0_0/0.75)]";
  const force = opts?.forceCardChrome === true;

  if (!force && theme.cardLayout === "stacked") {
    return cn("border-b border-white/10 py-8 last:border-b-0", pad);
  }

  if (!force && theme.cardLayout === "flush") {
    return cn(pad, "border-0 shadow-none");
  }

  if (theme.cardLayout === "floating" || force) {
    const floatGlow = theme.glow
      ? "shadow-[0_32px_90px_-28px_var(--page-accent-glow)]"
      : "shadow-[0_28px_70px_-36px_oklch(0_0_0/0.85)]";
    return cn(
      radius,
      pad,
      floatGlow,
      theme.surface === "neon" ? cn("border", accent.border) : "border border-white/12"
    );
  }

  return cn(
    radius,
    pad,
    glow,
    theme.surface === "neon" ? cn("border", accent.border) : "border border-white/10"
  );
}

export function themeCtaBandClass(
  theme: PageTheme,
  accent: (typeof ACCENT_CLASSES)[PageAccent]
): string {
  const radius = themeRadiusClass(theme.radius);
  return cn(
    radius,
    "relative overflow-hidden border p-6 sm:p-8",
    accent.border,
    "bg-gradient-to-br from-[color-mix(in_oklab,var(--page-accent)_18%,transparent)] via-black/40 to-black/20 backdrop-blur-md"
  );
}

/** First usable photo from profile (cover → gallery → avatar). */
export function resolveProfilePhoto(
  profile: {
    cover_url?: string | null;
    avatar_url?: string | null;
    gallery_urls?: string[] | null;
  },
  preferred?: string | null
): string | null {
  const pick = (url?: string | null) => {
    const t = url?.trim();
    return t || null;
  };
  return (
    pick(preferred) ||
    pick(profile.cover_url) ||
    (profile.gallery_urls ?? []).map(pick).find(Boolean) ||
    pick(profile.avatar_url) ||
    null
  );
}
