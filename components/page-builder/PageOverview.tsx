"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Monitor,
  Pencil,
  Smartphone,
  Upload,
} from "lucide-react";
import {
  getMyDjPage,
  publishDjPage,
  unpublishDjPage,
  type LandingExtra,
  type LandingProfile,
  type LandingReview,
} from "@/app/actions/dj-page";
import { DjPageRenderer } from "@/components/page-builder/DjPageRenderer";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/lib/toast-context";
import { useDashboardUser } from "@/components/DashboardUserContext";
import { getPublicDjUrl } from "@/lib/site-url";
import { defaultTheme, type PageSection, type PageTheme, hasUnpublishedPageChanges } from "@/lib/page-builder/types";
import { cn } from "@/lib/utils";

function profileFromDashboard(
  profile: NonNullable<ReturnType<typeof useDashboardUser>["profile"]>
): LandingProfile {
  return {
    id: profile.id,
    full_name: profile.full_name,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    cover_url: profile.cover_url ?? null,
    public_slug: profile.public_slug,
    location: profile.location,
    social_links:
      profile.social_links && typeof profile.social_links === "object"
        ? (profile.social_links as Record<string, string>)
        : null,
    gallery_urls: Array.isArray(profile.gallery_urls)
      ? (profile.gallery_urls as string[])
      : null,
    video_urls: Array.isArray(profile.video_urls)
      ? (profile.video_urls as string[])
      : null,
    artist_kind: profile.artist_kind ?? null,
    is_verified: profile.is_verified ?? null,
    plan_type: profile.plan_type ?? null,
    trial_ends_at: profile.trial_ends_at ?? null,
    premium_until: profile.premium_until ?? null,
    show_real_name: profile.show_real_name ?? null,
    real_first_name: profile.real_first_name ?? null,
    real_last_name: profile.real_last_name ?? null,
  };
}

export function PageOverview() {
  const { profile, loading: profileLoading } = useDashboardUser();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [theme, setTheme] = useState<PageTheme>(defaultTheme);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [publishedSections, setPublishedSections] = useState<
    PageSection[] | null
  >(null);
  const [publishedTheme, setPublishedTheme] = useState<PageTheme | null>(null);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">(
    "desktop"
  );
  const [copied, setCopied] = useState(false);
  const [reviews, setReviews] = useState<LandingReview[]>([]);
  const [extras, setExtras] = useState<LandingExtra[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getMyDjPage();
    setLoading(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setSections(result.page.sections);
    setTheme(result.page.theme);
    setStatus(result.page.status);
    setPublishedSections(result.page.published_sections);
    setPublishedTheme(result.page.published_theme);
    setPublicSlug(result.publicSlug);
    setReviews(result.reviews);
    setExtras(result.extras);
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function refresh() {
      if (document.visibilityState === "visible") void load();
    }
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const publicUrl = publicSlug ? getPublicDjUrl(publicSlug) : null;

  async function handlePublish() {
    setPublishing(true);
    const result = await publishDjPage({ theme, sections });
    setPublishing(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setStatus(result.page.status);
    setSections(result.page.sections);
    setTheme(result.page.theme);
    setPublishedSections(result.page.published_sections);
    setPublishedTheme(result.page.published_theme);
    showToast("Stránka je publikovaná.", "success");
  }

  async function handleUnpublish() {
    setPublishing(true);
    const result = await unpublishDjPage();
    setPublishing(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setStatus(result.page.status);
    setPublishedSections(result.page.published_sections);
    setPublishedTheme(result.page.published_theme);
    showToast("Stránka je odpublikovaná.", "success");
  }

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      showToast("Odkaz skopírovaný.", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Kopírovanie zlyhalo.", "error");
    }
  }

  if (profileLoading || loading || !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const landing = profileFromDashboard(profile);
  const unpublishedChanges = hasUnpublishedPageChanges({
    status,
    theme,
    sections,
    published_sections: publishedSections,
    published_theme: publishedTheme,
  });
  const canPublish = sections.length > 0 && unpublishedChanges;
  const statusLabel =
    status === "published" && !unpublishedChanges
      ? "Publikované"
      : status === "published" && unpublishedChanges
        ? "Nezverejnené zmeny"
        : "Koncept";
  const statusClass =
    status === "published" && !unpublishedChanges
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "published" && unpublishedChanges
        ? "bg-amber-500/15 text-amber-300"
        : "bg-zinc-500/15 text-zinc-300";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Moja stránka
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Ulož v editore, potom publikuj — až potom to uvidia ľudia v katalógu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              statusClass
            )}
          >
            {statusLabel}
          </span>
          <Link
            href="/dashboard/page-builder/edit"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants(), "rounded-xl")}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Upraviť stránku
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Verejný odkaz
          </p>
          {publicUrl ? (
            <p className="mt-1 truncate font-mono text-sm text-zinc-200">
              {publicUrl}
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">
              Nastav si slug v profile, aby stránka mala URL.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {publicUrl ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => void copyLink()}
              >
                {copied ? (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                )}
                Kopírovať
              </Button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "rounded-xl"
                )}
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Otvoriť
              </a>
            </>
          ) : null}
          {canPublish ? (
            <Button
              type="button"
              size="sm"
              className="rounded-xl"
              disabled={publishing}
              onClick={() => void handlePublish()}
            >
              {publishing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              )}
              Publikovať
            </Button>
          ) : null}
          {status === "published" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={publishing}
              onClick={() => void handleUnpublish()}
            >
              {publishing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Odpublikovať
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-500">
          {status === "published" && unpublishedChanges
            ? "Náhľad konceptu (ešte nie je naživo)"
            : status === "published"
              ? "Náhľad publikovanej stránky"
              : "Náhľad konceptu"}
        </p>
        <div className="flex rounded-xl border border-white/10 p-0.5">
          <button
            type="button"
            onClick={() => setPreviewMode("mobile")}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-zinc-400",
              previewMode === "mobile" && "bg-white/10 text-white"
            )}
            aria-label="Mobile"
          >
            <Smartphone className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode("desktop")}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-zinc-400",
              previewMode === "desktop" && "bg-white/10 text-white"
            )}
            aria-label="Desktop"
          >
            <Monitor className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "mx-auto overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] shadow-2xl shadow-black/40",
          previewMode === "mobile" ? "max-w-[390px]" : "w-full max-w-4xl"
        )}
      >
        <DjPageRenderer
          profile={landing}
          theme={theme}
          sections={sections}
          reviews={reviews}
          extras={extras}
          bookingEnabled={false}
        />
      </div>
    </div>
  );
}
