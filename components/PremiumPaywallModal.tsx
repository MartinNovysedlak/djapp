"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast-context";
import {
  PREMIUM_FEATURES,
  PREMIUM_PRICE_LABEL,
  TRIAL_DAYS,
  formatPremiumPrice,
} from "@/lib/plans";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

async function startCheckout(): Promise<string> {
  const res = await fetch("/api/stripe/checkout", { method: "POST" });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error || "Checkout sa nepodarilo spustiť.");
  }
  return data.url;
}

/** Paywall modal with Premium benefits + Stripe Checkout CTA. */
export function PremiumPaywallModal({ open, onOpenChange }: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const url = await startCheckout();
      window.location.href = url;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Platba sa nepodarila spustiť.";
      showToast(message, "error");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-[#0c0c12] text-white sm:rounded-2xl">
        <DialogHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle className="text-xl">Premium {PREMIUM_PRICE_LABEL}/mes.</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Odomkni celý biznis toolkit. Pri registrácii máš {TRIAL_DAYS} dní
            Premium zadarmo — potom pokračuješ za {formatPremiumPrice()}.
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-2 space-y-2.5">
          {PREMIUM_FEATURES.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-300">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              {item}
            </li>
          ))}
        </ul>

        <DialogFooter className="mt-4 gap-2 sm:justify-stretch">
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-white/10"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Neskôr
          </Button>
          <Button
            type="button"
            className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 font-semibold text-white hover:brightness-110"
            onClick={() => void handleCheckout()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Presmerovávam…
              </>
            ) : (
              `Prejsť na platbu — ${PREMIUM_PRICE_LABEL}/mes.`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function redirectToStripeCheckout(): Promise<void> {
  const url = await startCheckout();
  window.location.href = url;
}

export async function redirectToStripePortal(): Promise<void> {
  const res = await fetch("/api/stripe/portal", { method: "POST" });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error || "Portál sa nepodarilo otvoriť.");
  }
  window.location.href = data.url;
}
