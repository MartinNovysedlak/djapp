"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Ban,
  CalendarDays,
  Loader2,
  Music2,
  Radio,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getDjAnalytics,
  type DjAnalyticsBundle,
  type FuzzySongStat,
} from "@/app/actions/analytics";
import { Reveal } from "@/components/motion";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString("sk-SK", {
    month: "short",
    year: "2-digit",
  });
}

function TopList({
  title,
  subtitle,
  icon,
  accent,
  items,
  empty,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  accent: string;
  items: FuzzySongStat[];
  empty: string;
}) {
  const max = Math.max(...items.map((i) => i.request_count), 1);

  return (
    <section className="rounded-3xl border border-white/10 bg-card/70 p-5 backdrop-blur-md md:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-2xl border",
            accent
          )}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">{empty}</p>
      ) : (
        <ol className="space-y-3">
          {items.map((item, idx) => {
            const pct = Math.round((item.request_count / max) * 100);
            return (
              <li key={`${item.cluster_key}-${idx}`} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      <span className="mr-2 text-zinc-500">{idx + 1}.</span>
                      {item.display_title}
                    </p>
                    <p className="truncate pl-6 text-xs text-zinc-500">
                      {item.display_artist}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-zinc-300">
                    {item.request_count}×
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      accent.includes("emerald") && "bg-emerald-400/80",
                      accent.includes("red") && "bg-red-400/80",
                      accent.includes("violet") && "bg-violet-400/80"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-white">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export default function AnalyticsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DjAnalyticsBundle | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getDjAnalytics();
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setData(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.activity.by_month.map((row) => ({
      month: monthLabel(row.month),
      count: row.count,
    }));
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl pt-4">
      <Reveal>
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-violet-300">
            <TrendingUp className="size-4" />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
              Globálne naprieč akciami
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Analytika
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-zinc-500">
            Rebríčky spájajú rovnaké skladby podľa názvu (aj s preklepmi).
            Rôzni interpreti pri tom istom názve sa spočítajú spolu.
          </p>
        </div>
      </Reveal>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="size-7 animate-spin text-violet-400" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <Reveal delay={40}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Akcie tento mesiac"
                value={data.activity.this_month}
                hint="Potvrdené podľa dátumu akcie"
              />
              <StatCard
                label="Akcie tento týždeň"
                value={data.activity.this_week}
              />
              <StatCard
                label="Najbližších 30 dní"
                value={data.activity.next_30_days}
              />
              <StatCard
                label="Celkom potvrdených"
                value={data.activity.accepted_total}
                hint={`${data.activity.pending_total} čaká`}
              />
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard
                label="Live želania (spolu)"
                value={data.activity.live_requests_total}
              />
              <StatCard
                label="Skladby v plánovači"
                value={data.activity.planner_songs_total}
              />
            </div>
          </Reveal>

          <Reveal delay={100}>
            <section className="rounded-3xl border border-white/10 bg-card/70 p-5 backdrop-blur-md md:p-6">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="size-4 text-violet-300" />
                <h2 className="text-base font-semibold text-white">
                  Potvrdené akcie po mesiacoch
                </h2>
              </div>
              {chartData.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">
                  Zatiaľ nie sú dáta na graf.
                </p>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "#a1a1aa", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#a1a1aa", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{
                          background: "#111",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey="count"
                        name="Akcie"
                        fill="oklch(0.66 0.26 295)"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </Reveal>

          <div className="grid gap-4 lg:grid-cols-3">
            <Reveal delay={120}>
              <TopList
                title="Top Must Play"
                subtitle="Čo klienti najviac chcú"
                icon={<Sparkles className="size-4 text-emerald-300" />}
                accent="border-emerald-500/25 bg-emerald-500/10"
                items={data.mustPlay}
                empty="Zatiaľ žiadne must-play skladby."
              />
            </Reveal>
            <Reveal delay={160}>
              <TopList
                title="Top Blacklist"
                subtitle="Čo klienti najviac nechcú"
                icon={<Ban className="size-4 text-red-300" />}
                accent="border-red-500/25 bg-red-500/10"
                items={data.blacklist}
                empty="Čierna listina je zatiaľ prázdna."
              />
            </Reveal>
            <Reveal delay={200}>
              <TopList
                title="Top Live Requests"
                subtitle="Čo hostia pýtajú naživo"
                icon={<Radio className="size-4 text-violet-300" />}
                accent="border-violet-500/25 bg-violet-500/10"
                items={data.live}
                empty="Zatiaľ žiadne live želania."
              />
            </Reveal>
          </div>

          <Reveal delay={240}>
            <p className="flex items-center gap-2 text-center text-xs text-zinc-600 lg:justify-center">
              <Music2 className="size-3.5" />
              Fuzzy grouping podľa názvu piesne (pg_trgm ≥ 0.65)
            </p>
          </Reveal>
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-zinc-500">
          Štatistiky nie sú dostupné.
        </p>
      )}
    </div>
  );
}
