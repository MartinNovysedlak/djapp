"use client";

import Link from "next/link";
import { ArrowLeft, Receipt } from "lucide-react";
import { Reveal } from "@/components/motion";
import { BillingProfileForm } from "@/components/invoices/BillingProfileForm";
import { useDashboardUser } from "@/components/DashboardUserContext";

export default function InvoiceBillingSettingsPage() {
  const { loading: userLoading } = useDashboardUser();

  if (userLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-white/5" />
        <div className="mt-6 h-96 rounded-3xl bg-white/[0.03]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Reveal>
        <Link
          href="/dashboard/invoices/generate"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-3.5" />
          Späť na PDF faktúry
        </Link>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/10">
            <Receipt className="size-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Fakturačné údaje
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Číslovanie faktúr a splatnosť. IČO, IBAN a podobné údaje môžeš
              upraviť aj tu alebo v profile.
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="rounded-3xl border border-white/10 bg-card/70 p-6 backdrop-blur-md">
          <BillingProfileForm />
        </div>
      </Reveal>
    </div>
  );
}
