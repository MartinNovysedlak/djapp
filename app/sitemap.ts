import type { MetadataRoute } from "next";
import { createClient } from "@/utils/supabase/server";
import { getPublicSiteUrl } from "@/lib/site-url";

const siteUrl = getPublicSiteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/djs`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/kontakt`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/podmienky`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/obchodne-podmienky`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  try {
    const supabase = await createClient();
    const [{ data: posts }, { data: pages }] = await Promise.all([
      supabase
        .from("blog_posts")
        .select("slug, updated_at, published_at")
        .eq("status", "published"),
      supabase
        .from("dj_pages")
        .select("dj_id, updated_at, published_at, status")
        .eq("status", "published"),
    ]);

    const blogEntries: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at || post.published_at || now),
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    let pageEntries: MetadataRoute.Sitemap = [];
    if (pages?.length) {
      const ids = pages.map((p) => p.dj_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, public_slug")
        .in("id", ids);
      const slugById = new Map(
        (profiles ?? []).map((p) => [p.id, p.public_slug as string | null])
      );
      pageEntries = pages
        .map((page) => {
          const slug = slugById.get(page.dj_id);
          if (!slug) return null;
          return {
            url: `${siteUrl}/djs/${slug}`,
            lastModified: new Date(
              page.updated_at || page.published_at || now
            ),
            changeFrequency: "weekly" as const,
            priority: 0.75,
          };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x));
    }

    return [...staticEntries, ...blogEntries, ...pageEntries];
  } catch {
    return staticEntries;
  }
}
