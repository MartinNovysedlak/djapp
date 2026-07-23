"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";

import {
  PREMIUM_FEATURES,
  PREMIUM_PRICE_LABEL,
  TRIAL_DAYS,
  formatPremiumPrice,
  getTrialDaysLeft,
  isTrialActive,
  type PlanFields,
} from "@/lib/plans";
import {
  PremiumPaywallModal,
  redirectToStripeCheckout,
} from "@/components/PremiumPaywallModal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast-context";

type Props = {
  profile: PlanFields | null | undefined;
};

/** Shown when a Free (post-trial) DJ opens a Premium-only dashboard page. */
export function PremiumUpgradeGate({ profile }: Props) {
  const { showToast } = useToast();
  const trialDays = getTrialDaysLeft(profile);
  const onTrial = isTrialActive(profile);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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
      <ul className="mt-6 w-full space-y-2 text-left">
        {PREMIUM_FEATURES.slice(0, 4).map((item) => (
          <li key={item} className="text-sm text-zinc-400">
            • {item}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard/profile"
          className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          Späť na profil
        </Link>
        <Button
          type="button"
          disabled={busy}
          className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-[0_12px_36px_-10px_oklch(0.6_0.26_295/0.9)] transition-all hover:brightness-110"
          onClick={() => {
            setBusy(true);
            void redirectToStripeCheckout().catch((err: unknown) => {
              const message =
                err instanceof Error ? err.message : "Checkout zlyhal.";
              showToast(message, "error");
              setBusy(false);
              setPaywallOpen(true);
            });
          }}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Presmerovávam…
            </>
          ) : (
            `Premium ${PREMIUM_PRICE_LABEL}/mes.`
          )}
        </Button>
      </div>
      <PremiumPaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </div>
  );
}
