"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Loader2, ShieldOff } from "lucide-react";

import {
  getVerificationRequest,
  reviewVerificationRequest,
  setDjVerified,
} from "@/app/actions/verification";
import { AdminDjProfilePanel } from "@/components/admin/AdminDjProfileView";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast-context";
import type { VerificationSnapshot } from "@/lib/verification";

export default function AdminVerificationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getVerificationRequest>
  > | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getVerificationRequest(params.id);
      if (cancelled) return;
      setData(result);
      if (result.ok && result.request.admin_note) {
        setAdminNote(result.request.admin_note);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    const result = await reviewVerificationRequest({
      id: params.id,
      decision,
      adminNote,
    });
    setBusy(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast(
      decision === "approved" ? "Profil overený." : "Žiadosť zamietnutá.",
      "success"
    );
    router.push("/admin/verifications");
    router.refresh();
  }

  async function revoke() {
    if (!data?.ok) return;
    setBusy(true);
    const result = await setDjVerified({
      djId: data.liveProfile.id,
      verified: false,
    });
    setBusy(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Overenie odobraté.", "success");
    router.refresh();
    const refreshed = await getVerificationRequest(params.id);
    setData(refreshed);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin" />
        Načítavam žiadosť…
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <p className="text-sm text-rose-300">
        {data && "error" in data ? data.error : "Žiadosť sa nenašla."}
      </p>
    );
  }

  const snap = (data.request.snapshot || {}) as VerificationSnapshot;
  const live = data.liveProfile;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/verifications"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Späť na zoznam
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Žiadosť: {snap.stageName || live.full_name || "DJ"}
          </h1>
          <p className="text-sm text-zinc-500">
            Status: <span className="text-zinc-300">{data.request.status}</span>
            {" · "}
            <Link
              href={`/admin/djs/${live.id}`}
              className="text-violet-300 hover:underline"
            >
              Celý profil DJ
            </Link>
          </p>
        </div>
        {live.is_verified ? (
          <Button
            type="button"
            disabled={busy}
            variant="outline"
            onClick={revoke}
            className="rounded-full border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
          >
            <ShieldOff className="size-4" />
            Odobrať overenie
          </Button>
        ) : null}
      </div>

      {data.request.note ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
          Poznámka od DJ: {data.request.note}
        </p>
      ) : null}

      {snap.permanentAddress ? (
        <p className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
          <span className="font-medium">Trvalé bydlisko (zo žiadosti):</span>{" "}
          {snap.permanentAddress}
        </p>
      ) : null}

      <AdminDjProfilePanel
        profile={live}
        permanentAddress={data.permanentAddress || snap.permanentAddress}
        billing={data.billing}
        email={snap.email}
        bookings={data.bookings}
      />

      {data.request.status === "pending" ? (
        <section className="rounded-3xl border border-violet-500/25 bg-violet-500/10 p-5">
          <label className="mb-2 block text-sm font-medium text-white">
            Poznámka admina (voliteľné)
          </label>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={3}
            className="mb-4 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40"
            placeholder="Napr. dôvod zamietnutia…"
          />
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={busy}
              onClick={() => decide("approved")}
              className="rounded-full bg-emerald-500 text-black hover:bg-emerald-400"
            >
              <BadgeCheck className="size-4" />
              Schváliť overenie
            </Button>
            <Button
              type="button"
              disabled={busy}
              variant="outline"
              onClick={() => decide("rejected")}
              className="rounded-full border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
            >
              Zamietnuť
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
