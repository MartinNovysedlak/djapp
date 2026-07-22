"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, Loader2, Search, Users } from "lucide-react";

import { listAdminDjs } from "@/app/actions/verification";
import { Input } from "@/components/ui/input";

type DjItem = {
  id: string;
  full_name: string | null;
  real_first_name: string | null;
  real_last_name: string | null;
  location: string | null;
  avatar_url: string | null;
  public_slug: string | null;
  artist_kind: string | null;
  plan_type: string | null;
  is_verified: boolean | null;
  created_at: string;
};

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<DjItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        setLoading(true);
        const result = await listAdminDjs(search);
        if (cancelled) return;
        if (!result.ok) {
          setError(result.error);
          setItems([]);
        } else {
          setError(null);
          setItems(result.items as DjItem[]);
        }
        setLoading(false);
      })();
    }, search ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Users className="size-6 text-violet-300" />
            Prehľad DJ
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Pozri všetkých umelcov, udel alebo odober overenie bez žiadosti.
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hľadať meno, lokalitu…"
            className="pl-9"
          />
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
          Žiadni DJ.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((dj) => (
            <Link
              key={dj.id}
              href={`/admin/djs/${dj.id}`}
              className="flex items-center gap-4 rounded-3xl border border-white/10 bg-card/60 px-4 py-3 transition-colors hover:border-violet-500/30 hover:bg-violet-500/5"
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl border border-white/10">
                {dj.avatar_url ? (
                  <Image
                    src={dj.avatar_url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-white/5 text-[10px] text-zinc-500">
                    —
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">
                  {dj.full_name || "Bez mena"}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {[dj.real_first_name, dj.real_last_name]
                    .filter(Boolean)
                    .join(" ") || "—"}
                  {dj.location ? ` · ${dj.location}` : ""}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  dj.is_verified
                    ? "bg-sky-500/15 text-sky-300"
                    : "bg-white/5 text-zinc-400"
                }`}
              >
                <BadgeCheck className="size-3" />
                {dj.is_verified ? "Overený" : "Neoverený"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
