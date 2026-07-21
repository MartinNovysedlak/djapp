"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  Music,
  CalendarHeart,
  Loader2,
  Share2,
  CheckCircle2,
  Globe,
  ExternalLink,
  Headphones,
  Images,
  Play,
  Star,
  Info,
  ThumbsDown,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import BookingDialog from "@/components/BookingDialog";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { Reveal, Aurora, Equalizer } from "@/components/motion";
import { getVideoEmbedUrl, isDirectVideoFile, isValidUrl } from "@/lib/video";
import { getDjRealName, getDjStageName } from "@/lib/dj-display";
import { isValidGoogleMapsUrl } from "@/lib/google-maps";
import { setReviewVote } from "@/app/actions/review-votes";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";
import {
  GalleryLightbox,
  GalleryThumbButton,
} from "@/components/GalleryLightbox";

// ── Helpers ────────────────────────────────────────────────────────────────────
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

type DJProfile = {
  id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  public_slug: string | null;
  location: string | null;
  google_maps_url: string | null;
  social_links: Record<string, string> | null;
  plan_type: string;
  created_at: string;
  gallery_urls: string[] | null;
  video_urls: string[] | null;
  real_first_name: string | null;
  real_last_name: string | null;
  show_real_name: boolean;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_name: string;
  likes: number;
  dislikes: number;
  myVote: 1 | -1 | null;
};

type ReviewSort = "newest" | "highest" | "lowest";

// ── Social link button component ───────────────────────────────────────────────
function SocialButton({
  href,
  icon,
  label,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_currentColor] active:scale-[0.98] ${color}`}
    >
      {icon}
      <span>{label}</span>
      <ExternalLink className="size-3.5 opacity-60" />
    </a>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DJ DETAIL PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function DjProfileClient() {
  const params = useParams();
  const slug = params.slug as string;
  const { showToast } = useToast();

  const [dj, setDj] = useState<DJProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [viewerRole, setViewerRole] = useState<"checking" | "guest" | "dj" | "client">(
    "checking"
  );
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewSort, setReviewSort] = useState<ReviewSort>("newest");
  const [votingId, setVotingId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setViewerRole("guest");
        setViewerId(null);
        return;
      }
      setViewerId(data.user.id);
      const { data: viewerProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      setViewerRole(viewerProfile?.role === "dj" ? "dj" : "client");
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const fetchDJ = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("public_slug", slug)
        .maybeSingle();

      if (data) {
        setDj(data as DJProfile);
        setLoading(false);
        return;
      }

      const { data: byId } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", slug)
        .maybeSingle();

      if (byId) {
        setDj(byId as DJProfile);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    };

    fetchDJ();
  }, [slug]);

  useEffect(() => {
    if (!dj?.id) return;
    const supabase = createClient();

    const fetchReviews = async () => {
      const { data: reviewRows } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, client_id")
        .eq("dj_id", dj.id)
        .order("created_at", { ascending: false });

      if (!reviewRows || reviewRows.length === 0) {
        setReviews([]);
        return;
      }

      const reviewIds = reviewRows.map((r) => r.id);
      const clientIds = Array.from(new Set(reviewRows.map((r) => r.client_id)));

      const [{ data: clientRows }, { data: voteRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, real_first_name")
          .in("id", clientIds),
        supabase
          .from("review_votes")
          .select("review_id, user_id, vote")
          .in("review_id", reviewIds),
      ]);

      const nameById: Record<string, string> = {};
      (clientRows ?? []).forEach((c) => {
        const first =
          c.real_first_name?.trim() ||
          c.full_name?.trim().split(/\s+/)[0] ||
          "Zákazník";
        nameById[c.id] = first;
      });

      const likesByReview: Record<string, number> = {};
      const dislikesByReview: Record<string, number> = {};
      const myVoteByReview: Record<string, 1 | -1> = {};
      (voteRows ?? []).forEach((v) => {
        const rid = v.review_id as string;
        if (v.vote === 1) likesByReview[rid] = (likesByReview[rid] ?? 0) + 1;
        if (v.vote === -1)
          dislikesByReview[rid] = (dislikesByReview[rid] ?? 0) + 1;
        if (viewerId && v.user_id === viewerId) {
          myVoteByReview[rid] = v.vote as 1 | -1;
        }
      });

      setReviews(
        reviewRows.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          client_name: nameById[r.client_id] ?? "Zákazník",
          likes: likesByReview[r.id] ?? 0,
          dislikes: dislikesByReview[r.id] ?? 0,
          myVote: myVoteByReview[r.id] ?? null,
        }))
      );
    };

    fetchReviews();
  }, [dj?.id, viewerId]);

  const sortedReviews = useMemo(() => {
    const list = [...reviews];
    if (reviewSort === "highest") {
      list.sort(
        (a, b) =>
          b.rating - a.rating || b.created_at.localeCompare(a.created_at)
      );
    } else if (reviewSort === "lowest") {
      list.sort(
        (a, b) =>
          a.rating - b.rating || b.created_at.localeCompare(a.created_at)
      );
    } else {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return list;
  }, [reviews, reviewSort]);

  const visibleReviews = showAllReviews
    ? sortedReviews
    : sortedReviews.slice(0, 4);

  const handleVote = async (reviewId: string, vote: 1 | -1) => {
    if (!viewerId) {
      showToast("Pre hlasovanie sa najprv prihlás.", "info");
      return;
    }
    setVotingId(reviewId);
    const prev = reviews.find((r) => r.id === reviewId);
    const result = await setReviewVote(reviewId, vote);
    setVotingId(null);

    if (!result.ok) {
      showToast(result.error ?? "Hlasovanie sa nepodarilo.", "error");
      return;
    }

    setReviews((list) =>
      list.map((r) => {
        if (r.id !== reviewId || !prev) return r;
        let likes = r.likes;
        let dislikes = r.dislikes;
        if (prev.myVote === 1) likes -= 1;
        if (prev.myVote === -1) dislikes -= 1;
        if (result.vote === 1) likes += 1;
        if (result.vote === -1) dislikes += 1;
        return {
          ...r,
          likes: Math.max(0, likes),
          dislikes: Math.max(0, dislikes),
          myVote: result.vote ?? null,
        };
      })
    );
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-violet-400" />
      </div>
    );
  }

  // ── 404 state ──────────────────────────────────────────────────────────────
  if (notFound || !dj) {
    return (
      <div className="relative flex min-h-svh flex-col bg-background">
        <Aurora subtle />
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Reveal>
            <div className="mb-6 flex size-20 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-[0_0_40px_-10px_oklch(0.6_0.26_295/0.4)]">
              <Music className="size-8 text-zinc-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">DJ nenájdený</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Takýto profil neexistuje alebo bol odstránený.
            </p>
            <Link
              href="/djs"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-sm font-medium text-white shadow-[0_12px_36px_-10px_oklch(0.6_0.26_295/0.9)] transition-all duration-300 hover:brightness-110"
            >
              <ArrowLeft className="size-4" />
              Späť do katalógu
            </Link>
          </Reveal>
        </main>
      </div>
    );
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  const name = getDjStageName(dj);
  const realName = getDjRealName(dj);
  const gradient = getGradient(name);
  const initials = getInitials(name);
  const socialLinks = dj.social_links || {};

  const hasInstagram = socialLinks.instagram;
  const hasSoundCloud = socialLinks.soundcloud;
  const hasYouTube = socialLinks.youtube;
  const websiteUrl =
    socialLinks.website && isValidUrl(socialLinks.website)
      ? socialLinks.website.trim()
      : null;
  const otherSocialEntries = Object.entries(socialLinks).filter(
    ([platform]) =>
      platform !== "instagram" &&
      platform !== "soundcloud" &&
      platform !== "youtube" &&
      platform !== "website"
  );
  const hasAnySocial =
    Boolean(hasInstagram) ||
    Boolean(hasSoundCloud) ||
    Boolean(hasYouTube) ||
    otherSocialEntries.length > 0;

  const galleryPhotos = (dj.gallery_urls || []).filter(Boolean);
  const galleryVideos = (dj.video_urls || [])
    .filter(Boolean)
    .map((url) => ({ url, embed: getVideoEmbedUrl(url) }));
  const hasGallery = galleryPhotos.length > 0 || galleryVideos.length > 0;

  const ratingCount = reviews.length;
  const ratingAvg =
    ratingCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount
      : 0;

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <Aurora subtle />

      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-6 pt-6 pb-24">
        {/* ── Back link ──────────────────────────────────────────────────── */}
        <Reveal from="left">
          <Link
            href="/djs"
            className="group mb-8 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors duration-300 hover:text-zinc-200"
          >
            <ArrowLeft className="size-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
            Späť na katalóg DJ-ov
          </Link>
        </Reveal>

        {/* ── Profile header card ─────────────────────────────────────────── */}
        <Reveal delay={80}>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-card/70 shadow-[0_40px_100px_-40px_oklch(0_0_0/0.8)] backdrop-blur-xl">
            {/* Cover band */}
            <div
              className={`relative h-36 overflow-hidden bg-gradient-to-br ${gradient} md:h-44`}
            >
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,transparent_30%,oklch(0.16_0.02_285/0.9))]"
              />
              <div className="absolute right-6 top-6 flex items-center gap-2">
                <Equalizer className="h-5" />
              </div>
            </div>

            <div className="relative px-6 pb-8 md:px-10 md:pb-10">
              <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-end md:text-left">
                {/* Avatar overlapping the cover */}
                <div className="relative -mt-16 size-32 shrink-0 overflow-hidden rounded-3xl border-4 border-background shadow-2xl transition-transform duration-500 hover:scale-105 md:-mt-20 md:size-40">
                  {dj.avatar_url ? (
                    <Image
                      src={dj.avatar_url}
                      alt={name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className={`flex size-full items-center justify-center bg-gradient-to-br ${gradient}`}
                    >
                      <span className="text-5xl font-bold tracking-tight text-white/90">
                        {initials}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 md:pb-1">
                  <div className="flex flex-col items-center gap-2 md:flex-row">
                    <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                      {name}
                    </h1>
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-semibold ${
                        dj.plan_type === "pro"
                          ? "border-violet-500/25 bg-violet-500/10 text-violet-300"
                          : "border-white/10 bg-white/[0.04] text-zinc-500"
                      }`}
                    >
                      {dj.plan_type === "pro" ? "PRO DJ" : "FREE DJ"}
                    </span>
                    {ratingCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        {ratingAvg.toFixed(1)}
                        <span className="text-amber-300/60">
                          ({ratingCount}{" "}
                          {ratingCount === 1 ? "hodnotenie" : "hodnotení"})
                        </span>
                      </span>
                    )}
                  </div>

                  {realName && (
                    <p className="mt-1.5 text-sm text-zinc-500 md:text-left">
                      {realName}
                    </p>
                  )}

                  {dj.location && (
                    <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-zinc-400 md:justify-start">
                      <MapPin className="size-4 text-violet-400/80" />
                      {dj.location}
                    </div>
                  )}

                  {(websiteUrl ||
                    (dj.google_maps_url &&
                      isValidGoogleMapsUrl(dj.google_maps_url))) && (
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                      {websiteUrl && (
                        <a
                          href={websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-400/40 hover:bg-sky-500/15"
                        >
                          <Globe className="size-4 shrink-0" />
                          Web stránka
                          <ExternalLink className="size-3 opacity-70" />
                        </a>
                      )}
                      {dj.google_maps_url &&
                        isValidGoogleMapsUrl(dj.google_maps_url) && (
                          <a
                            href={dj.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-emerald-500/15"
                          >
                            <svg
                              className="size-4 shrink-0"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                fill="#34A853"
                                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                              />
                              <circle cx="12" cy="9" r="2.5" fill="#fff" />
                            </svg>
                            Recenzie na Google
                            <ExternalLink className="size-3 opacity-70" />
                          </a>
                        )}
                    </div>
                  )}

                  {dj.bio && (
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
                      {dj.bio}
                    </p>
                  )}
                </div>

                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-zinc-300 backdrop-blur-sm transition-all duration-300 hover:border-white/25 hover:bg-white/10 md:mb-1"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      Skopírované
                    </>
                  ) : (
                    <>
                      <Share2 className="size-3.5" />
                      Zdieľať
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── CTA section — book this DJ (hidden for DJ viewers — DJs can't book DJs) ── */}
        {viewerRole !== "dj" && (
          <Reveal delay={160}>
            <div className="card-lift relative mt-6 overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.12] via-card/80 to-card/60 p-7 backdrop-blur-md md:p-9">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-violet-500/25 blur-3xl animate-glow-pulse"
              />
              <div className="relative flex flex-col items-center gap-5 md:flex-row md:justify-between">
                <div className="text-center md:text-left">
                  <h2 className="text-xl font-semibold text-white">
                    Chceš tohto DJ-a na svoju akciu?
                  </h2>
                  <p className="mt-1.5 text-sm text-zinc-400">
                    Pošli mu nezáväznú rezervačnú požiadavku priamo cez platformu.
                  </p>
                </div>
                <BookingDialog djId={dj.id} djName={name}>
                  <button
                    type="button"
                    className="group inline-flex h-13 shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 text-sm font-semibold text-white shadow-[0_16px_44px_-12px_oklch(0.6_0.26_295)] transition-all duration-300 hover:shadow-[0_16px_54px_-8px_oklch(0.6_0.26_295)] hover:brightness-110 active:scale-[0.97]"
                  >
                    <CalendarHeart className="size-4.5 transition-transform duration-300 group-hover:scale-110" />
                    Nezáväzná rezervácia
                  </button>
                </BookingDialog>
              </div>
            </div>
          </Reveal>
        )}

        {viewerRole === "dj" && (
          <Reveal delay={160}>
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 text-sm text-zinc-400">
              <Info className="size-4 shrink-0 text-zinc-500" />
              Prezeráš profil ako DJ — rezervácie môžu odosielať len zákaznícke účty.
            </div>
          </Reveal>
        )}

        {/* ── Availability calendar (occupied days only) ───────────────────── */}
        <Reveal delay={180}>
          <div className="mt-6">
            <AvailabilityCalendar djId={dj.id} />
          </div>
        </Reveal>

        {/* ── Siete a Hudba section ────────────────────────────────────────── */}
        {hasAnySocial && (
          <Reveal delay={220}>
            <div className="glass card-lift mt-6 overflow-hidden rounded-3xl p-7 md:p-9">
              <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-white">
                <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15">
                  <Headphones className="size-4 text-violet-300" />
                </span>
                Siete a Hudba
              </h3>
              <div className="flex flex-wrap gap-3">
                {/* Instagram */}
                {hasInstagram && (
                  <SocialButton
                    href={socialLinks.instagram!}
                    icon={
                      <svg
                        className="size-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                      </svg>
                    }
                    label="Instagram"
                    color="border-pink-500/30 bg-pink-500/10 text-pink-300 hover:bg-pink-500/20"
                  />
                )}

                {/* SoundCloud */}
                {hasSoundCloud && (
                  <SocialButton
                    href={socialLinks.soundcloud!}
                    icon={<Music className="size-5" />}
                    label="SoundCloud"
                    color="border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20"
                  />
                )}

                {/* YouTube */}
                {hasYouTube && (
                  <SocialButton
                    href={socialLinks.youtube!}
                    icon={
                      <svg
                        className="size-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                        <path d="m10 15 5-3-5-3z" />
                      </svg>
                    }
                    label="YouTube"
                    color="border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                  />
                )}

                {/* Other social links from the JSONB column */}
                {otherSocialEntries.map(([platform, url]) => (
                  <SocialButton
                    key={platform}
                    href={url}
                    icon={<Globe className="size-5" />}
                    label={
                      platform.charAt(0).toUpperCase() + platform.slice(1)
                    }
                    color="border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                  />
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* ── Gallery section — photos + video showreel ────────────────────── */}
        {hasGallery && (
          <Reveal delay={250}>
            <div className="glass card-lift mt-6 overflow-hidden rounded-3xl p-7 md:p-9">
              <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-white">
                <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15">
                  <Images className="size-4 text-violet-300" />
                </span>
                Galéria
              </h3>

              {galleryPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {galleryPhotos.map((url, i) => (
                    <GalleryThumbButton
                      key={url}
                      onClick={() => setLightboxIndex(i)}
                    >
                      <Image
                        src={url}
                        alt={`${name} — fotka ${i + 1}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </GalleryThumbButton>
                  ))}
                </div>
              )}

              {galleryVideos.length > 0 && (
                <div
                  className={`grid gap-4 sm:grid-cols-2 ${
                    galleryPhotos.length > 0 ? "mt-5" : ""
                  }`}
                >
                  {galleryVideos.map(({ url, embed }, i) =>
                    embed ? (
                      <div
                        key={url}
                        className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black"
                      >
                        <iframe
                          src={embed}
                          title={`${name} — video ${i + 1}`}
                          className="absolute inset-0 size-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : isDirectVideoFile(url) ? (
                      <div
                        key={url}
                        className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black"
                      >
                        <video
                          src={url}
                          controls
                          playsInline
                          preload="metadata"
                          className="absolute inset-0 size-full object-contain"
                        />
                      </div>
                    ) : (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex aspect-video items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-sm text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Play className="size-4" />
                        Otvoriť video
                      </a>
                    )
                  )}
                </div>
              )}
            </div>
          </Reveal>
        )}

        <GalleryLightbox
          images={galleryPhotos}
          index={lightboxIndex}
          altPrefix={name}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />

        {/* ── About card ────────────────────────────────────────────────────── */}
        <Reveal delay={320}>
          <div className="glass card-lift mt-6 rounded-3xl p-7 md:p-9">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15">
                <Music className="size-4 text-violet-300" />
              </span>
              O DJ-ovi
            </h3>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-400">
              <p>{dj.bio || "Tento DJ zatiaľ nepridal popis o sebe."}</p>
              <div className="pt-1 text-xs text-zinc-600">
                Členom od{" "}
                <span className="text-zinc-400">
                  {new Date(dj.created_at).toLocaleDateString("sk-SK", {
                    year: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Reviews section — right below the bio ────────────────────────── */}
        <Reveal delay={360}>
          <div className="glass card-lift mt-6 overflow-hidden rounded-3xl p-7 md:p-9">
            <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold text-white">
              <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15">
                <Star className="size-4 fill-amber-400 text-amber-400" />
              </span>
              Hodnotenia od klientov
            </h3>

            {ratingCount === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center text-sm text-zinc-500">
                Zatiaľ bez hodnotení — buď prvý, kto napíše recenziu po akcii.
              </p>
            ) : (
              <>
                {/* Big summary */}
                <div className="mb-8 flex flex-col items-center gap-3 rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/[0.08] to-transparent px-6 py-7 sm:flex-row sm:justify-center sm:gap-6">
                  <p className="text-6xl font-bold tracking-tight text-white md:text-7xl">
                    {ratingAvg.toFixed(1)}
                  </p>
                  <div className="flex flex-col items-center gap-1.5 sm:items-start">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`size-6 ${
                            star <= Math.round(ratingAvg)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-transparent text-zinc-600"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-zinc-400">
                      na základe {ratingCount}{" "}
                      {ratingCount === 1
                        ? "hodnotenia"
                        : ratingCount < 5
                          ? "hodnotení"
                          : "hodnotení"}
                    </p>
                  </div>
                </div>

                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-zinc-500">
                    Zobrazuje sa {visibleReviews.length} z {ratingCount}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: "newest", label: "Najnovšie" },
                        { id: "highest", label: "Najviac ★" },
                        { id: "lowest", label: "Najmenej ★" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setReviewSort(opt.id)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition-colors",
                          reviewSort === opt.id
                            ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
                            : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {visibleReviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`size-3.5 ${
                              star <= review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "fill-transparent text-zinc-600"
                            }`}
                          />
                        ))}
                      </div>
                      {review.comment ? (
                        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                          {review.comment}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm italic text-zinc-600">
                          Bez textového komentára
                        </p>
                      )}
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
                        <p className="truncate text-xs font-medium text-white">
                          {review.client_name}
                        </p>
                        <p className="shrink-0 text-[11px] text-zinc-500">
                          {new Date(review.created_at).toLocaleDateString(
                            "sk-SK",
                            {
                              month: "long",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={votingId === review.id}
                          onClick={() => handleVote(review.id, 1)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                            review.myVote === 1
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                              : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                          )}
                          aria-label="Like"
                        >
                          <ThumbsUp className="size-3" />
                          {review.likes}
                        </button>
                        <button
                          type="button"
                          disabled={votingId === review.id}
                          onClick={() => handleVote(review.id, -1)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                            review.myVote === -1
                              ? "border-red-500/30 bg-red-500/15 text-red-300"
                              : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                          )}
                          aria-label="Dislike"
                        >
                          <ThumbsDown className="size-3" />
                          {review.dislikes}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {ratingCount > 4 && (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAllReviews((v) => !v)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {showAllReviews ? (
                        <>
                          <ChevronUp className="size-4" />
                          Zobraziť menej
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-4" />
                          Zobraziť všetky ({ratingCount})
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </Reveal>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-8 text-center text-xs text-zinc-600">
        BookTheVibe &copy; {new Date().getFullYear()} — Profil DJ-a
      </footer>
    </div>
  );
}
