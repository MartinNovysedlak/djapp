import { createClient } from "@/utils/supabase/server";
import {
  hasPremiumAccess,
  type PlanFields,
} from "@/lib/plans";

export type PremiumGuardResult =
  | { ok: true; userId: string; profile: PlanFields & { id: string; role?: string } }
  | { ok: false; error: string; status: 401 | 403 };

/**
 * Server-side Premium gate for actions / API routes.
 * Uses the caller's SSR session + profiles row (RLS).
 */
export async function requirePremiumAccess(): Promise<PremiumGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Musíš byť prihlásený.", status: 401 };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, role, plan_type, trial_ends_at, premium_until, stripe_subscription_status"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return { ok: false, error: "Profil sa nenašiel.", status: 403 };
  }

  if (!hasPremiumAccess(profile)) {
    return {
      ok: false,
      error: "Táto funkcia vyžaduje Premium predplatné.",
      status: 403,
    };
  }

  return { ok: true, userId: user.id, profile };
}

/** Soft check — returns boolean without throwing. */
export async function checkPremiumAccess(): Promise<boolean> {
  const result = await requirePremiumAccess();
  return result.ok;
}
