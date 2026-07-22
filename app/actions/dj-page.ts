"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  buildDefaultBlocks,
  buildDefaultTheme,
} from "@/lib/page-builder/defaults";
import { ensureRequiredSections } from "@/lib/page-builder/section-order";
import {
  loadSectionsFromDb,
  normalizeTheme,
  type DjPageRecord,
  type PageSection,
  type PageTheme,
} from "@/lib/page-builder/types";

export type LandingProfile = {
  id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  public_slug: string | null;
  location: string | null;
  social_links: Record<string, string> | null;
  gallery_urls: string[] | null;
  video_urls: string[] | null;
  artist_kind: string | null;
  is_verified: boolean | null;
  plan_type: string | null;
  trial_ends_at: string | null;
  premium_until: string | null;
  show_real_name: boolean | null;
  real_first_name: string | null;
  real_last_name: string | null;
};

export type LandingReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_name: string | null;
};

export type LandingExtra = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
};

type ActionOk<T> = { ok: true } & T;
type ActionErr = { ok: false; error: string };

async function requireDj() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return { ok: false as const, error: "Musíš byť prihlásený.", supabase };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, role, full_name, bio, location, artist_kind, public_slug, plan_type, trial_ends_at, premium_until"
    )
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || profile.role === "client" || profile.role === "admin") {
    return {
      ok: false as const,
      error: "Len pre účinkujúcich.",
      supabase,
      profile: null,
    };
  }
  return { ok: true as const, supabase, user: data.user, profile };
}

function mapPageRow(
  row: Record<string, unknown>,
  seed?: { name?: string | null; location?: string | null; bio?: string | null }
): DjPageRecord {
  const sections = ensureRequiredSections(loadSectionsFromDb(row.blocks), {
    name: seed?.name ?? undefined,
    location: seed?.location ?? undefined,
    bio: seed?.bio ?? undefined,
  });
  return {
    dj_id: String(row.dj_id),
    status: row.status === "published" ? "published" : "draft",
    theme: normalizeTheme(row.theme),
    sections,
    published_sections: row.published_blocks
      ? ensureRequiredSections(loadSectionsFromDb(row.published_blocks), {
          name: seed?.name ?? undefined,
          location: seed?.location ?? undefined,
          bio: seed?.bio ?? undefined,
        })
      : null,
    published_theme: row.published_theme
      ? normalizeTheme(row.published_theme)
      : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    published_at: row.published_at ? String(row.published_at) : null,
  };
}

async function loadLandingReviews(
  supabase: Awaited<ReturnType<typeof createClient>>,
  djId: string
): Promise<LandingReview[]> {
  const { data: reviewsRaw } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, client_id")
    .eq("dj_id", djId)
    .order("created_at", { ascending: false })
    .limit(20);

  const clientIds = [
    ...new Set((reviewsRaw ?? []).map((r) => r.client_id).filter(Boolean)),
  ] as string[];

  const nameByClient = new Map<string, string>();
  if (clientIds.length) {
    const { data: clients } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", clientIds);
    for (const c of clients ?? []) {
      nameByClient.set(c.id, c.full_name || "Klient");
    }
  }

  return (reviewsRaw ?? []).map((r) => ({
    id: r.id,
    rating: Number(r.rating ?? 0),
    comment: r.comment,
    created_at: r.created_at,
    client_name: r.client_id
      ? nameByClient.get(r.client_id) || "Klient"
      : "Klient",
  }));
}

async function loadLandingExtras(
  supabase: Awaited<ReturnType<typeof createClient>>,
  djId: string,
  activeOnly: boolean
): Promise<LandingExtra[]> {
  let query = supabase
    .from("dj_extras")
    .select(
      "id, title, description, price, image_url, icon, is_active, sort_order"
    )
    .eq("dj_id", djId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data } = await query;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    description: row.description ? String(row.description) : null,
    price: Number(row.price ?? 0),
    image_url: row.image_url ? String(row.image_url) : null,
    icon: row.icon ? String(row.icon) : null,
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
  }));
}

export async function getMyDjPage(): Promise<
  | ActionOk<{
      page: DjPageRecord;
      publicSlug: string | null;
      reviews: LandingReview[];
      extras: LandingExtra[];
    }>
  | ActionErr
> {
  const ctx = await requireDj();
  if (!ctx.ok || !ctx.profile) return { ok: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("dj_pages")
    .select("*")
    .eq("dj_id", ctx.profile.id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  const [reviews, extras] = await Promise.all([
    loadLandingReviews(ctx.supabase, ctx.profile.id),
    loadLandingExtras(ctx.supabase, ctx.profile.id, false),
  ]);

  if (!data) {
    const theme = buildDefaultTheme();
    const sections = buildDefaultBlocks({
      fullName: ctx.profile.full_name,
      bio: ctx.profile.bio,
      location: ctx.profile.location,
      artistKind: ctx.profile.artist_kind,
    });
    const now = new Date().toISOString();
    const { data: inserted, error: insertError } = await ctx.supabase
      .from("dj_pages")
      .insert({
        dj_id: ctx.profile.id,
        status: "draft",
        theme,
        blocks: sections,
        updated_at: now,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      return {
        ok: false,
        error: insertError?.message || "Nepodarilo sa vytvoriť stránku.",
      };
    }
    return {
      ok: true,
      page: mapPageRow(inserted, {
        name: ctx.profile.full_name,
        location: ctx.profile.location,
        bio: ctx.profile.bio,
      }),
      publicSlug: ctx.profile.public_slug,
      reviews,
      extras,
    };
  }

  return {
    ok: true,
    page: mapPageRow(data, {
      name: ctx.profile.full_name,
      location: ctx.profile.location,
      bio: ctx.profile.bio,
    }),
    publicSlug: ctx.profile.public_slug,
    reviews,
    extras,
  };
}

export async function saveDjPageDraft(input: {
  theme: PageTheme;
  sections: PageSection[];
}): Promise<ActionOk<{ page: DjPageRecord }> | ActionErr> {
  const ctx = await requireDj();
  if (!ctx.ok || !ctx.profile) return { ok: false, error: ctx.error };

  const theme = normalizeTheme(input.theme);
  const sections = ensureRequiredSections(loadSectionsFromDb(input.sections), {
    name: ctx.profile.full_name ?? undefined,
    location: ctx.profile.location ?? undefined,
    bio: ctx.profile.bio ?? undefined,
  });
  if (sections.length === 0) {
    return { ok: false, error: "Pridaj aspoň jednu sekciu." };
  }

  const now = new Date().toISOString();

  const { data: existing } = await ctx.supabase
    .from("dj_pages")
    .select("dj_id, status")
    .eq("dj_id", ctx.profile.id)
    .maybeSingle();

  let data;
  let error;

  if (existing) {
    const res = await ctx.supabase
      .from("dj_pages")
      .update({ theme, blocks: sections, updated_at: now })
      .eq("dj_id", ctx.profile.id)
      .select("*")
      .single();
    data = res.data;
    error = res.error;
  } else {
    const res = await ctx.supabase
      .from("dj_pages")
      .insert({
        dj_id: ctx.profile.id,
        status: "draft",
        theme,
        blocks: sections,
        updated_at: now,
      })
      .select("*")
      .single();
    data = res.data;
    error = res.error;
  }

  if (error || !data) {
    return { ok: false, error: error?.message || "Uloženie zlyhalo." };
  }

  revalidatePath("/dashboard/page-builder");
  revalidatePath("/dashboard/page-builder/edit");
  if (ctx.profile.public_slug) {
    revalidatePath(`/djs/${ctx.profile.public_slug}`);
    revalidatePath(`/p/${ctx.profile.public_slug}`);
  }
  return { ok: true, page: mapPageRow(data, {
    name: ctx.profile.full_name,
    location: ctx.profile.location,
    bio: ctx.profile.bio,
  }) };
}

export async function publishDjPage(input?: {
  theme?: PageTheme;
  sections?: PageSection[];
}): Promise<ActionOk<{ page: DjPageRecord }> | ActionErr> {
  const ctx = await requireDj();
  if (!ctx.ok || !ctx.profile) return { ok: false, error: ctx.error };

  const current = await getMyDjPage();
  if (!current.ok) return current;

  const theme = normalizeTheme(input?.theme ?? current.page.theme);
  const sections = ensureRequiredSections(
    loadSectionsFromDb(input?.sections ?? current.page.sections),
    {
      name: ctx.profile.full_name ?? undefined,
      location: ctx.profile.location ?? undefined,
      bio: ctx.profile.bio ?? undefined,
    }
  );
  if (sections.length === 0) {
    return { ok: false, error: "Pridaj aspoň jednu sekciu pred publikovaním." };
  }

  const now = new Date().toISOString();
  const payload = {
    dj_id: ctx.profile.id,
    status: "published" as const,
    theme,
    blocks: sections,
    published_theme: theme,
    published_blocks: sections,
    published_at: now,
    updated_at: now,
  };

  const { data: existing } = await ctx.supabase
    .from("dj_pages")
    .select("dj_id")
    .eq("dj_id", ctx.profile.id)
    .maybeSingle();

  const { data, error } = existing
    ? await ctx.supabase
        .from("dj_pages")
        .update(payload)
        .eq("dj_id", ctx.profile.id)
        .select("*")
        .single()
    : await ctx.supabase.from("dj_pages").insert(payload).select("*").single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Publikovanie zlyhalo." };
  }

  revalidatePath("/dashboard/page-builder");
  revalidatePath("/dashboard/page-builder/edit");
  revalidatePath("/sitemap.xml");
  if (ctx.profile.public_slug) {
    revalidatePath(`/djs/${ctx.profile.public_slug}`);
    revalidatePath(`/p/${ctx.profile.public_slug}`);
  }
  return { ok: true, page: mapPageRow(data, {
    name: ctx.profile.full_name,
    location: ctx.profile.location,
    bio: ctx.profile.bio,
  }) };
}

export async function unpublishDjPage(): Promise<
  ActionOk<{ page: DjPageRecord }> | ActionErr
> {
  const ctx = await requireDj();
  if (!ctx.ok || !ctx.profile) return { ok: false, error: ctx.error };

  const now = new Date().toISOString();
  const { data, error } = await ctx.supabase
    .from("dj_pages")
    .update({ status: "draft", updated_at: now })
    .eq("dj_id", ctx.profile.id)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Nepodarilo sa odpublikovať." };
  }

  revalidatePath("/dashboard/page-builder");
  revalidatePath("/dashboard/page-builder/edit");
  revalidatePath("/sitemap.xml");
  if (ctx.profile.public_slug) {
    revalidatePath(`/djs/${ctx.profile.public_slug}`);
    revalidatePath(`/p/${ctx.profile.public_slug}`);
  }
  return {
    ok: true,
    page: mapPageRow(data, {
      name: ctx.profile.full_name,
      location: ctx.profile.location,
      bio: ctx.profile.bio,
    }),
  };
}

export async function syncDjPageBio(
  bio: string
): Promise<ActionOk<{ bio: string }> | ActionErr> {
  const ctx = await requireDj();
  if (!ctx.ok || !ctx.profile) return { ok: false, error: ctx.error };

  const trimmed = bio.trim();
  const { error } = await ctx.supabase
    .from("profiles")
    .update({ bio: trimmed })
    .eq("id", ctx.profile.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/page-builder");
  revalidatePath("/dashboard/page-builder/edit");
  if (ctx.profile.public_slug) {
    revalidatePath(`/djs/${ctx.profile.public_slug}`);
    revalidatePath(`/p/${ctx.profile.public_slug}`);
  }
  return { ok: true, bio: trimmed };
}

export async function getPublishedDjPageBySlug(slug: string): Promise<
  | ActionOk<{
      profile: LandingProfile;
      theme: PageTheme;
      sections: PageSection[];
      reviews: LandingReview[];
      extras: LandingExtra[];
      isCustomPublished: boolean;
    }>
  | ActionErr
> {
  const supabase = await createClient();
  const trimmed = slug.trim();
  if (!trimmed) return { ok: false, error: "Chýba slug." };

  let { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, bio, avatar_url, cover_url, public_slug, location, social_links, gallery_urls, video_urls, artist_kind, is_verified, plan_type, trial_ends_at, premium_until, show_real_name, real_first_name, real_last_name, role"
    )
    .eq("public_slug", trimmed)
    .maybeSingle();

  if (!profile) {
    const byId = await supabase
      .from("profiles")
      .select(
        "id, full_name, bio, avatar_url, cover_url, public_slug, location, social_links, gallery_urls, video_urls, artist_kind, is_verified, plan_type, trial_ends_at, premium_until, show_real_name, real_first_name, real_last_name, role"
      )
      .eq("id", trimmed)
      .maybeSingle();
    profile = byId.data;
  }

  if (!profile || profile.role === "client" || profile.role === "admin") {
    return { ok: false, error: "Profil neexistuje." };
  }

  const { data: page } = await supabase
    .from("dj_pages")
    .select("*")
    .eq("dj_id", profile.id)
    .maybeSingle();

  const isCustomPublished =
    page?.status === "published" &&
    Array.isArray(page.published_blocks) &&
    page.published_blocks.length > 0;

  const theme = isCustomPublished
    ? normalizeTheme(page?.published_theme ?? page?.theme)
    : buildDefaultTheme();

  const sections = ensureRequiredSections(
    isCustomPublished
      ? loadSectionsFromDb(page?.published_blocks)
      : buildDefaultBlocks({
          fullName: profile.full_name,
          bio: profile.bio,
          location: profile.location,
          artistKind: profile.artist_kind,
        }),
    {
      name: profile.full_name ?? undefined,
      location: profile.location ?? undefined,
      bio: profile.bio ?? undefined,
    }
  );

  const [reviews, extras] = await Promise.all([
    loadLandingReviews(supabase, profile.id),
    loadLandingExtras(supabase, profile.id, true),
  ]);

  const landingProfile: LandingProfile = {
    id: profile.id,
    full_name: profile.full_name,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    cover_url: profile.cover_url,
    public_slug: profile.public_slug,
    location: profile.location,
    social_links:
      profile.social_links && typeof profile.social_links === "object"
        ? (profile.social_links as Record<string, string>)
        : null,
    gallery_urls: Array.isArray(profile.gallery_urls)
      ? (profile.gallery_urls as string[])
      : null,
    video_urls: Array.isArray(profile.video_urls)
      ? (profile.video_urls as string[])
      : null,
    artist_kind: profile.artist_kind,
    is_verified: profile.is_verified,
    plan_type: profile.plan_type,
    trial_ends_at: profile.trial_ends_at,
    premium_until: profile.premium_until,
    show_real_name: profile.show_real_name,
    real_first_name: profile.real_first_name,
    real_last_name: profile.real_last_name,
  };

  return {
    ok: true,
    profile: landingProfile,
    theme,
    sections,
    reviews,
    extras,
    isCustomPublished,
  };
}
