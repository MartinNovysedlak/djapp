import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { getDjStageName } from "@/lib/dj-display";
import DjProfileClient from "./DjProfileClient";

const PLATFORM_NAME = "DJ App";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function fetchDjBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, bio, public_slug, avatar_url")
    .eq("public_slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const dj = await fetchDjBySlug(slug);
  const djName = getDjStageName(dj ?? { full_name: null }, "DJ");

  const title = `${djName} | Event DJ na ${PLATFORM_NAME}`;
  const description = `Pozri si profil DJ-a ${djName}, prečítaj si recenzie a zarezervuj si termín na svoju akciu.`;

  if (!dj) {
    return {
      title: `DJ nenájdený | ${PLATFORM_NAME}`,
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

export default function DJDetailPage() {
  return <DjProfileClient />;
}
