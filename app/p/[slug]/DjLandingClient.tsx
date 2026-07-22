"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DjPageRenderer } from "@/components/page-builder/DjPageRenderer";
import type {
  LandingExtra,
  LandingProfile,
  LandingReview,
} from "@/app/actions/dj-page";
import type { PageSection, PageTheme } from "@/lib/page-builder/types";
import { SiteFooter } from "@/components/SiteFooter";

type Props = {
  profile: LandingProfile;
  theme: PageTheme;
  sections: PageSection[];
  reviews: LandingReview[];
  extras: LandingExtra[];
};

/**
 * Catalog public page — same themed canvas as the editor preset
 * (full-bleed wash + stage-centered lights behind sections).
 */
export default function DjLandingClient({
  profile,
  theme,
  sections,
  reviews,
  extras,
}: Props) {
  return (
    <DjPageRenderer
      profile={profile}
      theme={theme}
      sections={sections}
      reviews={reviews}
      extras={extras}
      bookingEnabled
      className="flex min-h-svh flex-col"
      beforeSections={
        <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
          <Link
            href="/djs"
            className="group inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors duration-300 hover:text-zinc-200"
          >
            <ArrowLeft className="size-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
            Späť na katalóg umelcov
          </Link>
        </div>
      }
      afterSections={<SiteFooter />}
    />
  );
}
