import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { listPublishedBlogPosts } from "@/app/actions/blog";
import { BRAND } from "@/lib/brand";
import { getPublicSiteUrl } from "@/lib/site-url";
import { SiteFooter } from "@/components/SiteFooter";

const site = getPublicSiteUrl();

export const metadata: Metadata = {
  title: `Blog o svadbe a DJ | ${BRAND.name}`,
  description:
    "Tipy na svadbu, výber DJ-a, reálne ceny 2026 a praktické rady pre plánovanie. Blog BookTheVibe.",
  alternates: { canonical: `${site}/blog` },
  openGraph: {
    title: `Blog o svadbe a DJ | ${BRAND.name}`,
    description:
      "Tipy na svadbu, výber DJ-a, reálne ceny 2026 a praktické rady pre plánovanie.",
    url: `${site}/blog`,
    type: "website",
    siteName: BRAND.name,
  },
};

export default async function BlogIndexPage() {
  const result = await listPublishedBlogPosts();
  const posts = result.ok ? result.items : [];

  return (
    <div className="min-h-svh bg-background">
      <main className="mx-auto max-w-5xl px-6 pb-16 pt-10">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">
            Blog
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">
            Tipy na svadbu, DJ a plánovanie
          </h1>
          <p className="mt-3 text-zinc-400">
            Praktické rady podľa reálnych cien a skúseností zo slovenskej
            svadobnej scény.
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="rounded-3xl border border-white/10 bg-card/50 px-5 py-10 text-sm text-zinc-500">
            Zatiaľ žiadne publikované články.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-card/60 transition-colors hover:border-violet-500/30"
              >
                {post.cover_url ? (
                  <div className="relative h-44 w-full">
                    <Image
                      src={post.cover_url}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="h-44 bg-gradient-to-br from-violet-600/30 via-fuchsia-600/20 to-background" />
                )}
                <div className="space-y-2 p-5">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString("sk-SK", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : ""}
                  </p>
                  <h2 className="text-lg font-semibold text-white group-hover:text-violet-200">
                    {post.title}
                  </h2>
                  <p className="line-clamp-3 text-sm text-zinc-400">
                    {post.excerpt}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
