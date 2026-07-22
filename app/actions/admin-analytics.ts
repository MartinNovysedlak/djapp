"use server";

import { createClient } from "@/utils/supabase/server";
import {
  getVerificationRequirements,
  isVerificationEligible,
} from "@/lib/verification";

export type AdminFunnelCounts = {
  registeredDjs: number;
  withAvatar: number;
  profileComplete: number;
  verified: number;
};

export type AdminStaleInquiry = {
  id: string;
  djId: string;
  djName: string;
  clientName: string;
  eventDate: string | null;
  createdAt: string;
  ageHours: number;
  isBulk: boolean;
};

export type AdminIncompleteDj = {
  id: string;
  name: string;
  publicSlug: string | null;
  missing: string[];
  createdAt: string;
};

export type AdminPlatformAnalytics = {
  generatedAt: string;
  users: {
    djs: number;
    clients: number;
    djsLast7d: number;
    clientsLast7d: number;
    djsLast30d: number;
    clientsLast30d: number;
  };
  funnel: AdminFunnelCounts;
  funnelRates: {
    avatarRate: number;
    completeRate: number;
    verifiedRate: number;
  };
  trust: {
    pendingNoResponse: number;
    pendingStale24h: number;
    pendingStale72h: number;
    bulkItemsPending: number;
    responseRatePct: number;
    avgResponseHours: number | null;
    staleItems: AdminStaleInquiry[];
  };
  bookings: {
    pending: number;
    accepted: number;
    rejected: number;
    last7d: number;
  };
  verifications: {
    pending: number;
    approved: number;
    rejected: number;
  };
  incompleteDjs: AdminIncompleteDj[];
  signupsByDay: { day: string; djs: number; clients: number }[];
};

function pct(part: number, whole: number) {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function hoursSince(iso: string) {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
}

function displayName(p: {
  full_name?: string | null;
  real_first_name?: string | null;
  real_last_name?: string | null;
}) {
  const real = [p.real_first_name, p.real_last_name].filter(Boolean).join(" ");
  return p.full_name?.trim() || real || "Bez mena";
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false as const, error: "Musíš byť prihlásený." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return { ok: false as const, error: "Prístup len pre admina." };
  }
  return { ok: true as const, supabase };
}

export async function getAdminPlatformAnalytics(): Promise<
  | { ok: true; data: AdminPlatformAnalytics }
  | { ok: false; error: string }
> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const { supabase } = ctx;

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const day30ago = new Date(now.getTime() - 29 * 86_400_000);
  day30ago.setHours(0, 0, 0, 0);

  const [
    profilesRes,
    privateRes,
    bookingsRes,
    bulkItemsRes,
    verificationsRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, role, full_name, real_first_name, real_last_name, phone, location, avatar_url, gallery_urls, social_links, public_slug, is_verified, created_at"
      ),
    supabase.from("dj_verification_private").select("dj_id, permanent_address"),
    supabase
      .from("bookings")
      .select(
        "id, dj_id, client_name, event_date, status, type, bulk_inquiry_id, dj_offer_price, created_at"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("bulk_inquiry_items")
      .select("id, inquiry_id, dj_id, item_status, created_at"),
    supabase.from("verification_requests").select("id, status"),
  ]);

  if (profilesRes.error) return { ok: false, error: profilesRes.error.message };
  if (bookingsRes.error) return { ok: false, error: bookingsRes.error.message };
  if (bulkItemsRes.error) return { ok: false, error: bulkItemsRes.error.message };

  const profiles = profilesRes.data ?? [];
  const addressByDj = new Map(
    (privateRes.data ?? []).map((r) => [r.dj_id, r.permanent_address as string])
  );
  const bookings = bookingsRes.data ?? [];
  const bulkItems = bulkItemsRes.data ?? [];
  const verifications = verificationsRes.data ?? [];

  const djs = profiles.filter((p) => p.role === "dj");
  const clients = profiles.filter((p) => p.role === "client");

  let withAvatar = 0;
  let profileComplete = 0;
  let verified = 0;
  const incompleteDjs: AdminIncompleteDj[] = [];

  for (const dj of djs) {
    const gallery = Array.isArray(dj.gallery_urls)
      ? (dj.gallery_urls as string[])
      : [];
    const social =
      dj.social_links && typeof dj.social_links === "object"
        ? (dj.social_links as Record<string, string>)
        : null;
    const input = {
      realFirstName: dj.real_first_name,
      realLastName: dj.real_last_name,
      phone: dj.phone,
      location: dj.location,
      permanentAddress: addressByDj.get(dj.id) ?? null,
      avatarUrl: dj.avatar_url,
      galleryUrls: gallery,
      socialLinks: social,
    };
    if (dj.avatar_url?.trim()) withAvatar += 1;
    if (dj.is_verified) verified += 1;
    if (isVerificationEligible(input)) {
      profileComplete += 1;
    } else {
      const missing = getVerificationRequirements(input)
        .filter((r) => !r.ok)
        .map((r) => r.label);
      incompleteDjs.push({
        id: dj.id,
        name: displayName(dj),
        publicSlug: dj.public_slug,
        missing,
        createdAt: dj.created_at,
      });
    }
  }

  incompleteDjs.sort(
    (a, b) =>
      b.missing.length - a.missing.length ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const inquiryBookings = bookings.filter((b) => {
    if (b.type === "blockout") return false;
    return (
      b.status === "pending" ||
      b.status === "accepted" ||
      b.status === "rejected"
    );
  });

  const pendingNoOffer = inquiryBookings.filter(
    (b) => b.status === "pending" && b.dj_offer_price == null
  );

  const staleItems: AdminStaleInquiry[] = pendingNoOffer
    .map((b) => {
      const dj = djs.find((d) => d.id === b.dj_id);
      return {
        id: b.id,
        djId: b.dj_id,
        djName: dj ? displayName(dj) : "Neznámy DJ",
        clientName: b.client_name || "Klient",
        eventDate: b.event_date,
        createdAt: b.created_at,
        ageHours: Math.round(hoursSince(b.created_at) * 10) / 10,
        isBulk: Boolean(b.bulk_inquiry_id),
      };
    })
    .sort((a, b) => b.ageHours - a.ageHours);

  const responded = inquiryBookings.filter(
    (b) => b.status !== "pending" || b.dj_offer_price != null
  );

  const bulkItemsPending = bulkItems.filter((i) => i.item_status === "pending")
    .length;

  const dayMap = new Map<string, { djs: number; clients: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(day30ago.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { djs: 0, clients: 0 });
  }
  for (const p of profiles) {
    const key = p.created_at?.slice(0, 10);
    if (!key || !dayMap.has(key)) continue;
    const row = dayMap.get(key)!;
    if (p.role === "dj") row.djs += 1;
    if (p.role === "client") row.clients += 1;
  }

  const data: AdminPlatformAnalytics = {
    generatedAt: now.toISOString(),
    users: {
      djs: djs.length,
      clients: clients.length,
      djsLast7d: djs.filter((p) => p.created_at >= d7).length,
      clientsLast7d: clients.filter((p) => p.created_at >= d7).length,
      djsLast30d: djs.filter((p) => p.created_at >= d30).length,
      clientsLast30d: clients.filter((p) => p.created_at >= d30).length,
    },
    funnel: {
      registeredDjs: djs.length,
      withAvatar,
      profileComplete,
      verified,
    },
    funnelRates: {
      avatarRate: pct(withAvatar, djs.length),
      completeRate: pct(profileComplete, djs.length),
      verifiedRate: pct(verified, djs.length),
    },
    trust: {
      pendingNoResponse: pendingNoOffer.length,
      pendingStale24h: staleItems.filter((i) => i.ageHours >= 24).length,
      pendingStale72h: staleItems.filter((i) => i.ageHours >= 72).length,
      bulkItemsPending,
      responseRatePct: pct(responded.length, inquiryBookings.length),
      avgResponseHours: null,
      staleItems: staleItems.slice(0, 20),
    },
    bookings: {
      pending: inquiryBookings.filter((b) => b.status === "pending").length,
      accepted: inquiryBookings.filter((b) => b.status === "accepted").length,
      rejected: inquiryBookings.filter((b) => b.status === "rejected").length,
      last7d: inquiryBookings.filter((b) => b.created_at >= d7).length,
    },
    verifications: {
      pending: verifications.filter((v) => v.status === "pending").length,
      approved: verifications.filter((v) => v.status === "approved").length,
      rejected: verifications.filter((v) => v.status === "rejected").length,
    },
    incompleteDjs: incompleteDjs.slice(0, 15),
    signupsByDay: Array.from(dayMap.entries()).map(([day, v]) => ({
      day,
      ...v,
    })),
  };

  return { ok: true, data };
}
