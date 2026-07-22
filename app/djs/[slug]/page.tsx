import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { getDjStageName } from "@/lib/dj-display";
import { getPublishedDjPageBySlug } from "@/app/actions/dj-page";
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
    .select("id, full_name, bio, public_slug, avatar_url, artist_kind")
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
  const description = `Pozri si profil ${
    dj?.artist_kind === "band" ? "kapely" : "umelca"
  } ${djName}, prečítaj si recenzie a zarezervuj si termín na svoju akciu.`;

  if (!dj) {
    return {
      title: `Profil nenájdený | ${PLATFORM_NAME}`,
      description,
    };
  }

  const siteUrl = (() => {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    return "http://localhost:3000";
  })();

  const pageUrl = `${siteUrl}/djs/${slug}`;

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
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: pageUrl,
    },
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
