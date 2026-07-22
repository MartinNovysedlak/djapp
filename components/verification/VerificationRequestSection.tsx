"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Check, Loader2, X } from "lucide-react";

import {
  getMyVerificationState,
  submitVerificationRequest,
} from "@/app/actions/verification";
import { useDashboardUser } from "@/components/DashboardUserContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/lib/toast-context";
import {
  getVerificationRequirements,
  isVerificationEligible,
} from "@/lib/verification";

function scrollToAnchor(anchor?: string) {
  if (!anchor || typeof document === "undefined") return;
  document.getElementById(anchor)?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

export function VerificationRequestSection() {
  const { profile } = useDashboardUser();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [latestStatus, setLatestStatus] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<string | null>(null);
  const [permanentAddress, setPermanentAddress] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const state = await getMyVerificationState();
      if (cancelled) return;
      if (state.ok) {
        setIsVerified(state.isVerified);
        setPendingId(state.pendingRequestId);
        setLatestStatus(state.latestStatus);
        setAdminNote(state.latestAdminNote);
        setPermanentAddress(state.permanentAddress);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    profile?.updated_at,
    profile?.gallery_urls,
    profile?.avatar_url,
    profile?.social_links,
    profile?.real_first_name,
    profile?.real_last_name,
    profile?.phone,
    profile?.location,
  ]);

  const eligibilityInput = {
    realFirstName: profile?.real_first_name,
    realLastName: profile?.real_last_name,
    phone: profile?.phone,
    location: profile?.location,
    permanentAddress,
    avatarUrl: profile?.avatar_url,
    galleryUrls: profile?.gallery_urls,
    socialLinks: profile?.social_links,
  };
  const requirements = getVerificationRequirements(eligibilityInput);
  const eligible = isVerificationEligible(eligibilityInput);
  const missingCount = requirements.filter((r) => !r.ok).length;

  async function handleSubmit() {
    setSubmitting(true);
    const result = await submitVerificationRequest();
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Žiadosť o overenie bola odoslaná.", "success");
    setPendingId("pending");
    setLatestStatus("pending");
  }

  if (loading) {
    return (
      <Card className="rounded-3xl border-white/10 bg-card/70 backdrop-blur-md">
        <CardContent className="flex items-center gap-2 py-8 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" />
          Načítavam overenie…
        </CardContent>
      </Card>
    );
  }

  if (isVerified || profile?.is_verified) {
    return (
      <Card className="rounded-3xl border-emerald-500/25 bg-emerald-500/10 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-emerald-300">
            <BadgeCheck className="size-5" />
            Profil je overený
          </CardTitle>
          <CardDescription className="text-emerald-200/70">
            Pri tvojom profile sa zobrazuje verified badge — klienti ti môžu viac
            dôverovať.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-white/10 bg-card/70 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <BadgeCheck className="size-5 text-violet-300" />
          Overenie profilu
        </CardTitle>
        <CardDescription>
          Overený badge zvyšuje dôveru klientov. Všetky údaje doplň priamo v
          tomto profile, ulož zmeny a potom pošli žiadosť.
          {missingCount > 0 ? (
            <span className="mt-1 block text-zinc-400">
              Ešte chýba {missingCount}{" "}
              {missingCount === 1 ? "údaj" : missingCount < 5 ? "údaje" : "údajov"}
              . Klikni na položku a skoč na pole.
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ul className="space-y-2.5">
          {requirements.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => scrollToAnchor(item.anchor)}
                className="flex w-full items-start gap-2.5 rounded-2xl px-1 py-1 text-left text-sm text-zinc-300 transition-colors hover:bg-white/5"
              >
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                    item.ok
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-white/5 text-zinc-500"
                  }`}
                >
                  {item.ok ? (
                    <Check className="size-3.5" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                </span>
                <span>
                  <span className="font-medium text-white">{item.label}</span>
                  {!item.ok ? (
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {item.hint}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {latestStatus === "rejected" ? (
          <p className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            Predchádzajúca žiadosť bola zamietnutá
            {adminNote ? `: ${adminNote}` : "."} Môžeš doplniť údaje a poslať
            znova.
          </p>
        ) : null}

        {pendingId || latestStatus === "pending" ? (
          <p className="rounded-2xl border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
            Žiadosť čaká na schválenie adminom.
          </p>
        ) : (
          <Button
            type="button"
            disabled={!eligible || submitting}
            onClick={handleSubmit}
            className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Odosielam…
              </>
            ) : (
              "Požiadať o overenie"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
