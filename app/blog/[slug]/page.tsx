import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPublishedBlogBySlug } from "@/app/actions/blog";
import { BRAND } from "@/lib/brand";
import { getPublicSiteUrl } from "@/lib/site-url";
import { SiteFooter } from "@/components/SiteFooter";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublishedBlogBySlug(slug);
  if (!result.ok) {
    return { title: `Blog | ${BRAND.name}` };
  }
  const post = result.post;
  const site = getPublicSiteUrl();
  const title = post.seo_title?.trim() || post.title;
  const description =
    post.seo_description?.trim() ||
    post.excerpt ||
    `Článok na ${BRAND.name}`;
  const url = `${site}/blog/${post.slug}`;

  return {
    title: `${title} | ${BRAND.name}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      siteName: BRAND.name,
      images: post.cover_url
        ? [{ url: post.cover_url, alt: post.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.cover_url ? [post.cover_url] : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getPublishedBlogBySlug(slug);
  if (!result.ok) notFound();
  const post = result.post;
  const site = getPublicSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.seo_title?.trim() || post.title,
    description: post.seo_description?.trim() || post.excerpt,
    image: post.cover_url ? [post.cover_url] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      "@type": "Organization",
      name: BRAND.name,
      url: site,
    },
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: site,
    },
    mainEntityOfPage: `${site}/blog/${post.slug}`,
  };

  return (
    <div className="min-h-svh bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-3xl px-6 pb-16 pt-10">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Späť na blog
        </Link>

        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
          {post.published_at
            ? new Date(post.published_at).toLocaleDateString("sk-SK", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : ""}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
          {post.title}
        </h1>
        {post.excerpt ? (
          <p className="mt-4 text-lg text-zinc-400">{post.excerpt}</p>
        ) : null}

        {post.cover_url ? (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl border border-white/10">
            <Image
              src={post.cover_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
              unoptimized
            />
          </div>
        ) : null}

        <div
          className="blog-content mt-10 text-base leading-relaxed text-zinc-300 [&_a]:text-violet-300 [&_a]:underline [&_em]:text-zinc-400 [&_figure]:my-8 [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-zinc-500 [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h3]:mb-2 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white [&_img]:my-2 [&_img]:max-h-[480px] [&_img]:w-full [&_img]:rounded-2xl [&_img]:object-cover [&_li]:my-1.5 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_strong]:text-zinc-100 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: post.content_html }}
        />
      </article>
      <SiteFooter />
    </div>
  );
}
