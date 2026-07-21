"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import {
  PREMIUM_PRICE_LABEL,
  TRIAL_DAYS,
  formatPremiumPrice,
  getTrialDaysLeft,
  isTrialActive,
  type PlanFields,
} from "@/lib/plans";

type Props = {
  profile: PlanFields | null | undefined;
};

/** Shown when a Free (post-trial) DJ opens a Premium-only dashboard page. */
export function PremiumUpgradeGate({ profile }: Props) {
  const trialDays = getTrialDaysLeft(profile);
  const onTrial = isTrialActive(profile);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
        <Sparkles className="size-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-white">
        Toto je Premium funkcia
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        {onTrial
          ? `Trial ti ešte beží (${trialDays} ${trialDays === 1 ? "deň" : "dní"}). Ak toto vidíš, obnov stránku.`
          : `Free plán obsahuje verejný profil a katalóg. Rezervácie, kalendár, dokumenty a ďalšie nástroje sú v Premium za ${formatPremiumPrice()}. Prvých ${TRIAL_DAYS} dní je Premium zadarmo pri registrácii.`}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard/profile"
          className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          Späť na profil
        </Link>
        <Link
          href="/dashboard/profile?upgrade=1"
          className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-[0_12px_36px_-10px_oklch(0.6_0.26_295/0.9)] transition-all hover:brightness-110"
        >
          Premium {PREMIUM_PRICE_LABEL}/mes.
        </Link>
      </div>
    </div>
  );
}
