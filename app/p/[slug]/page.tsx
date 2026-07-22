import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { getPublishedDjPageBySlug } from "@/app/actions/dj-page";
import { getDjStageName } from "@/lib/dj-display";
import { getPublicSiteUrl } from "@/lib/site-url";
import { BRAND } from "@/lib/brand";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/** Legacy /p/[slug] → katalógový profil /djs/[slug]. */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublishedDjPageBySlug(slug);
  if (!result.ok) {
    return { title: `Stránka | ${BRAND.name}` };
  }
  const name = getDjStageName(result.profile, "DJ");
  const site = getPublicSiteUrl();
  const url = `${site}/djs/${result.profile.public_slug || slug}`;
  return {
    title: `${name} | ${BRAND.name}`,
    alternates: { canonical: url },
  };
}

export default async function LegacyDjLandingRedirect({ params }: PageProps) {
  const { slug } = await params;
  permanentRedirect(`/djs/${slug}`);
}
