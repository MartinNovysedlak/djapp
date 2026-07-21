"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";
import {
  GOOGLE_REVIEW_LINK_ERROR,
  isValidGoogleReviewLink,
  normalizeGoogleReviewLink,
} from "@/lib/google-review";

export type MarketingSettings = {
  googleReviewLink: string | null;
};

export type MarketingSettingsResult = {
  ok: boolean;
  error?: string;
  settings?: MarketingSettings;
};

async function requireDj() {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { error: "Musíš byť prihlásený." as const, supabase, userId: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, google_review_link")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile || profile.role === "client") {
    return {
      error: "Len umelecké účty môžu upravovať marketingové nastavenia." as const,
      supabase,
      userId: null,
    };
  }

  return { error: null, supabase, userId: authData.user.id, profile };
}

export async function getMarketingSettings(): Promise<MarketingSettingsResult> {
  const ctx = await requireDj();
  if (ctx.error || !ctx.profile) {
    return { ok: false, error: ctx.error ?? "Profil nenájdený." };
  }

  return {
    ok: true,
    settings: {
      googleReviewLink: (ctx.profile.google_review_link as string | null) ?? null,
    },
  };
}

export async function updateMarketingSettings(input: {
  googleReviewLink: string;
}): Promise<MarketingSettingsResult> {
  const ctx = await requireDj();
  if (ctx.error || !ctx.userId) {
    return { ok: false, error: ctx.error ?? "Neautorizované." };
  }

  const link = normalizeGoogleReviewLink(input.googleReviewLink);
  if (!isValidGoogleReviewLink(link)) {
    return { ok: false, error: GOOGLE_REVIEW_LINK_ERROR };
  }

  const { data, error } = await ctx.supabase
    .from("profiles")
    .update({ google_review_link: link || null })
    .eq("id", ctx.userId)
    .select("google_review_link")
    .single();

  if (error) {
    console.error("[updateMarketingSettings]", error);
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    settings: {
      googleReviewLink: (data.google_review_link as string | null) ?? null,
    },
  };
}
