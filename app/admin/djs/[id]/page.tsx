"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Loader2, ShieldOff } from "lucide-react";

import {
  getAdminDjDetail,
  setDjVerified,
} from "@/app/actions/verification";
import { AdminDjProfilePanel } from "@/components/admin/AdminDjProfileView";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast-context";

export default function AdminDjDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getAdminDjDetail>
  > | null>(null);

  async function load() {
    const result = await getAdminDjDetail(params.id);
    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getAdminDjDetail(params.id);
      if (cancelled) return;
      setData(result);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function toggleVerified(verified: boolean) {
    setBusy(true);
    const result = await setDjVerified({
      djId: params.id,
      verified,
      adminNote: verified ? "Udelené adminom manuálne." : undefined,
    });
    setBusy(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast(
      verified ? "Overenie udelené." : "Overenie odobraté.",
      "success"
    );
    await load();
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin" />
        Načítavam DJ…
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <p className="text-sm text-rose-300">
        {data && "error" in data ? data.error : "DJ sa nenašiel."}
      </p>
    );
  }

  const profile = data.liveProfile;
  const pending = data.requests.find((r) => r.status === "pending");

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Späť na prehľad
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Detail DJ</h1>
          <p className="text-sm text-zinc-500">
            Kompletný profil na overenie. Overenie môžeš udeliť alebo odobrať.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.is_verified ? (
            <Button
              type="button"
              disabled={busy}
              variant="outline"
              onClick={() => toggleVerified(false)}
              className="rounded-full border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
            >
              <ShieldOff className="size-4" />
              Odobrať overenie
            </Button>
          ) : (
            <Button
              type="button"
              disabled={busy}
              onClick={() => toggleVerified(true)}
              className="rounded-full bg-emerald-500 text-black hover:bg-emerald-400"
            >
              <BadgeCheck className="size-4" />
              Udeliť overenie
            </Button>
          )}
        </div>
      </div>

      {pending ? (
        <p className="rounded-2xl border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
          Má čakajúcu žiadosť.{" "}
          <Link
            href={`/admin/verifications/${pending.id}`}
            className="underline hover:text-white"
          >
            Otvoriť žiadosť
          </Link>
        </p>
      ) : null}

      <AdminDjProfilePanel
        profile={profile}
        permanentAddress={data.permanentAddress}
        billing={data.billing}
        bookings={data.bookings}
      />

      {data.requests.length > 0 ? (
        <section className="rounded-3xl border border-white/10 bg-card/60 p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">
            História žiadostí
          </h3>
          <ul className="space-y-2 text-sm">
            {data.requests.map((req) => (
              <li key={req.id}>
                <Link
                  href={`/admin/verifications/${req.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 px-3 py-2 hover:bg-white/5"
                >
                  <span className="text-zinc-300">
                    {new Date(req.created_at).toLocaleString("sk-SK")}
                  </span>
                  <span className="text-xs uppercase text-zinc-500">
                    {req.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
