import { applyPagePreset } from "@/lib/page-builder/presets";
import {
  defaultTheme,
  type PageSection,
  type PageTheme,
} from "@/lib/page-builder/types";

export type ProfileSeedInput = {
  fullName?: string | null;
  bio?: string | null;
  location?: string | null;
  artistKind?: string | null;
  avatarUrl?: string | null;
};

export function buildDefaultSections(profile?: ProfileSeedInput): PageSection[] {
  return applyPagePreset("katalog", {
    name: profile?.fullName ?? undefined,
    location: profile?.location ?? undefined,
    bio: profile?.bio ?? undefined,
    avatarUrl: profile?.avatarUrl ?? undefined,
  }).sections;
}

/** @deprecated use buildDefaultSections */
export function buildDefaultBlocks(profile?: ProfileSeedInput): PageSection[] {
  return buildDefaultSections(profile);
}

export function buildDefaultTheme(): PageTheme {
  return defaultTheme();
}
