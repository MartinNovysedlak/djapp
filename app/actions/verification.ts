"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getAdminEmail, sendAppEmail } from "@/lib/email/send-app-email";
import { getPublicSiteUrl } from "@/lib/site-url";
import {
  getFilledSocialLinks,
  isVerificationEligible,
  type VerificationSnapshot,
  type VerificationStatus,
} from "@/lib/verification";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, user: null as null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, role, full_name, real_first_name, real_last_name, phone, location, avatar_url, gallery_urls, video_urls, public_slug, artist_kind, social_links, bio, plan_type, trial_ends_at, premium_until, is_verified, verified_at, created_at, google_maps_url, show_real_name"
    )
    .eq("id", data.user.id)
    .maybeSingle();
  return { supabase, user: data.user, profile };
}

async function requireAdmin() {
  const ctx = await requireUser();
  if (!ctx.user || !ctx.profile || ctx.profile.role !== "admin") {
    return { ...ctx, admin: false as const };
  }
  return { ...ctx, admin: true as const };
}

async function getPermanentAddress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  djId: string
) {
  const { data } = await supabase
    .from("dj_verification_private")
    .select("permanent_address")
    .eq("dj_id", djId)
    .maybeSingle();
  return (data?.permanent_address as string | null)?.trim() || null;
}

function revalidateDjPublic(slug: string | null | undefined) {
  revalidatePath("/djs");
  revalidatePath("/dashboard/profile");
  revalidatePath("/admin");
  if (slug) revalidatePath(`/djs/${slug}`);
}

export async function getMyPermanentAddress(): Promise<{
  ok: boolean;
  permanentAddress: string;
  error?: string;
}> {
  const { user, profile, supabase } = await requireUser();
  if (!user || !profile) {
    return { ok: false, permanentAddress: "", error: "Musíš byť prihlásený." };
  }
  if (profile.role !== "dj") {
    return { ok: false, permanentAddress: "", error: "Len pre umelcov." };
  }
  const address = await getPermanentAddress(supabase, user.id);
  return { ok: true, permanentAddress: address || "" };
}

export async function getMyVerificationState(): Promise<{
  ok: boolean;
  error?: string;
  isVerified: boolean;
  pendingRequestId: string | null;
  latestStatus: VerificationStatus | null;
  latestAdminNote: string | null;
  permanentAddress: string;
}> {
  const { user, profile, supabase } = await requireUser();
  if (!user || !profile) {
    return {
      ok: false,
      error: "Musíš byť prihlásený.",
      isVerified: false,
      pendingRequestId: null,
      latestStatus: null,
      latestAdminNote: null,
      permanentAddress: "",
    };
  }
  if (profile.role !== "dj") {
    return {
      ok: false,
      error: "Overenie je len pre účty umelcov.",
      isVerified: false,
      pendingRequestId: null,
      latestStatus: null,
      latestAdminNote: null,
      permanentAddress: "",
    };
  }

  const [{ data: latest }, permanentAddress] = await Promise.all([
    supabase
      .from("verification_requests")
      .select("id, status, admin_note")
      .eq("dj_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getPermanentAddress(supabase, user.id),
  ]);

  return {
    ok: true,
    isVerified: Boolean(profile.is_verified),
    pendingRequestId:
      latest?.status === "pending" ? (latest.id as string) : null,
    latestStatus: (latest?.status as VerificationStatus | undefined) ?? null,
    latestAdminNote: (latest?.admin_note as string | null) ?? null,
    permanentAddress: permanentAddress || "",
  };
}

export async function submitVerificationRequest(
  note?: string
): Promise<ActionResult> {
  const { user, profile, supabase } = await requireUser();
  if (!user || !profile) return { ok: false, error: "Musíš byť prihlásený." };
  if (profile.role !== "dj") {
    return { ok: false, error: "Overenie je len pre účty umelcov." };
  }
  if (profile.is_verified) {
    return { ok: false, error: "Profil je už overený." };
  }

  const { data: pending } = await supabase
    .from("verification_requests")
    .select("id")
    .eq("dj_id", user.id)
    .eq("status", "pending")
    .maybeSingle();
  if (pending) {
    return { ok: false, error: "Už máš čakajúcu žiadosť o overenie." };
  }

  const galleryUrls = Array.isArray(profile.gallery_urls)
    ? (profile.gallery_urls as string[]).filter(Boolean)
    : [];
  const videoUrls = Array.isArray(profile.video_urls)
    ? (profile.video_urls as string[]).filter(Boolean)
    : [];
  const socialLinks =
    profile.social_links && typeof profile.social_links === "object"
      ? (profile.social_links as Record<string, string>)
      : {};
  const permanentAddress = await getPermanentAddress(supabase, user.id);

  if (
    !isVerificationEligible({
      realFirstName: profile.real_first_name,
      realLastName: profile.real_last_name,
      phone: profile.phone,
      location: profile.location,
      permanentAddress,
      avatarUrl: profile.avatar_url,
      galleryUrls,
      socialLinks,
    })
  ) {
    return {
      ok: false,
      error:
        "Najprv doplň všetky povinné údaje v profile (vrátane trvalého bydliska) a ulož profil.",
    };
  }

  const filledSocial = getFilledSocialLinks(socialLinks);
  const snapshot: VerificationSnapshot = {
    email: user.email ?? null,
    stageName: profile.full_name,
    realFirstName: profile.real_first_name,
    realLastName: profile.real_last_name,
    phone: profile.phone,
    location: profile.location,
    permanentAddress,
    avatarUrl: profile.avatar_url,
    galleryUrls,
    videoUrls,
    publicSlug: profile.public_slug,
    artistKind: profile.artist_kind,
    bio: profile.bio,
    socialLinks: Object.fromEntries(filledSocial.map((s) => [s.key, s.url])),
    planType: profile.plan_type,
  };

  const { data: created, error } = await supabase
    .from("verification_requests")
    .insert({
      dj_id: user.id,
      status: "pending",
      note: note?.trim() || null,
      snapshot,
    })
    .select("id")
    .single();

  if (error || !created) {
    return {
      ok: false,
      error: error?.message || "Žiadosť sa nepodarilo odoslať.",
    };
  }

  const admin = getAdminEmail();
  if (admin) {
    const site = getPublicSiteUrl();
    void sendAppEmail({
      to: admin,
      subject: `Nová žiadosť o overenie: ${snapshot.stageName || snapshot.email || "DJ"}`,
      html: `
        <p>DJ požiadal o overenie profilu.</p>
        <p><strong>${snapshot.stageName || "—"}</strong> (${snapshot.email || "—"})</p>
        <p>Lokalita: ${snapshot.location || "—"}</p>
        <p><a href="${site}/admin/verifications/${created.id}">Otvoriť žiadosť</a> ·
           <a href="${site}/admin/djs/${user.id}">Celý profil</a></p>
      `,
    });
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/admin");
  return { ok: true };
}

export async function listVerificationRequests(status?: VerificationStatus) {
  const { admin, supabase } = await requireAdmin();
  if (!admin) {
    return { ok: false as const, error: "Prístup len pre admina.", items: [] };
  }

  let query = supabase
    .from("verification_requests")
    .select("id, dj_id, status, note, admin_note, snapshot, created_at, reviewed_at")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return { ok: false as const, error: error.message, items: [] };
  }
  return { ok: true as const, items: data ?? [] };
}

export async function listAdminDjs(search?: string) {
  const { admin, supabase } = await requireAdmin();
  if (!admin) {
    return { ok: false as const, error: "Prístup len pre admina.", items: [] };
  }

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, real_first_name, real_last_name, location, avatar_url, public_slug, artist_kind, plan_type, is_verified, verified_at, created_at, phone"
    )
    .eq("role", "dj")
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    return { ok: false as const, error: error.message, items: [] };
  }

  const q = search?.trim().toLowerCase();
  const items = (data ?? []).filter((dj) => {
    if (!q) return true;
    const hay = [
      dj.full_name,
      dj.real_first_name,
      dj.real_last_name,
      dj.location,
      dj.public_slug,
      dj.phone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  return { ok: true as const, items };
}

export async function getAdminDjDetail(djId: string) {
  const { admin, supabase } = await requireAdmin();
  if (!admin) {
    return { ok: false as const, error: "Prístup len pre admina." };
  }

  const { data: liveProfile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", djId)
    .eq("role", "dj")
    .maybeSingle();

  if (error || !liveProfile) {
    return { ok: false as const, error: error?.message || "DJ neexistuje." };
  }

  const [
    { data: privateData },
    { data: requests },
    { data: billing },
    { data: bookings },
  ] = await Promise.all([
      supabase
        .from("dj_verification_private")
        .select("permanent_address, updated_at")
        .eq("dj_id", djId)
        .maybeSingle(),
      supabase
        .from("verification_requests")
        .select("id, status, note, admin_note, snapshot, created_at, reviewed_at")
        .eq("dj_id", djId)
        .order("created_at", { ascending: false }),
      supabase
        .from("dj_billing_profiles")
        .select(
          "legal_name, street_address, city, postal_code, country, ico, dic, registration_note"
        )
        .eq("dj_id", djId)
        .maybeSingle(),
      supabase
        .from("bookings")
        .select(
          "id, event_date, end_date, start_time, end_time, event_type, event_location, status, type, title, client_name, client_email, price, created_at"
        )
        .eq("dj_id", djId)
        .order("event_date", { ascending: false })
        .limit(80),
    ]);

  return {
    ok: true as const,
    liveProfile,
    permanentAddress: (privateData?.permanent_address as string | null) || null,
    requests: requests ?? [],
    billing,
    bookings: bookings ?? [],
  };
}

export async function getVerificationRequest(id: string) {
  const { admin, supabase } = await requireAdmin();
  if (!admin) {
    return { ok: false as const, error: "Prístup len pre admina." };
  }

  const { data, error } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return { ok: false as const, error: error?.message || "Žiadosť neexistuje." };
  }

  const detail = await getAdminDjDetail(data.dj_id as string);
  if (!detail.ok) {
    return { ok: false as const, error: detail.error };
  }

  return {
    ok: true as const,
    request: data,
    liveProfile: detail.liveProfile,
    permanentAddress: detail.permanentAddress,
    billing: detail.billing,
    requests: detail.requests,
    bookings: detail.bookings,
  };
}

export async function reviewVerificationRequest(input: {
  id: string;
  decision: "approved" | "rejected";
  adminNote?: string;
}): Promise<ActionResult> {
  const { user, admin, supabase } = await requireAdmin();
  if (!user || !admin) {
    return { ok: false, error: "Prístup len pre admina." };
  }

  const { data: request } = await supabase
    .from("verification_requests")
    .select("id, dj_id, status")
    .eq("id", input.id)
    .maybeSingle();

  if (!request) return { ok: false, error: "Žiadosť neexistuje." };
  if (request.status !== "pending") {
    return { ok: false, error: "Táto žiadosť už bola vybavená." };
  }

  const now = new Date().toISOString();
  const { error: updateReqError } = await supabase
    .from("verification_requests")
    .update({
      status: input.decision,
      admin_note: input.adminNote?.trim() || null,
      reviewed_by: user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", input.id);

  if (updateReqError) {
    return { ok: false, error: updateReqError.message };
  }

  if (input.decision === "approved") {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        is_verified: true,
        verified_at: now,
        updated_at: now,
      })
      .eq("id", request.dj_id);

    if (profileError) {
      return { ok: false, error: profileError.message };
    }
  }

  const { data: djSlug } = await supabase
    .from("profiles")
    .select("public_slug")
    .eq("id", request.dj_id)
    .maybeSingle();

  revalidatePath(`/admin/verifications/${input.id}`);
  revalidatePath(`/admin/djs/${request.dj_id}`);
  revalidateDjPublic(djSlug?.public_slug);
  return { ok: true };
}

export async function setDjVerified(input: {
  djId: string;
  verified: boolean;
  adminNote?: string;
}): Promise<ActionResult> {
  const { user, admin, supabase } = await requireAdmin();
  if (!user || !admin) {
    return { ok: false, error: "Prístup len pre admina." };
  }

  const { data: dj } = await supabase
    .from("profiles")
    .select("id, public_slug, role, is_verified")
    .eq("id", input.djId)
    .maybeSingle();

  if (!dj || dj.role !== "dj") {
    return { ok: false, error: "DJ neexistuje." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      is_verified: input.verified,
      verified_at: input.verified ? now : null,
      updated_at: now,
    })
    .eq("id", input.djId);

  if (error) return { ok: false, error: error.message };

  if (input.verified) {
    const { data: pending } = await supabase
      .from("verification_requests")
      .select("id")
      .eq("dj_id", input.djId)
      .eq("status", "pending");

    if (pending?.length) {
      await supabase
        .from("verification_requests")
        .update({
          status: "approved",
          admin_note: input.adminNote?.trim() || "Schválené adminom manuálne.",
          reviewed_by: user.id,
          reviewed_at: now,
          updated_at: now,
        })
        .eq("dj_id", input.djId)
        .eq("status", "pending");
    }
  }

  revalidatePath(`/admin/djs/${input.djId}`);
  revalidatePath("/admin/verifications");
  revalidateDjPublic(dj.public_slug);
  return { ok: true };
}
