/** Freemium plans: Free + Premium (€5.99/mo) with 14-day Premium trial for DJs. */

export const PLAN_FREE = "free" as const;
export const PLAN_PREMIUM = "premium" as const;

export const PREMIUM_PRICE_EUR = 5.99;
export const PREMIUM_PRICE_LABEL = "€5,99";
export const TRIAL_DAYS = 14;

export type PlanFields = {
  plan_type?: string | null;
  trial_ends_at?: string | null;
  premium_until?: string | null;
};

export function normalizePlanType(
  planType: string | null | undefined
): typeof PLAN_FREE | typeof PLAN_PREMIUM {
  if (planType === PLAN_PREMIUM || planType === "pro") return PLAN_PREMIUM;
  return PLAN_FREE;
}

export function isTrialActive(
  profile: PlanFields | null | undefined,
  now = new Date()
): boolean {
  if (!profile?.trial_ends_at) return false;
  return new Date(profile.trial_ends_at).getTime() > now.getTime();
}

export function isPaidPremiumActive(
  profile: PlanFields | null | undefined,
  now = new Date()
): boolean {
  if (!profile) return false;
  if (normalizePlanType(profile.plan_type) !== PLAN_PREMIUM) return false;
  if (!profile.premium_until) return true;
  return new Date(profile.premium_until).getTime() > now.getTime();
}

/** True when the artist can use Premium dashboard features (paid or trial). */
export function hasPremiumAccess(
  profile: PlanFields | null | undefined,
  now = new Date()
): boolean {
  if (!profile) return false;
  return isTrialActive(profile, now) || isPaidPremiumActive(profile, now);
}

export function getPlanDisplayName(
  profile: PlanFields | null | undefined,
  now = new Date()
): string {
  if (isPaidPremiumActive(profile, now)) return "Premium";
  if (isTrialActive(profile, now)) return "Premium trial";
  return "Free";
}

export function getTrialDaysLeft(
  profile: PlanFields | null | undefined,
  now = new Date()
): number | null {
  if (!profile?.trial_ends_at || !isTrialActive(profile, now)) return null;
  const ms = new Date(profile.trial_ends_at).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Free DJs may only use profile. Everything else under /dashboard is Premium. */
export function isPremiumDashboardPath(pathname: string): boolean {
  if (!pathname.startsWith("/dashboard")) return false;
  if (pathname === "/dashboard" || pathname === "/dashboard/") return false;
  if (
    pathname === "/dashboard/profile" ||
    pathname.startsWith("/dashboard/profile/")
  ) {
    return false;
  }
  return true;
}

export function formatPremiumPrice(): string {
  return `${PREMIUM_PRICE_LABEL} / mesiac`;
}
