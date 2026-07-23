"use client";

import { useState, useEffect, useMemo, Suspense, type ReactNode } from "react";
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
  Check,
  Scale,
  BadgeCheck,
  Clock,
  ArrowDownAZ,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Reveal, Aurora, Equalizer } from "@/components/motion";
import { cn } from "@/lib/utils";
import { getDjRealName, getDjStageName, getArtistKindLabel, getArtistPlanBadge, normalizeArtistKind, type ArtistKind } from "@/lib/dj-display";
import { hasPremiumAccess } from "@/lib/plans";
import { SiteFooter } from "@/components/SiteFooter";
import {
  getCitiesForCountry,
  locationCountry,
  locationMatchesFilter,
  locationOptionHint,
  locationOptionValue,
  parseLocationOptionValue,
  SK_CITIES,
  CZ_CITIES,
  type Country,
} from "@/lib/locations";

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
  is_verified?: boolean | null;
  created_at: string;
  real_first_name: string | null;
  real_last_name: string | null;
  show_real_name: boolean;
  artist_kind: ArtistKind | null;
};

type RatingInfo = { avg: number; count: number };

const SORT_OPTIONS = [
  { value: "rating", label: "Hodnotenie", icon: Star },
  { value: "name", label: "Abecedne", icon: ArrowDownAZ },
  { value: "location", label: "Lokalita", icon: MapPin },
  { value: "newest", label: "Najnovší", icon: Clock },
] as const;

type SortBy = (typeof SORT_OPTIONS)[number]["value"];

const COUNTRY_FILTERS: { value: "all" | Country; label: string }[] = [
  { value: "all", label: "Všetci" },
  { value: "SK", label: "Slovensko" },
  { value: "CZ", label: "Česko" },
];

const KIND_FILTERS: { value: "all" | ArtistKind; label: string }[] = [
  { value: "all", label: "Všetci" },
  { value: "dj", label: "DJ" },
  { value: "band", label: "Kapely" },
  { value: "dj_band", label: "DJ + Kapela" },
];

function FilterSegment({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      {children}
    </div>
  );
}

function SegmentedPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
              active
                ? "border-violet-400/45 bg-violet-500/20 text-violet-100 shadow-[0_0_20px_-8px_oklch(0.6_0.26_295/0.7)]"
                : "border-white/8 bg-white/[0.03] text-zinc-400 hover:border-white/15 hover:bg-white/[0.06] hover:text-zinc-200"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

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
              {dj.is_verified ? (
                <BadgeCheck className="ml-1.5 inline size-4 text-sky-400" />
              ) : null}
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
  const [filterCountry, setFilterCountry] = useState<"all" | Country>("all");
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<"all" | ArtistKind>("all");
  const [sortBy, setSortBy] = useState<SortBy>("rating");
  const [compareMode, setCompareMode] = useState(
    searchParams.get("compare") === "1"
  );
  const [selected, setSelected] = useState<string[]>([]);

  const locationOptions: ComboboxOption[] = useMemo(() => {
    const source =
      filterCountry === "all"
        ? [...SK_CITIES, ...CZ_CITIES]
        : getCitiesForCountry(filterCountry);

    const places = source.map((c) => ({
      value: locationOptionValue(c),
      label: c.name,
      hint:
        filterCountry === "all"
          ? `${locationOptionHint(c)} · ${c.country}`
          : locationOptionHint(c),
    }));
    return [{ value: "__all__", label: "Všetky lokality" }, ...places];
  }, [filterCountry]);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const [profilesRes, reviewsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, bio, avatar_url, public_slug, location, plan_type, trial_ends_at, premium_until, is_verified, created_at, real_first_name, real_last_name, show_real_name, artist_kind"
          )
          .eq("role", "dj")
          .not("full_name", "is", null)
          .not("location", "is", null)
          .neq("location", "")
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
      if (!dj.full_name?.trim() || !dj.location?.trim()) return false;

      const djCountry = locationCountry(dj.location);
      const matchesCountry =
        filterCountry === "all" || djCountry === filterCountry;

      const matchesName =
        !search ||
        (dj.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (dj.bio || "").toLowerCase().includes(search.toLowerCase());

      // Combobox values are SK:city:Čadca — strip to the place name.
      const placeOnly = parseLocationOptionValue(locationFilter);

      const matchesLocation = locationMatchesFilter(dj.location, placeOnly);

      const matchesKind =
        kindFilter === "all" ||
        normalizeArtistKind(dj.artist_kind) === kindFilter;

      return matchesCountry && matchesName && matchesLocation && matchesKind;
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
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      default:
        sorted.sort((a, b) =>
          (a.full_name || "").localeCompare(b.full_name || "", "sk")
        );
    }
    return sorted;
  }, [djs, search, filterCountry, locationFilter, kindFilter, sortBy, ratings]);

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

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <Reveal delay={300}>
          <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-white/10 bg-black/40 shadow-[0_24px_80px_-32px_oklch(0.55_0.26_295/0.55)] backdrop-blur-xl">
            <div className="rounded-t-3xl border-b border-white/8 bg-white/[0.03] p-4 sm:p-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  placeholder="Hľadať podľa mena alebo bio…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-12 rounded-2xl border-white/8 bg-white/[0.04] pl-11 pr-10 text-sm transition-all focus-visible:border-violet-400/40 focus-visible:ring-violet-500/20"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-300"
                    aria-label="Vymazať hľadanie"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="space-y-5 p-4 sm:p-5">
              <FilterSegment label="Typ umelca">
                <SegmentedPills
                  options={KIND_FILTERS}
                  value={kindFilter}
                  onChange={setKindFilter}
                />
              </FilterSegment>

              <div className="grid gap-5 sm:grid-cols-2">
                <FilterSegment label="Krajina">
                  <SegmentedPills
                    options={COUNTRY_FILTERS}
                    value={filterCountry}
                    onChange={(v) => {
                      setFilterCountry(v);
                      setLocationFilter(null);
                    }}
                  />
                </FilterSegment>

                <FilterSegment label="Miesto pôsobenia">
                  <Combobox
                    options={locationOptions}
                    value={locationFilter ?? "__all__"}
                    onValueChange={(v) =>
                      setLocationFilter(!v || v === "__all__" ? null : v)
                    }
                    placeholder="Mesto alebo kraj…"
                    searchPlaceholder="Hľadať mesto alebo kraj…"
                    emptyText="Nič sa nenašlo."
                    icon={<MapPin className="size-4" />}
                    className="h-10 rounded-xl border-white/8 bg-white/[0.04]"
                  />
                </FilterSegment>
              </div>

              <FilterSegment label="Zoradiť podľa">
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {SORT_OPTIONS.map((opt) => {
                    const active = sortBy === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSortBy(opt.value)}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all",
                          active
                            ? "border-violet-400/45 bg-violet-500/20 text-violet-100"
                            : "border-white/8 bg-white/[0.03] text-zinc-400 hover:border-white/15 hover:text-zinc-200"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-3.5 shrink-0",
                            active && opt.value === "rating"
                              ? "fill-violet-300 text-violet-300"
                              : undefined
                          )}
                        />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </FilterSegment>
            </div>
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
                {search ||
                locationFilter ||
                kindFilter !== "all" ||
                filterCountry !== "all"
                  ? "Žiadny umelec nezodpovedá tvojmu hľadaniu."
                  : "Zatiaľ tu nie sú žiadni umelci. Buď prvý!"}
              </p>
              {!search &&
                !locationFilter &&
                kindFilter === "all" &&
                filterCountry === "all" && (
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
            <div className="mb-5 mt-8 flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">
                <span className="font-semibold text-zinc-300">
                  {filtered.length}
                </span>{" "}
                {filtered.length === 1
                  ? "umelec"
                  : filtered.length < 5
                    ? "umelci"
                    : "umelcov"}
              </p>
              <p className="text-[11px] text-zinc-600">
                Zoradené:{" "}
                <span className="text-zinc-400">
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.label ??
                    "Hodnotenie"}
                </span>
              </p>
            </div>
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
