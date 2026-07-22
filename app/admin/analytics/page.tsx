"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Clock3,
  Loader2,
  TrendingDown,
  UserPlus,
  Users,
} from "lucide-react";
import {
  getAdminPlatformAnalytics,
  type AdminPlatformAnalytics,
} from "@/app/actions/admin-analytics";

function formatAge(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} d`;
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warn" | "good" | "danger";
}) {
  const toneClass =
    tone === "warn"
      ? "border-amber-500/25 bg-amber-500/5"
      : tone === "good"
        ? "border-emerald-500/25 bg-emerald-500/5"
        : tone === "danger"
          ? "border-rose-500/25 bg-rose-500/5"
          : "border-white/10 bg-card/60";

  return (
    <div className={`rounded-3xl border px-4 py-4 ${toneClass}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function FunnelBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const width = total > 0 ? Math.max(4, Math.round((count / total) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="tabular-nums text-zinc-400">
          {count}
          <span className="text-zinc-600">
            {" "}
            / {total} · {total > 0 ? Math.round((count / total) * 100) : 0}%
          </span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminPlatformAnalytics | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getAdminPlatformAnalytics();
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setData(null);
      } else {
        setError(null);
        setData(result.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin" />
        Počítam metriky…
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-rose-300">{error || "Chyba načítania."}</p>;
  }

  const maxDay = Math.max(
    1,
    ...data.signupsByDay.map((d) => d.djs + d.clients)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
          <Activity className="size-6 text-violet-300" />
          Platformová analytika
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Kde ľudia odpadávajú, koľko DJ dokončí profil a koľko dopytov ostáva
          bez odpovede. Aktualizované{" "}
          {new Date(data.generatedAt).toLocaleString("sk-SK")}.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          <UserPlus className="size-3.5" />
          Používatelia
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="DJ účty"
            value={data.users.djs}
            hint={`+${data.users.djsLast7d} za 7 dní · +${data.users.djsLast30d} za 30 dní`}
          />
          <StatCard
            label="Klientské účty"
            value={data.users.clients}
            hint={`+${data.users.clientsLast7d} za 7 dní · +${data.users.clientsLast30d} za 30 dní`}
          />
          <StatCard
            label="Dopyty (7 dní)"
            value={data.bookings.last7d}
            hint={`Pending ${data.bookings.pending} · Accepted ${data.bookings.accepted}`}
          />
          <StatCard
            label="Overenia čakajú"
            value={data.verifications.pending}
            hint={`Schválené ${data.verifications.approved} · Zamietnuté ${data.verifications.rejected}`}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-card/50 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <TrendingDown className="size-5 text-violet-300" />
            Funnel DJ aktivácie
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Registrácia → avatar → kompletný profil (kritériá overenia) →
            overený badge.
          </p>
        </div>
        <div className="space-y-4">
          <FunnelBar
            label="Registrovaní DJ"
            count={data.funnel.registeredDjs}
            total={data.funnel.registeredDjs}
            color="bg-zinc-400"
          />
          <FunnelBar
            label="Majú avatar"
            count={data.funnel.withAvatar}
            total={data.funnel.registeredDjs}
            color="bg-violet-400"
          />
          <FunnelBar
            label="Kompletný profil"
            count={data.funnel.profileComplete}
            total={data.funnel.registeredDjs}
            color="bg-fuchsia-400"
          />
          <FunnelBar
            label="Overení"
            count={data.funnel.verified}
            total={data.funnel.registeredDjs}
            color="bg-emerald-400"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Avatar rate"
            value={`${data.funnelRates.avatarRate}%`}
          />
          <StatCard
            label="Complete rate"
            value={`${data.funnelRates.completeRate}%`}
            tone={data.funnelRates.completeRate < 40 ? "warn" : "good"}
          />
          <StatCard
            label="Verified rate"
            value={`${data.funnelRates.verifiedRate}%`}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-rose-500/20 bg-rose-500/[0.04] p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <AlertTriangle className="size-5 text-rose-300" />
            Riziko dôvery — dopyty bez odpovede DJ
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Pending dopyty bez ponuky od DJ. Toto je najväčšie riziko, že
            klienti platforme prestanú veriť.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Bez odpovede"
            value={data.trust.pendingNoResponse}
            tone={data.trust.pendingNoResponse > 0 ? "danger" : "good"}
          />
          <StatCard
            label="Staršie ako 24 h"
            value={data.trust.pendingStale24h}
            tone={data.trust.pendingStale24h > 0 ? "warn" : "default"}
          />
          <StatCard
            label="Staršie ako 72 h"
            value={data.trust.pendingStale72h}
            tone={data.trust.pendingStale72h > 0 ? "danger" : "default"}
          />
          <StatCard
            label="Response rate"
            value={`${data.trust.responseRatePct}%`}
            hint={`Bulk pending items: ${data.trust.bulkItemsPending}`}
            tone={data.trust.responseRatePct < 70 ? "warn" : "good"}
          />
        </div>

        {data.trust.staleItems.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-500">
            Žiadne dopyty bez odpovede. Super.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 border-b border-white/10 bg-black/30 px-4 py-2 text-[11px] uppercase tracking-wide text-zinc-500">
              <span>DJ</span>
              <span>Klient</span>
              <span>Vek</span>
              <span />
            </div>
            <ul className="divide-y divide-white/5">
              {data.trust.staleItems.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-white">{item.djName}</p>
                    {item.isBulk ? (
                      <p className="text-[11px] text-violet-300/80">Bulk</p>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-zinc-300">{item.clientName}</p>
                    <p className="text-[11px] text-zinc-600">
                      {item.eventDate
                        ? new Date(item.eventDate).toLocaleDateString("sk-SK")
                        : "—"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 tabular-nums ${
                      item.ageHours >= 72
                        ? "text-rose-300"
                        : item.ageHours >= 24
                          ? "text-amber-300"
                          : "text-zinc-400"
                    }`}
                  >
                    <Clock3 className="size-3.5" />
                    {formatAge(item.ageHours)}
                  </span>
                  <Link
                    href={`/admin/djs/${item.djId}`}
                    className="text-xs text-violet-300 hover:underline"
                  >
                    DJ
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-card/50 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Users className="size-5 text-violet-300" />
          Registrácie (30 dní)
        </h2>
        <div className="flex h-28 items-end gap-1">
          {data.signupsByDay.map((d) => {
            const total = d.djs + d.clients;
            const h = Math.round((total / maxDay) * 100);
            return (
              <div
                key={d.day}
                className="group relative flex flex-1 flex-col justify-end"
                title={`${d.day}: ${d.djs} DJ, ${d.clients} klienti`}
              >
                <div
                  className="w-full rounded-t-sm bg-gradient-to-t from-violet-600/80 to-fuchsia-500/70 transition-opacity group-hover:opacity-100"
                  style={{ height: `${Math.max(total > 0 ? 8 : 2, h)}%` }}
                />
              </div>
            );
          })}
        </div>
        <p className="text-xs text-zinc-500">
          Hover nad stĺpcom = deň. Fialová = súčet DJ + klient registrácií.
        </p>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-card/50 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <BadgeCheck className="size-5 text-violet-300" />
          Neúplné DJ profily
        </h2>
        {data.incompleteDjs.length === 0 ? (
          <p className="text-sm text-zinc-500">Všetci DJ majú kompletný profil.</p>
        ) : (
          <ul className="space-y-2">
            {data.incompleteDjs.map((dj) => (
              <li key={dj.id}>
                <Link
                  href={`/admin/djs/${dj.id}`}
                  className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 transition-colors hover:border-violet-500/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-white">{dj.name}</p>
                    <p className="text-xs text-zinc-500">
                      Chýba: {dj.missing.join(", ")}
                    </p>
                  </div>
                  <span className="text-xs tabular-nums text-amber-300/90">
                    {dj.missing.length} položiek
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
