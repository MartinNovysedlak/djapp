import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { getDjStageName } from "@/lib/dj-display";
import { getPublishedDjPageBySlug } from "@/app/actions/dj-page";
import { getPublicSiteUrl } from "@/lib/site-url";
import DjProfileClient from "./DjProfileClient";
import DjLandingClient from "@/app/p/[slug]/DjLandingClient";

const PLATFORM_NAME = "BookTheVibe";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function fetchDjBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, bio, public_slug, avatar_url, artist_kind, location")
    .eq("public_slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const dj = await fetchDjBySlug(slug);
  const djName = getDjStageName(dj ?? { full_name: null }, "Umelec");
  const kindLabel =
    dj?.artist_kind === "band"
      ? "Kapela"
      : dj?.artist_kind === "dj_band"
        ? "DJ + Kapela"
        : "DJ";

  const title = `${djName} | ${kindLabel} na ${PLATFORM_NAME}`;
  const locationBit = dj?.location?.trim() ? ` z ${dj.location.trim()}` : "";
  const bioBit = dj?.bio?.trim()
    ? dj.bio.trim().slice(0, 110).replace(/\s+\S*$/, "") + "…"
    : null;
  const description =
    bioBit ||
    `Pozri profil ${
      dj?.artist_kind === "band" ? "kapely" : "umelca"
    } ${djName}${locationBit} na BookTheVibe. Recenzie, galéria a nezáväzná rezervácia online.`;

  if (!dj) {
    return {
      title: `Profil nenájdený | ${PLATFORM_NAME}`,
      description:
        "Tento profil umelca sa nenašiel. Prehliadaj katalóg BookTheVibe a nájdi DJ-a alebo kapelu na svoju akciu.",
      robots: { index: false, follow: true },
    };
  }

  const pageUrl = `${getPublicSiteUrl()}/djs/${slug}`;
  const images = dj.avatar_url
    ? [{ url: dj.avatar_url, alt: djName }]
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: PLATFORM_NAME,
      locale: "sk_SK",
      type: "profile",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: dj.avatar_url ? [dj.avatar_url] : undefined,
    },
    alternates: {
      canonical: pageUrl,
    },
    robots: { index: true, follow: true },
  };
}

export default async function DJDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const published = await getPublishedDjPageBySlug(slug);

  if (published.ok && published.isCustomPublished) {
    return (
      <DjLandingClient
        profile={published.profile}
        theme={published.theme}
        sections={published.sections}
        reviews={published.reviews}
        extras={published.extras}
      />
    );
  }

  return <DjProfileClient />;
}
