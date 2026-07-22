import {
  ACCENT_CLASSES,
  defaultSectionStyle,
  newId,
  type PageAccent,
  type PageSection,
  type SectionType,
} from "@/lib/page-builder/types";
import { createSectionFromTemplate } from "@/lib/page-builder/templates";

export const PAGE_ACCENTS: PageAccent[] = [
  "violet",
  "rose",
  "emerald",
  "amber",
  "sky",
  "cyan",
  "fuchsia",
  "orange",
];

export const ACCENT_SWATCH: Record<PageAccent, string> = {
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
  cyan: "bg-cyan-500",
  fuchsia: "bg-fuchsia-500",
  orange: "bg-orange-500",
};

export const REQUIRED_SECTION_TYPES: SectionType[] = [
  "hero",
  "reviews",
  "contact",
  "cta",
];

const REQUIRED_DEFAULT_TEMPLATES: Partial<Record<SectionType, string>> = {
  reviews: "reviews.list",
  contact: "contact.simple",
  cta: "cta.banner",
};

export function isRequiredSectionType(type: SectionType): boolean {
  return REQUIRED_SECTION_TYPES.includes(type);
}

export function canRemoveSection(section: PageSection): boolean {
  return !isRequiredSectionType(section.type);
}

export function canHideSection(section: PageSection): boolean {
  return !isRequiredSectionType(section.type);
}

type Seed = {
  name?: string;
  location?: string;
  bio?: string;
  avatarUrl?: string;
};

/** Hero first + always-visible required sections (reviews, contact, cta). */
export function ensureRequiredSections(
  sections: PageSection[],
  seed?: Seed
): PageSection[] {
  const withHero = ensureHeroFirst(sections, seed);
  let next = withHero.map((s) =>
    isRequiredSectionType(s.type) ? { ...s, visible: true } : s
  );

  for (const type of REQUIRED_SECTION_TYPES) {
    if (type === "hero") continue;
    if (next.some((s) => s.type === type)) continue;
    const templateId = REQUIRED_DEFAULT_TEMPLATES[type];
    if (!templateId) continue;
    const created = createSectionFromTemplate(templateId, seed);
    if (created) {
      next = [...next, { ...created, visible: true }];
    }
  }

  return next;
}

export function ensureHeroFirst(
  sections: PageSection[],
  seed?: Seed
): PageSection[] {
  const heroes = sections.filter((s) => s.type === "hero");
  const rest = sections.filter((s) => s.type !== "hero");
  const hero =
    heroes[0] ??
    createSectionFromTemplate("hero.cover", seed) ??
    ({
      id: newId(),
      type: "hero" as const,
      templateId: "hero.cover",
      visible: true,
      style: defaultSectionStyle({ align: "left", titleSizePx: 34 }),
      props: {
        headline: seed?.name ?? "DJ",
        subheadline: seed?.location ?? "",
        showCover: true,
        ctaLabel: "Nezáväzná rezervácia",
      },
    } satisfies PageSection);

  return [{ ...hero, visible: true }, ...rest];
}

export function reorderNonHero(
  sections: PageSection[],
  fromId: string,
  toId: string
): PageSection[] {
  const ordered = ensureRequiredSections(sections);
  const hero = ordered[0]!;
  const rest = ordered.slice(1);
  const from = rest.findIndex((s) => s.id === fromId);
  const to = rest.findIndex((s) => s.id === toId);
  if (from < 0 || to < 0 || from === to) return ordered;
  const next = [...rest];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return [hero, ...next];
}

export { ACCENT_CLASSES };
