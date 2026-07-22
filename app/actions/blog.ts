"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type BlogStatus = "draft" | "published";

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content_html: string;
  cover_url: string | null;
  seo_title: string;
  seo_description: string;
  status: BlogStatus;
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};

type ActionResult = { ok: true; id?: string; slug?: string } | { ok: false; error: string };

async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, user: null, admin: false as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", data.user.id)
    .maybeSingle();
  return {
    supabase,
    user: data.user,
    admin: profile?.role === "admin",
    profile,
  };
}

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function listAdminBlogPosts() {
  const { admin, supabase } = await requireAdmin();
  if (!admin) return { ok: false as const, error: "Prístup len pre admina.", items: [] as BlogPost[] };

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return { ok: false as const, error: error.message, items: [] as BlogPost[] };
  return { ok: true as const, items: (data ?? []) as BlogPost[] };
}

export async function getAdminBlogPost(id: string) {
  const { admin, supabase } = await requireAdmin();
  if (!admin) return { ok: false as const, error: "Prístup len pre admina." };

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return { ok: false as const, error: error?.message || "Článok neexistuje." };
  }
  return { ok: true as const, post: data as BlogPost };
}

export async function listPublishedBlogPosts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, title, slug, excerpt, cover_url, seo_title, seo_description, published_at, created_at, updated_at"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) return { ok: false as const, error: error.message, items: [] };
  return { ok: true as const, items: data ?? [] };
}

export async function getPublishedBlogBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return { ok: false as const, error: error?.message || "Článok neexistuje." };
  }
  return { ok: true as const, post: data as BlogPost };
}

export async function saveBlogPost(input: {
  id?: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  coverUrl?: string | null;
  seoTitle?: string;
  seoDescription?: string;
  status: BlogStatus;
  publishedAt?: string | null;
}): Promise<ActionResult> {
  const { admin, supabase, user } = await requireAdmin();
  if (!admin || !user) return { ok: false, error: "Prístup len pre admina." };

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Názov je povinný." };

  const now = new Date().toISOString();
  const publishedAt =
    input.status === "published"
      ? input.publishedAt || now
      : input.publishedAt || null;

  if (input.id) {
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("id", input.id)
      .maybeSingle();

    const slug = existing?.slug || slugify(title) || `clanok-${Date.now()}`;

    const { data, error } = await supabase
      .from("blog_posts")
      .update({
        title,
        slug,
        excerpt: input.excerpt.trim(),
        content_html: input.contentHtml,
        cover_url: input.coverUrl?.trim() || null,
        seo_title: input.seoTitle?.trim() || "",
        seo_description: input.seoDescription?.trim() || "",
        status: input.status,
        published_at: publishedAt,
        author_id: user.id,
        updated_at: now,
      })
      .eq("id", input.id)
      .select("id, slug")
      .single();
    if (error || !data) return { ok: false, error: error?.message || "Uloženie zlyhalo." };
    revalidatePath("/blog");
    revalidatePath(`/blog/${data.slug}`);
    revalidatePath("/admin/blog");
    revalidatePath("/sitemap.xml");
    return { ok: true, id: data.id, slug: data.slug };
  }

  const slug = slugify(title) || `clanok-${Date.now()}`;

  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      title,
      slug,
      excerpt: input.excerpt.trim(),
      content_html: input.contentHtml,
      cover_url: input.coverUrl?.trim() || null,
      seo_title: input.seoTitle?.trim() || "",
      seo_description: input.seoDescription?.trim() || "",
      status: input.status,
      published_at: publishedAt,
      author_id: user.id,
      updated_at: now,
    })
    .select("id, slug")
    .single();

  if (error || !data) return { ok: false, error: error?.message || "Vytvorenie zlyhalo." };
  revalidatePath("/blog");
  revalidatePath(`/blog/${data.slug}`);
  revalidatePath("/admin/blog");
  revalidatePath("/sitemap.xml");
  return { ok: true, id: data.id, slug: data.slug };
}

export async function deleteBlogPost(id: string): Promise<ActionResult> {
  const { admin, supabase } = await requireAdmin();
  if (!admin) return { ok: false, error: "Prístup len pre admina." };

  const { data: existing } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/blog");
  if (existing?.slug) revalidatePath(`/blog/${existing.slug}`);
  revalidatePath("/admin/blog");
  revalidatePath("/sitemap.xml");
  return { ok: true };
}
