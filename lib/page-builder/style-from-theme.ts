import { getPreset, type PagePresetId } from "@/lib/page-builder/presets";
import {
  defaultSectionStyle,
  type PageSection,
  type PageTheme,
  type SectionStyle,
} from "@/lib/page-builder/types";

/** Style for a newly inserted section so it matches the active preset / page look. */
export function styleForNewSection(
  theme: PageTheme,
  templateId: string,
  existing: PageSection[],
  presetId?: PagePresetId | null
): SectionStyle {
  const preset = presetId ? getPreset(presetId) : undefined;
  const override = preset?.styleOverrides?.[templateId];
  if (override) {
    return defaultSectionStyle(override);
  }

  const peers = existing.filter((s) => s.type !== "hero" && s.visible);
  const sample = peers[peers.length - 1] ?? peers[0] ?? existing[0];

  const centeredHero =
    theme.heroStyle === "poster" ||
    theme.heroStyle === "immersive" ||
    theme.cardLayout === "flush";

  return defaultSectionStyle({
    align: sample?.style.align ?? (centeredHero ? "center" : "left"),
    titleSizePx:
      sample?.style.titleSizePx ??
      (theme.titleWeight === "black"
        ? 28
        : theme.titleWeight === "medium"
          ? 20
          : 22),
    bodySizePx:
      sample?.style.bodySizePx ?? (theme.density === "airy" ? 16 : 15),
    entrance:
      sample?.style.entrance ??
      (theme.motion === "static"
        ? "none"
        : theme.motion === "lively"
          ? "slideUp"
          : "fade"),
    paddingY:
      sample?.style.paddingY ??
      (theme.density === "compact"
        ? "sm"
        : theme.density === "airy"
          ? "lg"
          : "md"),
  });
}
