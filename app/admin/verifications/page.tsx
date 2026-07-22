"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Loader2 } from "lucide-react";

import { listVerificationRequests } from "@/app/actions/verification";
import type { VerificationSnapshot } from "@/lib/verification";

type Item = {
  id: string;
  dj_id: string;
  status: string;
  created_at: string;
  snapshot: VerificationSnapshot | Record<string, unknown>;
};

export default function AdminVerificationsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await listVerificationRequests(
        filter === "pending" ? "pending" : undefined
      );
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setItems([]);
      } else {
        setError(null);
        setItems(result.items as Item[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Overenie profilov
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Skontroluj údaje DJ a schváľ alebo zamietni verified badge.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === "pending"
                ? "bg-violet-500/20 text-violet-200"
                : "bg-white/5 text-zinc-400"
            }`}
          >
            Čakajúce
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === "all"
                ? "bg-violet-500/20 text-violet-200"
                : "bg-white/5 text-zinc-400"
            }`}
          >
            Všetky
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" />
          Načítavam…
        </div>
      ) : error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : items.length === 0 ? (
        <p className="rounded-3xl border border-white/10 bg-card/50 px-5 py-8 text-sm text-zinc-500">
          Žiadne žiadosti.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const snap = item.snapshot as VerificationSnapshot;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-card/60 px-5 py-4 transition-colors hover:border-violet-500/30"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/verifications/${item.id}`}
                    className="block truncate font-medium text-white hover:text-violet-200"
                  >
                    {snap.stageName || "Bez mena"}
                  </Link>
                  <p className="truncate text-xs text-zinc-500">
                    {snap.email || "—"} · {snap.location || "bez lokality"} ·{" "}
                    {new Date(item.created_at).toLocaleString("sk-SK")}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-[11px]">
                    <Link
                      href={`/admin/verifications/${item.id}`}
                      className="text-violet-300 hover:underline"
                    >
                      Žiadosť →
                    </Link>
                    <Link
                      href={`/admin/djs/${item.dj_id}`}
                      className="text-zinc-400 hover:text-white hover:underline"
                    >
                      Celý profil DJ →
                    </Link>
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                    item.status === "pending"
                      ? "bg-violet-500/15 text-violet-300"
                      : item.status === "approved"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-rose-500/15 text-rose-300"
                  }`}
                >
                  <BadgeCheck className="size-3" />
                  {item.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
