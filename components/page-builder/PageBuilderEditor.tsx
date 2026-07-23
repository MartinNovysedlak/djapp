"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Crown,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Loader2,
  Lock,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import {
  getMyDjPage,
  saveDjPageDraft,
  syncDjPageBio,
  type LandingExtra,
  type LandingProfile,
  type LandingReview,
} from "@/app/actions/dj-page";
import { DjPageRenderer } from "@/components/page-builder/DjPageRenderer";
import { EditorSelect } from "@/components/page-builder/EditorSelect";
import { MediaEffectSliders } from "@/components/page-builder/EditableMediaBand";
import {
  TemplatePreview,
  TypePreview,
} from "@/components/page-builder/TemplatePreview";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast-context";
import { useDashboardUser } from "@/components/DashboardUserContext";
import { hasPremiumAccess } from "@/lib/plans";
import {
  SECTION_CATALOG,
  createSectionFromTemplate,
  getTemplate,
  templatesForType,
  type SectionTemplate,
} from "@/lib/page-builder/templates";
import {
  PAGE_PRESETS,
  applyPagePreset,
  isFreePreset,
  type PagePresetId,
} from "@/lib/page-builder/presets";
import {
  ACCENT_SWATCH,
  PAGE_ACCENTS,
  canHideSection,
  canRemoveSection,
  ensureRequiredSections,
  isRequiredSectionType,
  reorderNonHero,
} from "@/lib/page-builder/section-order";
import { styleForNewSection } from "@/lib/page-builder/style-from-theme";
import {
  SECTION_TYPE_LABELS,
  clampFontPx,
  clampOpacityPct,
  clampSectionHeightPx,
  defaultSectionStyle,
  defaultTheme,
  newId,
  type Entrance,
  type FaqItem,
  type MediaItem,
  type PageAtmosphere,
  type PageBgStyle,
  type PageCardLayout,
  type PageDensity,
  type PageHeroStyle,
  type PageMotion,
  type PageRadius,
  type PageSection,
  type PageSurface,
  type PageTheme,
  type PageTitleWeight,
  type PaddingY,
  type SectionAlign,
  type SectionContentHeight,
  type SectionSurfaceBg,
  type SectionType,
} from "@/lib/page-builder/types";
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

function collectProfilePhotos(
  profile: NonNullable<ReturnType<typeof useDashboardUser>["profile"]>
): string[] {
  const urls: string[] = [];
  const push = (url: string | null | undefined) => {
    const trimmed = url?.trim();
    if (trimmed && !urls.includes(trimmed)) urls.push(trimmed);
  };
  push(profile.avatar_url);
  push(profile.cover_url);
  if (Array.isArray(profile.gallery_urls)) {
    for (const url of profile.gallery_urls) {
      if (typeof url === "string") push(url);
    }
  }
  return urls;
}

export function PageBuilderEditor() {
  const { profile, loading: profileLoading, refreshProfile } =
    useDashboardUser();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [theme, setTheme] = useState<PageTheme>(defaultTheme);
  const [activePresetId, setActivePresetId] = useState<PagePresetId | null>(
    "katalog"
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">(
    "desktop"
  );
  const [pickerType, setPickerType] = useState<SectionType | null>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [typeChooserOpen, setTypeChooserOpen] = useState(false);
  const [reviews, setReviews] = useState<LandingReview[]>([]);
  const [extras, setExtras] = useState<LandingExtra[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pendingPresetId, setPendingPresetId] = useState<PagePresetId | null>(
    null
  );
  const [premiumPresetOpen, setPremiumPresetOpen] = useState(false);
  const [premiumFeatureLabel, setPremiumFeatureLabel] = useState("Táto funkcia");
  const [presetsOpen, setPresetsOpen] = useState(false);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const isPremium = hasPremiumAccess(profile);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getMyDjPage();
    setLoading(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    const p = profileRef.current;
    const seed = p
      ? {
          name: p.full_name ?? undefined,
          location: p.location ?? undefined,
          bio: p.bio ?? undefined,
        }
      : undefined;
    const next = ensureRequiredSections(result.page.sections, seed);
    setSections(next);
    setTheme(result.page.theme);
    setReviews(result.reviews);
    setExtras(result.extras);
    setSelectedId(next[0]?.id ?? null);
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const selected = sections.find((s) => s.id === selectedId) ?? null;
  const profilePhotos = useMemo(
    () => (profile ? collectProfilePhotos(profile) : []),
    [profile]
  );

  function updateSection(id: string, next: PageSection) {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (isRequiredSectionType(next.type)) {
          return { ...next, visible: true };
        }
        return next;
      })
    );
  }

  function requirePremium(feature = "Táto úprava"): boolean {
    if (isPremium) return true;
    setPremiumFeatureLabel(feature);
    setPremiumPresetOpen(true);
    return false;
  }

  function removeSection(id: string) {
    if (!requirePremium("Mazanie sekcií")) return;
    const target = sections.find((s) => s.id === id);
    if (!target) return;
    if (!canRemoveSection(target)) {
      showToast(
        "Táto sekcia je povinná (Hero, Recenzie, Kontakt, CTA) a nedá sa odstrániť.",
        "error"
      );
      return;
    }
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function requestApplyPreset(presetId: PagePresetId) {
    if (!isPremium && !isFreePreset(presetId)) {
      setPresetsOpen(false);
      setPremiumFeatureLabel("Tento preset");
      setPremiumPresetOpen(true);
      return;
    }
    setPresetsOpen(false);
    setPendingPresetId(presetId);
  }

  function confirmApplyPreset() {
    if (!profile || !pendingPresetId) return;
    if (!isPremium && !isFreePreset(pendingPresetId)) {
      setPendingPresetId(null);
      setPremiumFeatureLabel("Tento preset");
      setPremiumPresetOpen(true);
      return;
    }
    const presetId = pendingPresetId;
    const preset = PAGE_PRESETS.find((p) => p.id === presetId);
    const applied = applyPagePreset(presetId, {
      name: profile.full_name ?? undefined,
      location: profile.location ?? undefined,
      bio: profile.bio ?? undefined,
      avatarUrl: profile.avatar_url ?? undefined,
    });
    setTheme(applied.theme);
    setSections(applied.sections);
    setSelectedId(applied.sections[0]?.id ?? null);
    setActivePresetId(presetId);
    setPendingPresetId(null);
    showToast(
      `Preset „${preset?.name}“ aplikovaný.`,
      "success"
    );
  }

  function openTemplatePicker(type: SectionType, atIndex: number | null = null) {
    if (!requirePremium("Pridávanie sekcií")) return;
    setInsertAt(atIndex);
    setTypeChooserOpen(false);
    setPickerType(type);
  }

  function openInsertAt(index: number) {
    if (!requirePremium("Pridávanie sekcií")) return;
    setInsertAt(Math.max(1, index));
    setPickerType(null);
    setTypeChooserOpen(true);
  }

  function clearInsertFlow() {
    setPickerType(null);
    setInsertAt(null);
    setTypeChooserOpen(false);
  }

  function insertTemplate(templateId: string) {
    if (!profile) return;
    const section = createSectionFromTemplate(templateId, {
      name: profile.full_name ?? undefined,
      location: profile.location ?? undefined,
      bio: profile.bio ?? undefined,
      avatarUrl: profile.avatar_url ?? undefined,
    });
    if (!section) return;
    section.style = styleForNewSection(
      theme,
      templateId,
      sections,
      activePresetId
    );
    setSections((prev) => {
      const ordered = ensureRequiredSections(prev, {
        name: profile.full_name ?? undefined,
        location: profile.location ?? undefined,
        bio: profile.bio ?? undefined,
      });
      const at =
        insertAt === null || insertAt < 0 || insertAt > ordered.length
          ? ordered.length
          : Math.max(1, insertAt);
      const copy = [...ordered];
      copy.splice(at, 0, section);
      return ensureRequiredSections(copy, {
        name: profile.full_name ?? undefined,
        location: profile.location ?? undefined,
        bio: profile.bio ?? undefined,
      });
    });
    setSelectedId(section.id);
    clearInsertFlow();
    showToast("Sekcia pridaná v štýle aktuálnej stránky.", "success");
  }

  async function handleSyncBio(bio: string) {
    const result = await syncDjPageBio(bio);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    try {
      await refreshProfile();
    } catch {
      // refresh is best-effort
    }
    showToast("Bio synchronizované s profilom.", "success");
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveDjPageDraft({ theme, sections });
    setSaving(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setSections(
      ensureRequiredSections(result.page.sections, {
        name: profile?.full_name ?? undefined,
        location: profile?.location ?? undefined,
        bio: profile?.bio ?? undefined,
      })
    );
    showToast("Koncept uložený. Zmeny zverejníš cez Publikovať na Moja stránka.", "success");
  }

  function onDragStart(e: DragEvent<HTMLLIElement>, id: string) {
    if (!isPremium) {
      e.preventDefault();
      requirePremium("Zmena poradia sekcií");
      return;
    }
    const section = sections.find((s) => s.id === id);
    if (!section || section.type === "hero") {
      e.preventDefault();
      return;
    }
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function onDragOver(e: DragEvent<HTMLLIElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(e: DragEvent<HTMLLIElement>, toId: string) {
    e.preventDefault();
    const fromId = dragId || e.dataTransfer.getData("text/plain");
    setDragId(null);
    if (!fromId || fromId === toId) return;
    const target = sections.find((s) => s.id === toId);
    if (!target || target.type === "hero") return;
    setSections((prev) => reorderNonHero(prev, fromId, toId));
  }

  function onDragEnd() {
    setDragId(null);
  }

  if (profileLoading || loading || !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const landing = profileFromDashboard(profile);
  const pickerTemplates = pickerType ? templatesForType(pickerType) : [];

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-[#0A0A0A]">
      <div className="z-40 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0A0A0A]/95 px-4 py-3 backdrop-blur-md lg:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/page-builder"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "rounded-xl"
            )}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Prehľad
          </Link>
          <h1 className="text-lg font-semibold text-white">Editor stránky</h1>
          {insertAt !== null ? (
            <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] text-violet-300">
              Vloženie na pozíciu {insertAt}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto min-h-8 gap-2 rounded-xl border-white/10 px-3 py-1.5 whitespace-normal"
            onClick={() => setPresetsOpen(true)}
          >
            {isPremium ||
            (activePresetId && isFreePreset(activePresetId)) ? (
              <span
                className={cn(
                  "h-3.5 w-3.5 shrink-0 rounded-full bg-gradient-to-br",
                  PAGE_PRESETS.find((p) => p.id === activePresetId)?.swatch ??
                    "from-zinc-600 to-zinc-800"
                )}
              />
            ) : (
              <span
                className={cn(
                  "h-3.5 w-3.5 shrink-0 rounded-full bg-gradient-to-br",
                  "from-violet-500 via-fuchsia-500 to-pink-400"
                )}
              />
            )}
            <span className="text-sm leading-none">Presety</span>
            {activePresetId ? (
              <span className="max-w-[7rem] truncate text-[11px] font-normal text-zinc-400">
                · {PAGE_PRESETS.find((p) => p.id === activePresetId)?.name}
              </span>
            ) : null}
          </Button>
          <div className="flex rounded-xl border border-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setPreviewMode("mobile")}
              className={cn(
                "rounded-lg px-2 py-1.5 text-zinc-400",
                previewMode === "mobile" && "bg-white/10 text-white"
              )}
            >
              <Smartphone className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className={cn(
                "rounded-lg px-2 py-1.5 text-zinc-400",
                previewMode === "desktop" && "bg-white/10 text-white"
              )}
            >
              <Monitor className="h-4 w-4" />
            </button>
          </div>
          <Button
            type="button"
            className="rounded-xl"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Uložiť
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
        <aside className="min-h-0 overflow-y-auto border-b border-white/10 bg-black/40 p-3 lg:border-b-0 lg:border-r">
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Pridať sekciu
            {!isPremium ? (
              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-amber-300/80">
                <Lock className="h-2.5 w-2.5" /> Premium
              </span>
            ) : null}
          </p>
          <div
            className={cn(
              "grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1",
              !isPremium && "pointer-events-none opacity-45"
            )}
          >
            {SECTION_CATALOG.filter((item) => {
              if (!isRequiredSectionType(item.type)) return true;
              return !sections.some((s) => s.type === item.type);
            }).map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => openTemplatePicker(item.type, insertAt)}
                className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                <span>
                  <span className="block text-sm font-medium text-white">
                    {item.label}
                  </span>
                  <span className="block text-[11px] text-zinc-500">
                    {item.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {!isPremium ? (
            <button
              type="button"
              onClick={() => requirePremium("Pridávanie sekcií")}
              className="mt-2 w-full rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-left text-[11px] text-amber-200/90"
            >
              Free: upravuj texty, fotky a free presety. Štruktúra stránky je
              Premium.
            </button>
          ) : null}

          <p className="mb-2 mt-5 px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Poradie sekcií
          </p>
          <ul className="space-y-1">
            {sections.map((section, index) => {
              const tpl = getTemplate(section.templateId);
              const isHero = section.type === "hero";
              const required = isRequiredSectionType(section.type);
              const removable = canRemoveSection(section);
              return (
                <li
                  key={section.id}
                  draggable={!isHero}
                  onDragStart={(e) => onDragStart(e, section.id)}
                  onDragOver={isHero ? undefined : onDragOver}
                  onDrop={isHero ? undefined : (e) => onDrop(e, section.id)}
                  onDragEnd={onDragEnd}
                  className={cn(dragId === section.id && "opacity-50")}
                >
                <div
                  className={cn(
                    "flex items-center gap-0.5 rounded-xl",
                    selectedId === section.id
                      ? "bg-violet-500/20"
                      : "hover:bg-white/5"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(section.id)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm",
                      selectedId === section.id
                        ? "text-white"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    {!isHero ? (
                      <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-zinc-500 active:cursor-grabbing" />
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {SECTION_TYPE_LABELS[section.type]}
                      {required ? (
                        <span className="ml-1 text-[10px] text-violet-400/80">
                          · povinné
                        </span>
                      ) : null}
                      {tpl ? (
                        <span className="text-zinc-500"> · {tpl.name}</span>
                      ) : null}
                    </span>
                    {!section.visible ? (
                      <EyeOff className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    ) : null}
                  </button>
                  {removable ? (
                    <button
                      type="button"
                      className="mr-1 shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-white/10 hover:text-rose-400"
                      title="Odstrániť"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSection(section.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                  {selectedId === section.id ? (
                    <button
                      type="button"
                      className="ml-2 mt-0.5 text-[11px] text-zinc-500 hover:text-zinc-300"
                      onClick={() => {
                        const at = Math.max(1, index + 1);
                        if (isHero) {
                          setInsertAt(at);
                          showToast(
                            "Vyber typ sekcie vľavo — vloží sa pod hero.",
                            "success"
                          );
                          return;
                        }
                        openTemplatePicker(section.type, at);
                      }}
                    >
                      + vložiť pod túto
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
            <p className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Téma
              {!isPremium ? (
                <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-amber-300/80">
                  <Lock className="h-2.5 w-2.5" /> Premium
                </span>
              ) : null}
            </p>
            <div
              className={cn(
                "space-y-2.5",
                !isPremium && "pointer-events-none opacity-45"
              )}
            >
            <div className="flex flex-wrap gap-1.5 px-1">
              {PAGE_ACCENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setTheme((t) => ({ ...t, accent: a }));
                    setActivePresetId(null);
                  }}
                  className={cn(
                    "h-7 w-7 rounded-full border-2",
                    ACCENT_SWATCH[a],
                    theme.accent === a
                      ? "border-white"
                      : "border-transparent opacity-70"
                  )}
                  aria-label={a}
                />
              ))}
            </div>
            <div className="space-y-2.5 px-1">
              <EditorSelect<PageCardLayout>
                label="Layout"
                value={theme.cardLayout}
                onChange={(cardLayout) => {
                  setTheme((t) => ({ ...t, cardLayout }));
                  setActivePresetId(null);
                }}
                options={[
                  { value: "cards", label: "Karty" },
                  { value: "floating", label: "Floating" },
                  { value: "stacked", label: "Stacked" },
                  { value: "flush", label: "Flush" },
                ]}
              />
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
                <span className="text-xs text-zinc-300">Čiary medzi sekciami</span>
                <input
                  type="checkbox"
                  checked={theme.sectionDividers}
                  onChange={(e) => {
                    setTheme((t) => ({
                      ...t,
                      sectionDividers: e.target.checked,
                    }));
                    setActivePresetId(null);
                  }}
                  className="size-4 accent-violet-500"
                />
              </label>
              <EditorSelect<PageBgStyle>
                label="Pozadie"
                value={theme.bgStyle}
                onChange={(bgStyle) => {
                  setTheme((t) => ({ ...t, bgStyle }));
                  setActivePresetId(null);
                }}
                options={[
                  { value: "gradient", label: "Gradient" },
                  { value: "dark", label: "Tmavé flat" },
                  { value: "mesh", label: "Mesh" },
                  { value: "spotlight", label: "Spotlight" },
                  { value: "radial", label: "Radial" },
                  { value: "vignette", label: "Vignette" },
                  { value: "beam", label: "Beam" },
                  { value: "horizon", label: "Horizon" },
                ]}
              />
              <EditorSelect<PageAtmosphere>
                label="Atmosféra"
                value={theme.atmosphere}
                onChange={(atmosphere) => {
                  setTheme((t) => ({ ...t, atmosphere }));
                  setActivePresetId(null);
                }}
                options={[
                  { value: "aurora", label: "Aurora" },
                  { value: "orbs", label: "Orbs" },
                  { value: "grid", label: "Grid" },
                  { value: "haze", label: "Haze" },
                  { value: "stars", label: "Stars" },
                  { value: "scanlines", label: "Scanlines" },
                  { value: "dust", label: "Dust / grain" },
                  { value: "none", label: "Bez atmosféry" },
                ]}
              />
              <EditorSelect<PageSurface>
                label="Povrch kariet"
                value={theme.surface}
                onChange={(surface) => {
                  setTheme((t) => ({ ...t, surface }));
                  setActivePresetId(null);
                }}
                options={[
                  { value: "glass", label: "Glass" },
                  { value: "solid", label: "Solid" },
                  { value: "soft", label: "Soft" },
                  { value: "outline", label: "Outline" },
                  { value: "neon", label: "Neon" },
                ]}
              />
              <EditorSelect<PageRadius>
                label="Zaoblenie"
                value={theme.radius}
                onChange={(radius) => {
                  setTheme((t) => ({ ...t, radius }));
                  setActivePresetId(null);
                }}
                options={[
                  { value: "sm", label: "Ostré (malé)" },
                  { value: "md", label: "Stredné" },
                  { value: "xl", label: "Mäkké (veľké)" },
                  { value: "pill", label: "Pill (max)" },
                ]}
              />
              <EditorSelect<PageDensity>
                label="Hustota"
                value={theme.density}
                onChange={(density) => {
                  setTheme((t) => ({ ...t, density }));
                  setActivePresetId(null);
                }}
                options={[
                  { value: "compact", label: "Kompaktná — tesne" },
                  { value: "comfortable", label: "Pohodlná" },
                  { value: "airy", label: "Vzdušná — ďaleko" },
                ]}
              />
              <EditorSelect<PageHeroStyle>
                label="Hero štýl"
                value={theme.heroStyle}
                onChange={(heroStyle) => {
                  setTheme((t) => ({ ...t, heroStyle }));
                  setActivePresetId(null);
                }}
                options={[
                  { value: "classic", label: "Klasický" },
                  { value: "overlap", label: "Overlap" },
                  { value: "immersive", label: "Immersive" },
                  { value: "split", label: "Split" },
                  { value: "poster", label: "Poster" },
                ]}
              />
              <EditorSelect<PageTitleWeight>
                label="Váha nadpisov"
                value={theme.titleWeight}
                onChange={(titleWeight) => {
                  setTheme((t) => ({ ...t, titleWeight }));
                  setActivePresetId(null);
                }}
                options={[
                  { value: "medium", label: "Medium" },
                  { value: "semibold", label: "Semibold" },
                  { value: "bold", label: "Bold" },
                  { value: "black", label: "Black" },
                ]}
              />
              <EditorSelect<PageMotion>
                label="Pohyb"
                value={theme.motion}
                onChange={(motion) => {
                  setTheme((t) => ({ ...t, motion }));
                  setActivePresetId(null);
                }}
                options={[
                  { value: "static", label: "Statický" },
                  { value: "subtle", label: "Jemný" },
                  { value: "lively", label: "Živý" },
                ]}
              />
              <label className="flex items-center gap-2 px-0.5 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={theme.glow}
                  onChange={(e) => {
                    setTheme((t) => ({ ...t, glow: e.target.checked }));
                    setActivePresetId(null);
                  }}
                  className="rounded border-white/20 bg-black/40"
                />
                Glow / tiene
              </label>
            </div>
            </div>
            {!isPremium ? (
              <button
                type="button"
                onClick={() => requirePremium("Farby a téma")}
                className="w-full rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-left text-[11px] text-amber-200/90"
              >
                Farby, layout a atmosféra sú Premium.
              </button>
            ) : null}
          </div>
        </aside>

        <div className="min-h-0 overflow-y-auto bg-zinc-950/80 p-4 lg:p-6">
          <div
            className={cn(
              "mx-auto overflow-hidden rounded-2xl border border-white/10 shadow-2xl",
              previewMode === "mobile" ? "max-w-[390px]" : "max-w-3xl"
            )}
          >
            <DjPageRenderer
              profile={landing}
              theme={theme}
              sections={sections}
              reviews={reviews}
              extras={extras}
              bookingEnabled={false}
              editMode
              profilePhotos={profilePhotos}
              selectedSectionId={selectedId}
              onSelectSection={setSelectedId}
              onUpdateSection={(next) => updateSection(next.id, next)}
              onDeleteSection={
                isPremium
                  ? removeSection
                  : () => {
                      requirePremium("Mazanie sekcií");
                    }
              }
              onSyncBio={(bio) => void handleSyncBio(bio)}
              onRequestInsertAt={
                isPremium
                  ? openInsertAt
                  : () => {
                      requirePremium("Pridávanie sekcií");
                    }
              }
            />
          </div>
        </div>

        <aside className="min-h-0 overflow-y-auto border-t border-white/10 bg-black/40 p-4 lg:border-l lg:border-t-0">
          {selected ? (
            <SectionInspector
              section={selected}
              userId={profile.id}
              profilePhotos={profilePhotos}
              extras={extras}
              isPremium={isPremium}
              onRequirePremium={requirePremium}
              onChange={(next) => updateSection(selected.id, next)}
              onRemove={() => removeSection(selected.id)}
            />
          ) : (
            <p className="text-sm text-zinc-500">
              {isPremium
                ? "Klikni na sekciu v náhľade — úpravy sa zobrazia tu (Texty / Fotka / Štýl)."
                : "Free: klikni na sekciu a uprav texty alebo fotky. Farby a štruktúra sú Premium."}
            </p>
          )}
        </aside>
      </div>

      {typeChooserOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl border border-white/10 bg-[#121212] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Vložiť sekciu
                </h2>
                <p className="text-sm text-zinc-400">
                  Vyber typ sekcie pre pozíciu {insertAt ?? "…"}.
                </p>
              </div>
              <button
                type="button"
                onClick={clearInsertFlow}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {SECTION_CATALOG.filter((item) => {
                if (!isRequiredSectionType(item.type)) return true;
                return !sections.some((s) => s.type === item.type);
              }).map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => openTemplatePicker(item.type, insertAt)}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-left transition hover:border-violet-500/40 hover:bg-violet-500/10"
                >
                  <TypePreview type={item.type} className="mb-2 h-20" />
                  <span className="block text-sm font-medium text-white">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {item.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {pickerType ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-white/10 bg-[#121212] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Šablóny — {SECTION_TYPE_LABELS[pickerType]}
                </h2>
                <p className="text-sm text-zinc-400">
                  Vyber vizuál, ktorý sa vloží do stránky.
                </p>
              </div>
              <button
                type="button"
                onClick={clearInsertFlow}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {pickerTemplates.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  onSelect={() => insertTemplate(tpl.id)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={presetsOpen} onOpenChange={setPresetsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#121212] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Presety</DialogTitle>
            <DialogDescription>
              Free: Klasika, Midnight Ink a Emerald Velvet. Ostatné štýly a
              pokročilé úpravy sú Premium.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {PAGE_PRESETS.map((preset) => {
              const active = activePresetId === preset.id;
              const locked = !isPremium && preset.tier === "premium";
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => requestApplyPreset(preset.id)}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition",
                    active
                      ? "border-violet-500/50 bg-violet-500/15"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                  )}
                >
                  <div
                    className={cn(
                      "relative mb-2 h-14 w-full overflow-hidden rounded-xl bg-gradient-to-br",
                      preset.swatch
                    )}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,white/25,transparent_45%)]" />
                    {locked ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                        <Lock className="h-4 w-4 text-white/80" />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white">
                      {preset.name}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px]",
                        preset.tier === "free"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      )}
                    >
                      {preset.tier === "free" ? "Free" : "Premium"}
                    </span>
                  </div>
                  <span className="mt-1 block text-[11px] leading-snug text-zinc-500">
                    {preset.tagline}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={premiumPresetOpen} onOpenChange={setPremiumPresetOpen}>
        <DialogContent className="border-white/10 bg-[#121212] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-300" />
              {premiumFeatureLabel} — Premium
            </DialogTitle>
            <DialogDescription>
              Free účet môže meniť texty, fotky a free presety (Klasika, Midnight
              Ink, Emerald Velvet). Farby, štruktúra sekcií a ďalšie štýly sú v
              Premium.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => setPremiumPresetOpen(false)}
            >
              Zavrieť
            </Button>
            <Link
              href="/dashboard/profile"
              className={cn(buttonVariants({}), "rounded-xl")}
              onClick={() => setPremiumPresetOpen(false)}
            >
              Prejsť na Premium
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingPresetId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPresetId(null);
        }}
      >
        <DialogContent className="border-white/10 bg-[#121212] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aplikovať preset?</DialogTitle>
            <DialogDescription>
              Preset „
              {PAGE_PRESETS.find((p) => p.id === pendingPresetId)?.name ?? "…"}
              “ nahradí aktuálne sekcie a tému. Potom môžeš všetko ďalej
              upravovať.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => setPendingPresetId(null)}
            >
              Zrušiť
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={confirmApplyPreset}
            >
              Aplikovať
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: SectionTemplate;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-violet-500/40 hover:bg-violet-500/10"
    >
      <TemplatePreview templateId={template.id} className="mb-3" />
      <p className="font-medium text-white">{template.name}</p>
      <p className="mt-1 text-xs text-zinc-500">{template.description}</p>
    </button>
  );
}

function ProfilePhotoPicker({
  photos,
  selectedUrl,
  onSelect,
  userId,
  label = "Fotky z profilu",
}: {
  photos: string[];
  selectedUrl?: string;
  onSelect: (url: string) => void;
  userId: string;
  label?: string;
}) {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("userId", userId);
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/upload-media", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { urls?: string[]; error?: string };
      if (!res.ok || !json.urls?.length) {
        showToast(json.error || "Upload zlyhal.", "error");
        return;
      }
      const url = json.urls[0];
      if (url) onSelect(url);
      showToast("Fotka nahratá.", "success");
    } catch {
      showToast("Upload zlyhal.", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => onSelect(url)}
              className={cn(
                "aspect-square overflow-hidden rounded-lg border-2",
                selectedUrl === url
                  ? "border-violet-400"
                  : "border-transparent hover:border-white/30"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">
          V profile zatiaľ nemáš fotky v galérii.
        </p>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void onUpload(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full rounded-xl"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="mr-1.5 h-4 w-4" />
        )}
        Nahrať novú
      </Button>
    </div>
  );
}

function SectionInspector({
  section,
  userId,
  profilePhotos,
  extras,
  isPremium,
  onRequirePremium,
  onChange,
  onRemove,
}: {
  section: PageSection;
  userId: string;
  profilePhotos: string[];
  extras: LandingExtra[];
  isPremium: boolean;
  onRequirePremium: (feature?: string) => boolean;
  onChange: (s: PageSection) => void;
  onRemove: () => void;
}) {
  const style = section.style ?? defaultSectionStyle();
  const props = section.props;
  const canDelete = canRemoveSection(section);
  const canHide = canHideSection(section);
  const typeTemplates = templatesForType(section.type);
  const [panel, setPanel] = useState<"obsah" | "fotka" | "styl">("obsah");

  const hasMediaPanel =
    section.type === "hero" ||
    section.type === "text" ||
    section.type === "gallery";

  useEffect(() => {
    setPanel("obsah");
  }, [section.id]);

  useEffect(() => {
    if (!isPremium && panel === "styl") setPanel("obsah");
  }, [isPremium, panel]);

  function setProp(key: string, value: unknown) {
    onChange({ ...section, props: { ...props, [key]: value } });
  }

  function setStyle<K extends keyof typeof style>(
    key: K,
    value: (typeof style)[K]
  ) {
    onChange({
      ...section,
      style: { ...style, [key]: value },
    });
  }

  function changeTemplate(templateId: string) {
    if (templateId === section.templateId) return;
    const tpl = getTemplate(templateId);
    if (!tpl || tpl.type !== section.type) return;
    onChange({
      ...section,
      templateId,
      style:
        section.type === "hero"
          ? defaultSectionStyle({
              align:
                templateId === "hero.minimal" || templateId === "hero.centered"
                  ? "center"
                  : "left",
              titleSizePx: 34,
              entrance: style.entrance,
              paddingY: style.paddingY,
            })
          : section.type === "text"
            ? defaultSectionStyle({
                align: templateId === "text.feature" ? "center" : "left",
                titleSizePx: templateId === "text.feature" ? 28 : 22,
                entrance: style.entrance,
                paddingY: style.paddingY,
              })
            : style,
      props:
        section.type === "hero"
          ? {
              ...props,
              showCover:
                templateId === "hero.minimal"
                  ? false
                  : props.showCover !== false,
            }
          : props,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">
            {SECTION_TYPE_LABELS[section.type]}
          </p>
          <p className="text-xs text-zinc-500">
            {getTemplate(section.templateId)?.name ?? section.templateId}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg"
            onClick={() => {
              if (!isPremium) {
                onRequirePremium("Skrytie sekcie");
                return;
              }
              onChange({ ...section, visible: !section.visible });
            }}
            title={
              canHide
                ? section.visible
                  ? "Skryť"
                  : "Zobraziť"
                : "Povinnú sekciu nie je možné skryť"
            }
            disabled={!canHide}
          >
            {section.visible ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
          {canDelete ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-lg text-rose-400 hover:text-rose-300"
              onClick={() => {
                if (!isPremium) {
                  onRequirePremium("Mazanie sekcií");
                  return;
                }
                onRemove();
              }}
              title="Odstrániť"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {typeTemplates.length > 1 ? (
        <div className={cn(!isPremium && "relative")}>
          <EditorSelect
            label="Šablóna"
            value={section.templateId}
            onChange={(v) => {
              if (!isPremium) {
                onRequirePremium("Zmena šablóny");
                return;
              }
              changeTemplate(v);
            }}
            options={typeTemplates.map((tpl) => ({
              value: tpl.id,
              label: tpl.name,
            }))}
          />
          {!isPremium ? (
            <button
              type="button"
              className="absolute inset-0 z-10 cursor-pointer rounded-xl"
              onClick={() => onRequirePremium("Zmena šablóny")}
              aria-label="Premium"
            />
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
        {(
          [
            { id: "obsah" as const, label: "Texty" },
            ...(hasMediaPanel
              ? [{ id: "fotka" as const, label: "Fotka" }]
              : []),
            { id: "styl" as const, label: "Štýl", premium: true },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if ("premium" in tab && tab.premium && !isPremium) {
                onRequirePremium("Štýl sekcie");
                return;
              }
              setPanel(tab.id);
            }}
            className={cn(
              "relative flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition",
              panel === tab.id
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {tab.label}
            {"premium" in tab && tab.premium && !isPremium ? (
              <Lock className="absolute right-1.5 top-1.5 h-2.5 w-2.5 text-amber-300/80" />
            ) : null}
          </button>
        ))}
      </div>

      {panel === "styl" && isPremium ? (
        <div className="space-y-3">
          <EditorSelect<SectionAlign>
            label="Zarovnanie"
            value={style.align}
            onChange={(v) => setStyle("align", v)}
            options={[
              { value: "left", label: "Vľavo" },
              { value: "center", label: "Stred" },
              { value: "right", label: "Vpravo" },
            ]}
          />
          <Field label="Veľkosť nadpisu (px)">
            <Input
              type="number"
              min={12}
              max={72}
              value={style.titleSizePx}
              onChange={(e) =>
                setStyle(
                  "titleSizePx",
                  clampFontPx(e.target.value, style.titleSizePx, 12, 72)
                )
              }
              className="rounded-xl border-white/10 bg-black/40"
            />
          </Field>
          <Field label="Veľkosť textu (px)">
            <Input
              type="number"
              min={12}
              max={48}
              value={style.bodySizePx}
              onChange={(e) =>
                setStyle(
                  "bodySizePx",
                  clampFontPx(e.target.value, style.bodySizePx, 12, 48)
                )
              }
              className="rounded-xl border-white/10 bg-black/40"
            />
          </Field>
          <EditorSelect<Entrance>
            label="Vstupná animácia"
            value={style.entrance}
            onChange={(v) => setStyle("entrance", v)}
            options={[
              { value: "none", label: "Žiadna" },
              { value: "fade", label: "Fade" },
              { value: "slideUp", label: "Slide up" },
            ]}
          />
          <EditorSelect<PaddingY>
            label="Odsadenie"
            value={style.paddingY}
            onChange={(v) => setStyle("paddingY", v)}
            options={[
              { value: "sm", label: "Malé" },
              { value: "md", label: "Stredné" },
              { value: "lg", label: "Veľké" },
            ]}
          />
          <EditorSelect<SectionContentHeight>
            label="Výška sekcie"
            value={style.contentHeight ?? "auto"}
            onChange={(v) => {
              if (v === "fixed") {
                onChange({
                  ...section,
                  style: {
                    ...style,
                    contentHeight: "fixed",
                    contentHeightPx: clampSectionHeightPx(
                      style.contentHeightPx,
                      280
                    ),
                  },
                });
              } else {
                setStyle("contentHeight", "auto");
              }
            }}
            options={[
              { value: "auto", label: "Automatická" },
              { value: "fixed", label: "Vlastná (px)" },
            ]}
          />
          {(style.contentHeight ?? "auto") === "fixed" ? (
            <Field label="Výška (px)">
              <Input
                type="number"
                min={80}
                max={900}
                step={10}
                value={style.contentHeightPx ?? 280}
                onChange={(e) =>
                  onChange({
                    ...section,
                    style: {
                      ...style,
                      contentHeight: "fixed",
                      contentHeightPx: clampSectionHeightPx(
                        e.target.value,
                        style.contentHeightPx ?? 280
                      ),
                    },
                  })
                }
                className="rounded-xl border-white/10 bg-black/40"
              />
            </Field>
          ) : null}

          <div className="space-y-3 border-t border-white/10 pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Bublina sekcie
            </p>
            <EditorSelect<SectionSurfaceBg>
              label="Pozadie"
              value={style.surfaceBg ?? "theme"}
              onChange={(v) => {
                onChange({
                  ...section,
                  style: {
                    ...style,
                    surfaceBg: v,
                    surfaceOpacity:
                      v === "transparent"
                        ? (style.surfaceOpacity ?? 100)
                        : Math.max(style.surfaceOpacity ?? 100, 40),
                  },
                });
              }}
              options={[
                { value: "theme", label: "Podľa témy stránky" },
                { value: "transparent", label: "Priehľadné" },
                { value: "glass", label: "Glass" },
                { value: "solid", label: "Solid" },
                { value: "soft", label: "Soft" },
                { value: "dark", label: "Tmavé" },
                { value: "accent", label: "Accent" },
              ]}
            />
            <Field
              label={`Priehľadnosť bubliny (${style.surfaceOpacity ?? 100}%)`}
            >
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={style.surfaceOpacity ?? 100}
                onChange={(e) => {
                  const next = clampOpacityPct(
                    e.target.value,
                    style.surfaceOpacity ?? 100
                  );
                  onChange({
                    ...section,
                    style: {
                      ...style,
                      surfaceOpacity: next,
                      // On flush/theme pages, picking opacity alone should enable a fill
                      surfaceBg:
                        (style.surfaceBg ?? "theme") === "theme" && next < 100
                          ? "glass"
                          : (style.surfaceBg ?? "theme"),
                    },
                  });
                }}
                className="w-full accent-violet-500"
              />
            </Field>
          </div>

          {(section.templateId === "text.photoLeft" ||
            section.templateId === "text.photoRight") && (
            <div className="space-y-3 border-t border-white/10 pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Rozloženie foto + text
              </p>
              <EditorSelect
                label="Šírka fotky"
                value={String(props.photoWidth ?? "md")}
                onChange={(v) => setProp("photoWidth", v)}
                options={[
                  { value: "sm", label: "Úzka" },
                  { value: "md", label: "Stredná" },
                  { value: "lg", label: "Široká" },
                ]}
              />
              <EditorSelect
                label="Pomer fotky"
                value={String(props.photoAspect ?? "portrait")}
                onChange={(v) => setProp("photoAspect", v)}
                options={[
                  { value: "portrait", label: "Na výšku" },
                  { value: "square", label: "Štvorec" },
                  { value: "landscape", label: "Na šírku" },
                ]}
              />
              <EditorSelect
                label="Usporiadanie"
                value={String(props.contentLayout ?? "side")}
                onChange={(v) => setProp("contentLayout", v)}
                options={[
                  { value: "side", label: "Foto + text vedľa seba" },
                  {
                    value: "stack",
                    label: "Nadpis hore, foto + popis nižšie",
                  },
                ]}
              />
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={props.showImageCaption !== false}
                  onChange={(e) =>
                    setProp("showImageCaption", e.target.checked)
                  }
                />
                Zobraziť popis pod fotkou
              </label>
            </div>
          )}

          {section.templateId === "text.overlay" ? (
            <div className="space-y-3 border-t border-white/10 pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Text na fotke
              </p>
              <EditorSelect
                label="Pozícia textu"
                value={String(props.titlePosition ?? "bottom")}
                onChange={(v) => setProp("titlePosition", v)}
                options={[
                  { value: "top", label: "Hore" },
                  { value: "center", label: "Stred" },
                  { value: "bottom", label: "Dole" },
                ]}
              />
            </div>
          ) : null}

          {section.type === "gallery" ? (
            <div className="space-y-3 border-t border-white/10 pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Galéria — zobrazenie
              </p>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={props.showTitle !== false}
                  onChange={(e) => setProp("showTitle", e.target.checked)}
                />
                Zobraziť nadpis sekcie
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={props.showCaptions !== false}
                  onChange={(e) => setProp("showCaptions", e.target.checked)}
                />
                Zobraziť popisy fotiek
              </label>
              {section.templateId === "gallery.marquee" ? (
                <>
                  <EditorSelect
                    label="Veľkosť dlaždíc"
                    value={String(props.tileSize ?? "md")}
                    onChange={(v) => setProp("tileSize", v)}
                    options={[
                      { value: "sm", label: "Malé" },
                      { value: "md", label: "Stredné" },
                      { value: "lg", label: "Veľké" },
                    ]}
                  />
                  <EditorSelect
                    label="Rýchlosť posunu"
                    value={String(
                      (() => {
                        const n = Number(props.speedMs ?? 40000);
                        if (n <= 20000) return "fast";
                        if (n >= 60000) return "slow";
                        return "mid";
                      })()
                    )}
                    onChange={(v) =>
                      setProp(
                        "speedMs",
                        v === "fast" ? 16000 : v === "slow" ? 70000 : 40000
                      )
                    }
                    options={[
                      { value: "fast", label: "Rýchla" },
                      { value: "mid", label: "Stredná" },
                      { value: "slow", label: "Pomalá" },
                    ]}
                  />
                </>
              ) : null}
              {section.templateId === "gallery.slideshow" ? (
                <Field label="Interval snímky (ms)">
                  <Input
                    type="number"
                    min={2000}
                    max={15000}
                    step={500}
                    value={Number(props.speedMs ?? 4500)}
                    onChange={(e) =>
                      setProp("speedMs", Number(e.target.value) || 4500)
                    }
                    className="rounded-xl border-white/10 bg-black/40"
                  />
                </Field>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {panel === "obsah" ? (
        <div className="space-y-3">
          <p className="text-[11px] text-zinc-500">
            Texty môžeš upraviť aj priamo v náhľade kliknutím.
          </p>

        {section.type === "hero" ? (
          <>
            <TextField
              label="Nadpis"
              value={String(props.headline ?? "")}
              onChange={(v) => setProp("headline", v)}
            />
            <TextField
              label="Podnadpis"
              value={String(props.subheadline ?? "")}
              onChange={(v) => setProp("subheadline", v)}
            />
            <TextField
              label="CTA text"
              value={String(props.ctaLabel ?? "")}
              onChange={(v) => setProp("ctaLabel", v)}
            />
          </>
        ) : null}

        {section.type === "about" ? (
          <>
            <TextField
              label="Nadpis"
              value={String(props.title ?? "")}
              onChange={(v) => setProp("title", v)}
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={props.useProfileBio !== false}
                onChange={(e) => setProp("useProfileBio", e.target.checked)}
              />
              Použiť bio z profilu
            </label>
            {props.useProfileBio === false ? (
              <TextAreaField
                label="Text"
                value={String(props.body ?? "")}
                onChange={(v) => setProp("body", v)}
              />
            ) : (
              <p className="text-[11px] text-zinc-600">
                Bio upravíš v náhľade — uloží sa aj do profilu.
              </p>
            )}
          </>
        ) : null}

        {section.type === "text" ? (
          <TextSectionInspector
            section={section}
            profilePhotos={profilePhotos}
            userId={userId}
            isPremium={isPremium}
            onRequirePremium={onRequirePremium}
            onChange={onChange}
            mode="text"
          />
        ) : null}

        {section.type === "gallery" ? (
          <GalleryInspector
            section={section}
            userId={userId}
            profilePhotos={profilePhotos}
            onChange={onChange}
            mode="text"
          />
        ) : null}

        {section.type === "calendar" ? (
          <>
            <TextField
              label="Nadpis"
              value={String(props.title ?? "")}
              onChange={(v) => setProp("title", v)}
            />
            <TextField
              label="Podnadpis"
              value={String(props.subtitle ?? "")}
              onChange={(v) => setProp("subtitle", v)}
            />
          </>
        ) : null}

        {section.type === "media" ? (
          <TextField
            label="Nadpis"
            value={String(props.title ?? "")}
            onChange={(v) => setProp("title", v)}
          />
        ) : null}

        {section.type === "packages" ? (
          <PackagesInspector
            title={String(props.title ?? "")}
            onTitle={(v) => setProp("title", v)}
            extras={extras}
          />
        ) : null}

        {section.type === "reviews" ? (
          <TextField
            label="Nadpis"
            value={String(props.title ?? "")}
            onChange={(v) => setProp("title", v)}
          />
        ) : null}

        {section.type === "faq" ? (
          <FaqInspector
            items={(Array.isArray(props.items) ? props.items : []) as FaqItem[]}
            title={String(props.title ?? "")}
            onTitle={(v) => setProp("title", v)}
            onItems={(items) => setProp("items", items)}
          />
        ) : null}

        {section.type === "contact" ? (
          <TextField
            label="Nadpis"
            value={String(props.title ?? "")}
            onChange={(v) => setProp("title", v)}
          />
        ) : null}

        {section.type === "cta" ? (
          <>
            <TextField
              label="Nadpis"
              value={String(props.title ?? "")}
              onChange={(v) => setProp("title", v)}
            />
            <TextField
              label="Tlačidlo"
              value={String(props.label ?? "")}
              onChange={(v) => setProp("label", v)}
            />
            <EditorSelect
              label="Štýl tlačidla"
              value={String(props.buttonStyle ?? "solid")}
              onChange={(v) => setProp("buttonStyle", v)}
              options={[
                { value: "solid", label: "Plné" },
                { value: "outline", label: "Outline" },
              ]}
            />
          </>
        ) : null}
        </div>
      ) : null}

      {panel === "fotka" && hasMediaPanel ? (
        <div className="space-y-3">
          {section.type === "hero" ? (
            <>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={props.showAvatar !== false}
                  onChange={(e) => setProp("showAvatar", e.target.checked)}
                />
                Zobraziť profilovku
              </label>
              {section.templateId !== "hero.minimal" ? (
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={props.showCover !== false}
                    onChange={(e) => setProp("showCover", e.target.checked)}
                  />
                  Zobraziť titulnú fotku
                </label>
              ) : null}
              {section.templateId !== "hero.minimal" &&
              props.showCover !== false ? (
                <div className="space-y-2">
                  <ProfilePhotoPicker
                    photos={profilePhotos}
                    selectedUrl={String(props.coverImageUrl ?? "") || undefined}
                    onSelect={(url) => setProp("coverImageUrl", url)}
                    userId={userId}
                    label="Titulná fotka"
                  />
                  {props.coverImageUrl ? (
                    <button
                      type="button"
                      className="text-[11px] text-zinc-500 hover:text-zinc-300"
                      onClick={() => setProp("coverImageUrl", "")}
                    >
                      Reset na predvolenú
                    </button>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-2 border-t border-white/5 pt-3">
                <ProfilePhotoPicker
                  photos={profilePhotos}
                  selectedUrl={String(props.sideImageUrl ?? "") || undefined}
                  onSelect={(url) => setProp("sideImageUrl", url)}
                  userId={userId}
                  label="Bočná fotka (split / poster)"
                />
                {props.sideImageUrl ? (
                  <button
                    type="button"
                    className="text-[11px] text-zinc-500 hover:text-zinc-300"
                    onClick={() => setProp("sideImageUrl", "")}
                  >
                    Reset
                  </button>
                ) : null}
              </div>
              {section.templateId !== "hero.minimal" ? (
                isPremium ? (
                  <MediaEffectSliders
                    opacity={Number(props.imageOpacity ?? 100)}
                    blur={Number(props.imageBlur ?? 0)}
                    onOpacity={(v) => setProp("imageOpacity", v)}
                    onBlur={(v) => setProp("imageBlur", v)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onRequirePremium("Efekty fotky")}
                    className="flex w-full items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-left text-[11px] text-amber-200/90"
                  >
                    <Lock className="h-3 w-3 shrink-0" />
                    Blur a priehľadnosť fotky — Premium
                  </button>
                )
              ) : null}
              <p className="text-[11px] text-zinc-600">
                Na náhľade: klikni sekciu → hover na fotku → Nahrať / Z profilu.
              </p>
            </>
          ) : null}

          {section.type === "text" ? (
            <TextSectionInspector
              section={section}
              profilePhotos={profilePhotos}
              userId={userId}
              isPremium={isPremium}
              onRequirePremium={onRequirePremium}
              onChange={onChange}
              mode="media"
            />
          ) : null}

          {section.type === "gallery" ? (
            <GalleryInspector
              section={section}
              userId={userId}
              profilePhotos={profilePhotos}
              onChange={onChange}
              mode="media"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}


function TextSectionInspector({
  section,
  profilePhotos,
  userId,
  isPremium = true,
  onRequirePremium,
  onChange,
  mode = "all",
}: {
  section: PageSection;
  profilePhotos: string[];
  userId: string;
  isPremium?: boolean;
  onRequirePremium?: (feature?: string) => boolean;
  onChange: (s: PageSection) => void;
  mode?: "text" | "media" | "all";
}) {
  const props = section.props;
  const imageUrl = String(props.imageUrl ?? "");
  const isBanner =
    section.templateId === "text.banner" ||
    section.templateId === "text.overlay";
  const hasSidePhoto =
    section.templateId === "text.photoLeft" ||
    section.templateId === "text.photoRight" ||
    isBanner;
  const showText = mode === "text" || mode === "all";
  const showMedia = mode === "media" || mode === "all";

  function setProp(key: string, value: unknown) {
    onChange({ ...section, props: { ...props, [key]: value } });
  }

  return (
    <div className="space-y-3">
      {showText ? (
        <>
          <TextField
            label="Nadpis"
            value={String(props.title ?? "")}
            onChange={(v) => setProp("title", v)}
          />
          <TextAreaField
            label="Text"
            value={String(props.body ?? "")}
            onChange={(v) => setProp("body", v)}
          />
          {hasSidePhoto && !isBanner ? (
            <TextField
              label="Popis fotky"
              value={String(props.imageCaption ?? "")}
              onChange={(v) => setProp("imageCaption", v)}
            />
          ) : null}
        </>
      ) : null}

      {showMedia && hasSidePhoto ? (
        <>
          {section.templateId === "text.banner" ? (
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={props.showCover !== false}
                onChange={(e) => setProp("showCover", e.target.checked)}
              />
              Zobraziť titulnú fotku
            </label>
          ) : null}
          <ProfilePhotoPicker
            photos={profilePhotos}
            selectedUrl={imageUrl || undefined}
            userId={userId}
            onSelect={(url) => setProp("imageUrl", url)}
            label={isBanner ? "Titulná / pozadie fotka" : "Fotka"}
          />
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="h-20 w-full rounded-lg object-cover"
            />
          ) : null}
          {isPremium ? (
            <MediaEffectSliders
              opacity={Number(props.imageOpacity ?? 100)}
              blur={Number(props.imageBlur ?? 0)}
              onOpacity={(v) => setProp("imageOpacity", v)}
              onBlur={(v) => setProp("imageBlur", v)}
            />
          ) : (
            <button
              type="button"
              onClick={() => onRequirePremium?.("Efekty fotky")}
              className="flex w-full items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-left text-[11px] text-amber-200/90"
            >
              <Lock className="h-3 w-3 shrink-0" />
              Blur a priehľadnosť fotky — Premium
            </button>
          )}
          {imageUrl ? (
            <button
              type="button"
              className="text-xs text-rose-400"
              onClick={() => setProp("imageUrl", "")}
            >
              Odstrániť fotku
            </button>
          ) : null}
        </>
      ) : null}

      {showMedia && !hasSidePhoto ? (
        <p className="text-sm text-zinc-500">
          Táto textová šablóna nemá fotku. Vyber šablónu s fotkou alebo banner.
        </p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-zinc-500">{label}</Label>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border-white/10 bg-black/40"
      />
    </Field>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
      />
    </Field>
  );
}

function GalleryInspector({
  section,
  userId,
  profilePhotos,
  onChange,
  mode = "all",
}: {
  section: PageSection;
  userId: string;
  profilePhotos: string[];
  onChange: (s: PageSection) => void;
  mode?: "text" | "media" | "all";
}) {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const props = section.props;
  const source = String(props.source ?? "profile");
  const items = (
    Array.isArray(props.items) ? props.items : []
  ) as MediaItem[];
  const showProfilePicker =
    source === "custom" || section.templateId === "gallery.grid3";
  const showText = mode === "text" || mode === "all";
  const showMedia = mode === "media" || mode === "all";
  const limit = Number(props.limit ?? 12) || 12;

  function setProp(key: string, value: unknown) {
    onChange({ ...section, props: { ...props, [key]: value } });
  }

  function updateItem(id: string, patch: Partial<MediaItem>) {
    setProp(
      "items",
      items.map((i) => (i.id === id ? { ...i, ...patch } : i))
    );
  }

  function setCaptionAt(index: number, caption: string, url?: string) {
    const next = [...items];
    while (next.length <= index) {
      next.push({ id: newId(), url: "", caption: "" });
    }
    const prev = next[index]!;
    next[index] = {
      ...prev,
      url: url ?? prev.url,
      caption,
    };
    setProp("items", next);
  }

  function pickProfilePhoto(url: string) {
    const next = [...items];
    const emptyIdx = next.findIndex((x) => !x.url);
    if (emptyIdx >= 0) {
      next[emptyIdx] = { ...next[emptyIdx]!, url };
    } else if (section.templateId === "gallery.grid3") {
      if (next.length < 3) {
        next.push({ id: newId(), url, caption: "" });
      } else {
        showToast("Všetky 3 sloty sú obsadené.", "error");
        return;
      }
    } else {
      next.push({ id: newId(), url, caption: "" });
    }
    setProp("items", next);
    setProp("source", "custom");
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("userId", userId);
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/upload-media", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { urls?: string[]; error?: string };
      if (!res.ok || !json.urls?.length) {
        showToast(json.error || "Upload zlyhal.", "error");
        return;
      }
      const added: MediaItem[] = json.urls.map((url) => ({
        id: newId(),
        url,
        caption: "",
      }));
      const next =
        section.templateId === "gallery.grid3"
          ? [...items]
          : [...items, ...added];
      if (section.templateId === "gallery.grid3") {
        for (let i = 0; i < added.length; i++) {
          const slot = next.findIndex((x) => !x.url);
          if (slot >= 0) next[slot] = { ...next[slot]!, ...added[i]! };
          else if (next.length < 3) next.push(added[i]!);
        }
      }
      setProp("items", next);
      setProp("source", "custom");
      showToast("Fotky nahraté.", "success");
    } catch {
      showToast("Upload zlyhal.", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {showText ? (
        <>
          <TextField
            label="Nadpis"
            value={String(props.title ?? "")}
            onChange={(v) => setProp("title", v)}
          />
          {source === "profile" ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">
                Popisy fotiek z profilu
              </p>
              {profilePhotos.slice(0, limit).length === 0 ? (
                <p className="text-xs text-zinc-600">
                  V profile zatiaľ nemáš fotky.
                </p>
              ) : (
                profilePhotos.slice(0, limit).map((url, idx) => (
                  <div
                    key={url}
                    className="space-y-1.5 rounded-xl border border-white/10 p-2"
                  >
                    <div className="flex gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />
                      <Input
                        placeholder={`Popis fotky ${idx + 1}`}
                        value={items[idx]?.caption ?? ""}
                        onChange={(e) =>
                          setCaptionAt(idx, e.target.value, url)
                        }
                        className="rounded-lg border-white/10 bg-black/40 text-sm"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </>
      ) : null}

      {showMedia ? (
        <>
          <EditorSelect
            label="Zdroj fotiek"
            value={source}
            onChange={(v) => setProp("source", v)}
            options={[
              { value: "profile", label: "Galéria z profilu" },
              { value: "custom", label: "Vlastné fotky" },
            ]}
          />
          {source === "profile" ? (
            <TextField
              label="Limit fotiek"
              value={String(props.limit ?? 12)}
              onChange={(v) => setProp("limit", Number(v) || 12)}
            />
          ) : null}
          {(section.templateId === "gallery.slideshow") && (
            <TextField
              label="Interval (ms)"
              value={String(props.speedMs ?? 4500)}
              onChange={(v) => setProp("speedMs", Number(v) || 4500)}
            />
          )}

          {showProfilePicker ? (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-500">
                  Fotky z profilu
                </p>
                {profilePhotos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    {profilePhotos.map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => pickProfilePhoto(url)}
                        className="aspect-square overflow-hidden rounded-lg border border-white/10 hover:border-violet-400"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600">
                    V profile zatiaľ nemáš fotky.
                  </p>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={(e) => void onUpload(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full rounded-xl"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="mr-1.5 h-4 w-4" />
                )}
                Nahrať novú
              </Button>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="space-y-1.5 rounded-xl border border-white/10 p-2"
                  >
                    <p className="text-[11px] text-zinc-500">Fotka {idx + 1}</p>
                    {item.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt=""
                        className="h-16 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-white/15 text-xs text-zinc-600">
                        Prázdny slot — vyber z profilu
                      </div>
                    )}
                    {showText || mode === "media" ? (
                      <Input
                        placeholder="Popis / caption"
                        value={item.caption}
                        onChange={(e) =>
                          updateItem(item.id, { caption: e.target.value })
                        }
                        className="rounded-lg border-white/10 bg-black/40 text-sm"
                      />
                    ) : null}
                    {section.templateId !== "gallery.grid3" ? (
                      <button
                        type="button"
                        className="text-xs text-rose-400"
                        onClick={() =>
                          setProp(
                            "items",
                            items.filter((i) => i.id !== item.id)
                          )
                        }
                      >
                        Odstrániť
                      </button>
                    ) : item.url ? (
                      <button
                        type="button"
                        className="text-xs text-rose-400"
                        onClick={() => updateItem(item.id, { url: "" })}
                      >
                        Vyčistiť slot
                      </button>
                    ) : null}
                  </div>
                ))}
                {section.templateId !== "gallery.grid3" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full rounded-xl"
                    onClick={() =>
                      setProp("items", [
                        ...items,
                        { id: newId(), url: "", caption: "" },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Pridať slot
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-500">
              Fotky z profilovej galérie. Popisy upravíš v záložke Texty alebo
              priamo v náhľade.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

function PackagesInspector({
  title,
  onTitle,
  extras,
}: {
  title: string;
  onTitle: (v: string) => void;
  extras: LandingExtra[];
}) {
  const activeCount = extras.filter((e) => e.is_active).length;

  return (
    <div className="space-y-3">
      <TextField label="Nadpis" value={title} onChange={onTitle} />
      <p className="text-sm text-zinc-400">
        Položky pochádzajú zo{" "}
        <span className="font-medium text-zinc-200">Špeciálna ponuka</span>.
        Aktívnych: {activeCount}.
      </p>
      <Link
        href="/dashboard/extras"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full rounded-xl")}
      >
        Spravovať ponuku
      </Link>
    </div>
  );
}

function FaqInspector({
  items,
  title,
  onTitle,
  onItems,
}: {
  items: FaqItem[];
  title: string;
  onTitle: (v: string) => void;
  onItems: (items: FaqItem[]) => void;
}) {
  return (
    <div className="space-y-3">
      <TextField label="Nadpis" value={title} onChange={onTitle} />
      {items.map((item, i) => (
        <div
          key={item.id}
          className="space-y-1.5 rounded-xl border border-white/10 p-2"
        >
          <Input
            value={item.question}
            placeholder="Otázka"
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...item, question: e.target.value };
              onItems(next);
            }}
            className="rounded-lg border-white/10 bg-black/40"
          />
          <textarea
            value={item.answer}
            placeholder="Odpoveď"
            rows={2}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...item, answer: e.target.value };
              onItems(next);
            }}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            className="text-xs text-rose-400"
            onClick={() => onItems(items.filter((x) => x.id !== item.id))}
          >
            Odstrániť
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full rounded-xl"
        onClick={() =>
          onItems([
            ...items,
            { id: newId(), question: "", answer: "" },
          ])
        }
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Pridať otázku
      </Button>
    </div>
  );
}
