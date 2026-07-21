"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  MapPin,
  Loader2,
  ArrowRight,
  Users,
  Star,
  ArrowUpDown,
  Check,
  Scale,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Reveal, Aurora, Equalizer } from "@/components/motion";
import { cn } from "@/lib/utils";
import { getDjRealName, getDjStageName, getArtistKindLabel, getArtistPlanBadge, normalizeArtistKind, type ArtistKind } from "@/lib/dj-display";
import { hasPremiumAccess } from "@/lib/plans";
import { SiteFooter } from "@/components/SiteFooter";

type DJProfile = {
  id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  public_slug: string | null;
  location: string | null;
  plan_type: string;
  trial_ends_at?: string | null;
  premium_until?: string | null;
  created_at: string;
  real_first_name: string | null;
  real_last_name: string | null;
  show_real_name: boolean;
  artist_kind: ArtistKind | null;
};

type RatingInfo = { avg: number; count: number };

const SORT_OPTIONS = [
  { value: "rating", label: "Najlepšie hodnotenie" },
  { value: "name", label: "Abecedne (meno)" },
  { value: "location", label: "Podľa lokality" },
  { value: "newest", label: "Najnovší profil" },
];

const KIND_FILTERS: { value: "all" | ArtistKind; label: string }[] = [
  { value: "all", label: "Všetci" },
  { value: "dj", label: "DJ" },
  { value: "band", label: "Kapely" },
  { value: "dj_band", label: "DJ + Kapela" },
];

// ── Helper to generate gradient from name ──────────────────────────────────────
const gradients = [
  "from-violet-500 via-purple-500 to-fuchsia-500",
  "from-blue-500 via-cyan-400 to-teal-400",
  "from-rose-500 via-pink-500 to-fuchsia-400",
  "from-amber-400 via-orange-500 to-rose-500",
  "from-emerald-400 via-teal-500 to-cyan-500",
  "from-indigo-500 via-violet-500 to-purple-400",
  "from-fuchsia-500 via-pink-500 to-rose-400",
  "from-cyan-400 via-blue-500 to-indigo-500",
];

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Star-rating pill — always visible so every card has the same visual weight. */
function RatingBadge({ rating }: { rating: RatingInfo | undefined }) {
  if (!rating || rating.count === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-500">
        <Star className="size-3 text-zinc-600" />
        Zatiaľ bez hodnotení
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
      <Star className="size-3 fill-amber-400 text-amber-400" />
      {rating.avg.toFixed(1)}
      <span className="text-amber-300/60">({rating.count})</span>
    </span>
  );
}

// ── DJ Card ────────────────────────────────────────────────────────────────────
function DJCard({
  dj,
  rating,
  compareMode,
  selected,
  onToggle,
}: {
  dj: DJProfile;
  rating: RatingInfo | undefined;
  compareMode: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const name = getDjStageName(dj);
  const kindLabel = getArtistKindLabel(dj.artist_kind);
  const realName = getDjRealName(dj);
  const gradient = getGradient(name);
  const initials = getInitials(name);
  const slug = dj.public_slug || dj.id;

  const body = (
    <>
      <div
        className={`relative flex h-40 shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br ${gradient}`}
      >
        <div
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
        />
        {compareMode ? (
          <div
            className={cn(
              "absolute left-3 top-3 z-10 flex size-7 items-center justify-center rounded-full border-2 transition-colors",
              selected
                ? "border-violet-400 bg-violet-500 text-white"
                : "border-white/40 bg-black/40 text-transparent"
            )}
          >
            <Check className="size-4" />
          </div>
        ) : null}
        {dj.avatar_url ? (
          <div className="relative size-22 overflow-hidden rounded-full border-2 border-white/30 shadow-2xl transition-transform duration-500 group-hover:scale-110">
            <Image src={dj.avatar_url} alt={name} fill className="object-cover" />
          </div>
        ) : (
          <span className="text-5xl font-bold tracking-tight text-white/85 transition-transform duration-500 group-hover:scale-110">
            {initials}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-white transition-colors duration-300 group-hover:text-violet-200">
              {name}
              {kindLabel ? (
                <span className="ml-1.5 text-xs font-medium text-zinc-500">
                  ({kindLabel})
                </span>
              ) : null}
            </h3>
            {realName && (
              <p className="mt-0.5 truncate text-xs text-zinc-500">{realName}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
              hasPremiumAccess(dj)
                ? "border-violet-500/25 bg-violet-500/10 text-violet-300"
                : "border-white/10 bg-white/[0.04] text-zinc-500"
            }`}
          >
            {getArtistPlanBadge(dj.plan_type, dj.artist_kind, {
              trial_ends_at: dj.trial_ends_at,
              premium_until: dj.premium_until,
            })}
          </span>
        </div>

        <div className="mt-2 flex min-h-[1.5rem] flex-wrap items-center gap-2">
          {dj.location && (
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <MapPin className="size-3 shrink-0 text-violet-400/70" />
              <span className="truncate">{dj.location}</span>
            </div>
          )}
          <RatingBadge rating={rating} />
        </div>

        <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-zinc-500">
          {dj.bio ||
            (normalizeArtistKind(dj.artist_kind) === "band"
              ? "Táto kapela zatiaľ nepridala popis."
              : "Tento umelec zatiaľ nepridal popis.")}
        </p>

        {!compareMode ? (
          <div className="mt-auto flex items-center gap-1.5 pt-4 text-xs font-medium text-violet-300 opacity-0 transition-all duration-300 group-hover:opacity-100">
            Zobraziť profil
            <ArrowRight className="size-3 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        ) : (
          <div className="mt-auto pt-4 text-xs font-medium text-violet-300">
            {selected ? "Vybraný na porovnanie" : "Klikni pre výber"}
          </div>
        )}
      </div>
    </>
  );

  if (compareMode) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "card-lift group relative flex h-full w-full flex-col overflow-hidden rounded-3xl border bg-card/80 text-left backdrop-blur-md transition-colors",
          selected
            ? "border-violet-500/50 ring-1 ring-violet-500/30"
            : "border-white/8 hover:border-violet-500/30"
        )}
      >
        {body}
      </button>
    );
  }

  return (
    <Link
      href={`/djs/${slug}`}
      className="card-lift group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/8 bg-card/80 backdrop-blur-md"
    >
      {body}
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DJ CATALOGUE PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function DJsCatalogue() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [djs, setDjs] = useState<DJProfile[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | ArtistKind>("all");
  const [sortBy, setSortBy] = useState<string>("rating");
  const [compareMode, setCompareMode] = useState(
    searchParams.get("compare") === "1"
  );
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const [profilesRes, reviewsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, bio, avatar_url, public_slug, location, plan_type, trial_ends_at, premium_until, created_at, real_first_name, real_last_name, show_real_name, artist_kind"
          )
          .eq("role", "dj")
          .not("full_name", "is", null)
          .order("full_name", { ascending: true }),
        supabase.from("reviews").select("dj_id, rating"),
      ]);

      if (!profilesRes.error && profilesRes.data) {
        setDjs(profilesRes.data as DJProfile[]);
      }

      if (!reviewsRes.error && reviewsRes.data) {
        const sums: Record<string, { total: number; count: number }> = {};
        for (const row of reviewsRes.data as { dj_id: string; rating: number }[]) {
          const entry = sums[row.dj_id] ?? { total: 0, count: 0 };
          entry.total += row.rating;
          entry.count += 1;
          sums[row.dj_id] = entry;
        }
        const computed: Record<string, RatingInfo> = {};
        for (const [djId, { total, count }] of Object.entries(sums)) {
          computed[djId] = { avg: total / count, count };
        }
        setRatings(computed);
      }

      setLoading(false);
    };

    load();
  }, []);

  const filtered = useMemo(() => {
    const result = djs.filter((dj) => {
      const matchesName =
        !search ||
        (dj.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (dj.bio || "").toLowerCase().includes(search.toLowerCase());

      const matchesLocation =
        !locationFilter ||
        (dj.location || "").toLowerCase().includes(locationFilter.toLowerCase());

      const matchesKind =
        kindFilter === "all" ||
        normalizeArtistKind(dj.artist_kind) === kindFilter;

      return matchesName && matchesLocation && matchesKind;
    });

    const sorted = [...result];
    switch (sortBy) {
      case "rating":
        sorted.sort((a, b) => {
          const ra = ratings[a.id]?.avg ?? -1;
          const rb = ratings[b.id]?.avg ?? -1;
          if (rb !== ra) return rb - ra;
          return (a.full_name || "").localeCompare(b.full_name || "", "sk");
        });
        break;
      case "location":
        sorted.sort((a, b) =>
          (a.location || "\uffff").localeCompare(b.location || "\uffff", "sk")
        );
        break;
      case "newest":
        sorted.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      default:
        sorted.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "sk"));
    }
    return sorted;
  }, [djs, search, locationFilter, kindFilter, sortBy, ratings]);

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <Aurora subtle />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="pt-10 text-center md:pt-16">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-md">
              <Users className="size-3.5 text-violet-300" />
              Katalóg umelcov
              <Equalizer className="h-3.5" />
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-white md:text-6xl">
              Nájdi{" "}
              <span className="text-gradient">umelca na svoju akciu</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-4 text-sm text-zinc-500 md:text-base">
              Prehliadaj profily alebo pošli jednu požiadavku až 4 umelcom naraz.
            </p>
          </Reveal>
          <Reveal delay={260}>
            <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-violet-500/25 bg-violet-500/10 px-5 py-4 text-left backdrop-blur-md">
              <p className="text-sm font-semibold text-violet-100">
                Novinka: hromadný dopyt
              </p>
              <p className="mt-1 text-xs leading-relaxed text-violet-200/70">
                Vyber až 4 umelcov, pošli jednu požiadavku a porovnaj ponuky na
                jednom mieste.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCompareMode(true);
                  setSelected([]);
                }}
                className={cn(
                  "mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                  compareMode
                    ? "border-violet-400/50 bg-violet-500/25 text-white"
                    : "border-violet-500/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25"
                )}
              >
                <Scale className="size-3.5" />
                {compareMode
                  ? "Režim porovnania je zapnutý — klikaj na karty"
                  : "Zapnúť porovnanie (max 4)"}
              </button>
            </div>
          </Reveal>
        </div>

        {/* ── Search, Location & Sort filters ──────────────────────────────── */}
        <Reveal delay={300}>
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
            {KIND_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setKindFilter(f.value)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  kindFilter === f.value
                    ? "border-violet-500/40 bg-violet-500/20 text-violet-100"
                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="glass mx-auto mt-4 flex max-w-3xl flex-col gap-3 rounded-2xl p-3 shadow-[0_20px_60px_-24px_oklch(0.55_0.26_295/0.4)] sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Hľadať podľa mena alebo bio…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 rounded-xl border-white/5 bg-white/[0.03] pl-10 text-sm transition-all duration-300 focus-visible:border-violet-400/50 focus-visible:ring-violet-500/20"
              />
            </div>
            <div className="relative sm:w-48">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Mesto / lokalita"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="h-11 rounded-xl border-white/5 bg-white/[0.03] pl-10 text-sm transition-all duration-300 focus-visible:border-violet-400/50 focus-visible:ring-violet-500/20"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v ?? "rating")}>
              <SelectTrigger className="w-full justify-start gap-2 rounded-xl border-white/5 bg-white/[0.03] px-3 text-sm data-[size=default]:h-11 sm:w-56">
                <ArrowUpDown className="size-4 shrink-0 text-zinc-500" />
                <SelectValue placeholder="Triediť podľa…" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Reveal>

        {/* ── Grid ─────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="size-6 animate-spin text-violet-400" />
          </div>
        ) : filtered.length === 0 ? (
          <Reveal>
            <div className="py-32 text-center">
              <p className="text-sm text-zinc-500">
                {search || locationFilter || kindFilter !== "all"
                  ? "Žiadny umelec nezodpovedá tvojmu hľadaniu."
                  : "Zatiaľ tu nie sú žiadni umelci. Buď prvý!"}
              </p>
              {!search && !locationFilter && kindFilter === "all" && (
                <Link
                  href="/register"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-violet-300 transition-all duration-300 hover:gap-2.5 hover:brightness-125"
                >
                  Vytvoriť profil
                  <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
          </Reveal>
        ) : (
          <>
            <p className="mb-5 mt-8 text-xs text-zinc-600">
              {filtered.length}{" "}
              {filtered.length === 1
                ? "umelec nájdený"
                : filtered.length < 5
                  ? "umelci nájdení"
                  : "umelcov nájdených"}
            </p>
            <div
              className={cn(
                "grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
                compareMode ? "pb-36" : "pb-24"
              )}
            >
              {filtered.map((dj, i) => (
                <Reveal key={dj.id} delay={(i % 4) * 90} className="h-full">
                  <DJCard
                    dj={dj}
                    rating={ratings[dj.id]}
                    compareMode={compareMode}
                    selected={selected.includes(dj.id)}
                    onToggle={() => {
                      setSelected((prev) => {
                        if (prev.includes(dj.id)) {
                          return prev.filter((id) => id !== dj.id);
                        }
                        if (prev.length >= 4) return prev;
                        return [...prev, dj.id];
                      });
                    }}
                  />
                </Reveal>
              ))}
            </div>
          </>
        )}
      </main>

      {compareMode && selected.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0A0A0A]/95 px-4 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
            <div>
              <p className="text-sm text-zinc-300">
                Vybraní umelci:{" "}
                <span className="font-semibold text-white">
                  {selected.length}/4
                </span>
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Pošli jednu požiadavku všetkým — porovnáš ich ponuky a vyberieš.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                router.push(`/inquiry/new?djs=${selected.join(",")}`)
              }
              className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_oklch(0.6_0.26_295/0.8)]"
            >
              Požiadať o ponuky
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      <SiteFooter caption="Katalóg umelcov" />
    </div>
  );
}

export default function DJsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background text-zinc-500">
          <Loader2 className="size-5 animate-spin" />
        </div>
      }
    >
      <DJsCatalogue />
    </Suspense>
  );
}
