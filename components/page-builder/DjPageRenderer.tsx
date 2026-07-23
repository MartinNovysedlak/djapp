"use client";

import Image from "next/image";
import { useState, type CSSProperties, type ReactNode } from "react";
import { MapPin, Plus, Star, Trash2 } from "lucide-react";
import BookingDialog from "@/components/BookingDialog";
import { GalleryLightbox } from "@/components/GalleryLightbox";
import type { LandingExtra, LandingProfile, LandingReview } from "@/app/actions/dj-page";
import {
  GalleryBento,
  GalleryGrid,
  GalleryMarquee,
  GallerySlideshow,
} from "@/components/page-builder/sections/GalleryLayouts";
import { HeroSectionView } from "@/components/page-builder/sections/HeroSectionView";
import {
  CalendarCardSection,
  CalendarCompactSection,
  CalendarMonthSection,
  CalendarWeeksSection,
} from "@/components/page-builder/sections/CalendarLayouts";
import {
  entranceClass,
  propBool,
  propNum,
  propString,
  resolveGalleryItems,
  sectionAlignClass,
  sectionBodyStyle,
  sectionPadClass,
  sectionTitleClass,
  sectionTitleStyle,
  sectionHeightClass,
  sectionHeightStyle,
  hasLockedSectionHeight,
  sectionBubbleFillStyle,
  sectionBubbleHasChrome,
  textRevealClass,
} from "@/components/page-builder/sections/section-utils";
import { EditableMediaBand } from "@/components/page-builder/EditableMediaBand";
import { InlineEditable } from "@/components/page-builder/InlineEditable";
import {
  ACCENT_CLASSES,
  type FaqItem,
  type PageSection,
  type PageTheme,
} from "@/lib/page-builder/types";
import {
  resolveProfilePhoto,
  themeAccentStyle,
  themeBgClass,
  themeCtaBandClass,
  themeDensityGap,
  themeDensityPad,
  themeHeroShellClass,
  themeSurfaceClass,
  themeSurfaceStructureClass,
  themeTitleWeightClass,
} from "@/lib/page-builder/theme-utils";
import { canRemoveSection } from "@/lib/page-builder/section-order";
import { formatExtraPrice } from "@/lib/extras/types";
import { getDjStageName, getArtistKindLabel } from "@/lib/dj-display";
import { getVideoEmbedUrl, isDirectVideoFile } from "@/lib/video";
import { cn } from "@/lib/utils";

export type DjPageRendererProps = {
  profile: LandingProfile;
  theme: PageTheme;
  sections: PageSection[];
  reviews: LandingReview[];
  extras?: LandingExtra[];
  bookingEnabled?: boolean;
  className?: string;
  selectedSectionId?: string | null;
  onSelectSection?: (id: string) => void;
  editMode?: boolean;
  onUpdateSection?: (section: PageSection) => void;
  onDeleteSection?: (id: string) => void;
  onSyncBio?: (bio: string) => void;
  /** Insert new section at this index in the full sections array (min 1). */
  onRequestInsertAt?: (index: number) => void;
  profilePhotos?: string[];
  /** Optional chrome above sections (e.g. back link) — inside themed canvas */
  beforeSections?: ReactNode;
  /** Optional chrome below sections (e.g. footer) — inside themed canvas */
  afterSections?: ReactNode;
};

function CtaButton({
  profile,
  label,
  accent,
  style = "solid",
  bookingEnabled,
  className,
}: {
  profile: LandingProfile;
  label: string;
  accent: PageTheme["accent"];
  style?: "solid" | "outline";
  bookingEnabled: boolean;
  className?: string;
}) {
  const classes = ACCENT_CLASSES[accent];
  const btnClass = cn(
    "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-all",
    style === "solid"
      ? `bg-gradient-to-r ${classes.gradient} text-white shadow-lg`
      : `border ${classes.border} bg-transparent ${classes.text} hover:bg-white/5`,
    className
  );

  if (!bookingEnabled) {
    return <span className={cn(btnClass, "opacity-80")}>{label}</span>;
  }

  return (
    <BookingDialog
      djId={profile.id}
      djName={getDjStageName(profile, "DJ")}
      artistKind={profile.artist_kind}
    >
      <button type="button" className={btnClass}>
        {label}
      </button>
    </BookingDialog>
  );
}

export function DjPageRenderer({
  profile,
  theme,
  sections,
  reviews,
  extras = [],
  bookingEnabled = true,
  className,
  selectedSectionId,
  onSelectSection,
  editMode = false,
  onUpdateSection,
  onDeleteSection,
  onSyncBio,
  onRequestInsertAt,
  profilePhotos = [],
  beforeSections,
  afterSections,
}: DjPageRendererProps) {
  const accent = ACCENT_CLASSES[theme.accent];
  const name = getDjStageName(profile, "DJ");
  const kindLabel = getArtistKindLabel(profile.artist_kind);
  const gallery = (profile.gallery_urls ?? []).filter(Boolean);
  const videos = (profile.video_urls ?? []).filter(Boolean);
  const socials = Object.entries(profile.social_links ?? {}).filter(
    ([, url]) => Boolean(url?.trim())
  );

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxUrls, setLightboxUrls] = useState<string[]>([]);

  const visible = sections.filter((s) => s.visible);
  const sectionShell = themeSurfaceClass(theme, accent);
  const titleWeight = themeTitleWeightClass(theme.titleWeight);
  const gapClass = themeDensityGap(theme.density, theme.cardLayout);
  const bg = themeBgClass(theme);
  const motionClass =
    theme.motion === "lively"
      ? "page-motion-lively"
      : theme.motion === "static"
        ? "page-motion-static"
        : "";

  function openLightbox(urls: string[], index: number) {
    setLightboxUrls(urls);
    setLightboxIndex(index);
  }

  const atmosphereClass =
    theme.atmosphere === "none"
      ? null
      : `page-atmosphere-${theme.atmosphere}`;

  return (
    <div
      className={cn(
        "relative min-h-full overflow-hidden font-[family-name:var(--font-outfit)] isolation-isolate",
        bg,
        motionClass,
        className
      )}
      style={themeAccentStyle(theme.accent)}
    >
      {atmosphereClass ? (
        <div className="page-atmosphere-stage" aria-hidden>
          <div className={atmosphereClass} />
        </div>
      ) : null}
      {beforeSections ? (
        <div className="relative z-10">{beforeSections}</div>
      ) : null}
      <div
        className={cn(
          "relative z-10 mx-auto flex max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-10",
          theme.sectionDividers
            ? "gap-0 divide-y divide-white/15"
            : gapClass
        )}
      >
        {visible.map((section, visibleIndex) => {
          const selected = selectedSectionId === section.id;
          const fullIndex = sections.findIndex((s) => s.id === section.id);
          const isHero = section.type === "hero";
          const isBannerText =
            section.templateId === "text.banner" ||
            section.templateId === "text.overlay";
          const isCtaBanner =
            section.type === "cta" && section.templateId === "cta.banner";
          const heightLocked = hasLockedSectionHeight(section.style);
          const heightStyle = sectionHeightStyle(section.style);
          const sectionStyle = {
            align: section.style?.align ?? "left",
            titleSizePx: section.style?.titleSizePx ?? 22,
            bodySizePx: section.style?.bodySizePx ?? 15,
            entrance: section.style?.entrance ?? "fade",
            paddingY: section.style?.paddingY ?? "md",
            contentHeight: section.style?.contentHeight ?? "auto",
            contentHeightPx: section.style?.contentHeightPx ?? 280,
            surfaceBg: section.style?.surfaceBg ?? "theme",
            surfaceOpacity: section.style?.surfaceOpacity ?? 100,
          } as const;
          const useBubbleShell = !(isHero || isBannerText || isCtaBanner);
          const bubbleChrome =
            useBubbleShell && sectionBubbleHasChrome(sectionStyle, theme);
          const bubbleFill = useBubbleShell
            ? sectionBubbleFillStyle(sectionStyle, theme)
            : null;
          const wrapClass = cn(
            isHero || isBannerText
              ? themeHeroShellClass(theme, accent)
              : isCtaBanner
                ? themeCtaBandClass(theme, accent)
                : useBubbleShell
                  ? themeSurfaceStructureClass(theme, accent, {
                      forceCardChrome: bubbleChrome,
                    })
                  : sectionShell,
            !(isHero || isBannerText) && sectionPadClass(section.style),
            !isHero && sectionHeightClass(section.style),
            heightLocked && !isHero && "min-h-0",
            heightLocked && isBannerText && "p-0",
            entranceClass(section.style.entrance),
            useBubbleShell && "relative overflow-hidden",
            theme.sectionDividers && useBubbleShell && "rounded-none",
            onSelectSection &&
              "cursor-pointer outline-offset-2 transition ring-0",
            selected && "ring-2 ring-violet-400/70"
          );
          const wrapStyle: CSSProperties = {
            ...(heightStyle ?? {}),
            ...(bubbleFill ?? {}),
          };

          const header = (title: string, propKey = "title") =>
            title || editMode ? (
              <InlineEditable
                as="h2"
                enabled={editMode}
                value={title}
                placeholder="Nadpis…"
                onChange={(v) => {
                  if (!onUpdateSection) return;
                  onUpdateSection({
                    ...section,
                    props: { ...section.props, [propKey]: v },
                  });
                }}
                style={sectionTitleStyle(section.style)}
                className={cn(
                  sectionTitleClass(),
                  titleWeight,
                  textRevealClass(!editMode),
                  section.style.align === "center" && "text-center",
                  section.style.align === "right" && "text-right",
                  "mb-4 block w-full"
                )}
              />
            ) : null;

          const setProp = (key: string, value: unknown) => {
            if (!onUpdateSection) return;
            onUpdateSection({
              ...section,
              props: { ...section.props, [key]: value },
            });
          };

          const content = (() => {
            switch (section.type) {
              case "hero": {
                const ctaLabel =
                  propString(section.props, "ctaLabel") ||
                  "Nezáväzná rezervácia";
                return (
                  <HeroSectionView
                    section={section}
                    profile={profile}
                    theme={theme}
                    name={name}
                    kindLabel={kindLabel}
                    editMode={editMode}
                    titleWeight={titleWeight}
                    setProp={setProp}
                    profilePhotos={profilePhotos}
                    selected={selected}
                    cta={
                      <CtaButton
                        profile={profile}
                        label={ctaLabel}
                        accent={theme.accent}
                        bookingEnabled={bookingEnabled}
                      />
                    }
                  />
                );
              }
              case "about": {
                const title = propString(section.props, "title", "O mne");
                const useProfile = propBool(
                  section.props,
                  "useProfileBio",
                  true
                );
                const propBody = propString(section.props, "body");
                const body = editMode
                  ? propBody || profile.bio || ""
                  : useProfile
                    ? profile.bio || propBody
                    : propBody || profile.bio || "";
                const quote = section.templateId === "about.quote";
                return (
                  <div
                    className={cn(
                      "flex flex-col",
                      sectionAlignClass(section.style)
                    )}
                  >
                    {header(title)}
                    <InlineEditable
                      as="p"
                      enabled={editMode}
                      multiline
                      value={body}
                      placeholder="Napíš niečo o sebe…"
                      onChange={(v) => {
                        setProp("body", v);
                      }}
                      onBlurCommit={(v) => {
                        onSyncBio?.(v);
                      }}
                      style={sectionBodyStyle(section.style)}
                      className={cn(
                        "max-w-prose whitespace-pre-wrap leading-relaxed text-zinc-300",
                        textRevealClass(!editMode),
                        quote && "italic text-zinc-200",
                        section.style.align === "center" &&
                          "mx-auto text-center"
                      )}
                    />
                    {editMode ? (
                      <p className="mt-2 text-[11px] text-zinc-600">
                        Úprava bio sa uloží aj do tvojho profilu.
                      </p>
                    ) : null}
                  </div>
                );
              }
              case "text": {
                const title = propString(section.props, "title", "Nadpis");
                const body = propString(section.props, "body");
                const imageUrl = propString(section.props, "imageUrl");
                const imageCaption = propString(section.props, "imageCaption");
                const photoLeft = section.templateId === "text.photoLeft";
                const photoRight = section.templateId === "text.photoRight";
                const feature = section.templateId === "text.feature";
                const isBanner = section.templateId === "text.banner";
                const isOverlay = section.templateId === "text.overlay";
                const showCover = propBool(section.props, "showCover", true);
                const showImageCaption = propBool(
                  section.props,
                  "showImageCaption",
                  true
                );
                const imageOpacity = propNum(section.props, "imageOpacity", 100);
                const imageBlur = propNum(section.props, "imageBlur", 0);
                const photoWidth = propString(section.props, "photoWidth", "md");
                const photoAspect = propString(
                  section.props,
                  "photoAspect",
                  "portrait"
                );
                const contentLayout = propString(
                  section.props,
                  "contentLayout",
                  "side"
                );
                const titlePosition = propString(
                  section.props,
                  "titlePosition",
                  "bottom"
                );
                const resolvedImage =
                  imageUrl ||
                  resolveProfilePhoto(profile, null) ||
                  "";
                const contentPad = themeDensityPad(theme.density);

                const photoWidthClass =
                  photoWidth === "sm"
                    ? "sm:max-w-[180px]"
                    : photoWidth === "lg"
                      ? "sm:max-w-[320px]"
                      : "sm:max-w-[240px]";
                const aspectClass =
                  photoAspect === "square"
                    ? "aspect-square"
                    : photoAspect === "landscape"
                      ? "aspect-[4/3]"
                      : "aspect-[4/5]";

                const titleEl = (
                  <InlineEditable
                    as="h2"
                    enabled={editMode}
                    value={title}
                    placeholder="Nadpis…"
                    onChange={(v) => setProp("title", v)}
                    style={sectionTitleStyle(section.style)}
                    className={cn(
                      sectionTitleClass(),
                      titleWeight,
                      textRevealClass(!editMode),
                      feature && accent.text,
                      "mb-3 block w-full"
                    )}
                  />
                );
                const bodyEl = (
                  <InlineEditable
                    as="p"
                    enabled={editMode}
                    multiline
                    value={body}
                    placeholder="Text…"
                    onChange={(v) => setProp("body", v)}
                    style={sectionBodyStyle(section.style)}
                    className={cn(
                      "block w-full whitespace-pre-wrap leading-relaxed text-zinc-300",
                      textRevealClass(!editMode)
                    )}
                  />
                );

                const textCol = (
                  <div
                    className={cn(
                      "flex min-w-0 flex-1 flex-col",
                      heightLocked && "h-full justify-center overflow-auto",
                      sectionAlignClass(section.style)
                    )}
                  >
                    {titleEl}
                    {bodyEl}
                  </div>
                );

                if (isBanner) {
                  return (
                    <div
                      className={cn(
                        "flex w-full flex-col",
                        heightLocked && "h-full min-h-0"
                      )}
                    >
                      {showCover ? (
                        <EditableMediaBand
                          src={resolvedImage || null}
                          opacity={imageOpacity}
                          blur={imageBlur}
                          editMode={editMode}
                          showControls={editMode && selected}
                          userId={profile.id}
                          profilePhotos={profilePhotos}
                          onChangeSrc={(url) => setProp("imageUrl", url)}
                          fillHeight={heightLocked}
                          className={
                            heightLocked ? "min-h-0 flex-1" : undefined
                          }
                        />
                      ) : null}
                      <div
                        className={cn(
                          contentPad,
                          "pb-6 pt-5 sm:pb-8 sm:pt-6",
                          heightLocked && "shrink-0 py-3 sm:py-4"
                        )}
                      >
                        {textCol}
                      </div>
                    </div>
                  );
                }

                if (isOverlay) {
                  const posClass =
                    titlePosition === "top"
                      ? "top-0 justify-start pb-10 pt-7 sm:pt-9"
                      : titlePosition === "center"
                        ? "inset-y-0 justify-center py-8"
                        : "bottom-0 justify-end pb-7 pt-16 sm:pb-9";
                  const gradientClass =
                    titlePosition === "top"
                      ? "bg-gradient-to-b from-black/85 via-black/40 to-transparent"
                      : titlePosition === "center"
                        ? "bg-gradient-to-t from-black/70 via-black/45 to-black/70"
                        : "bg-gradient-to-t from-black/85 via-black/45 to-black/20";
                  return (
                    <div
                      className={cn(
                        "relative w-full",
                        heightLocked && "h-full min-h-0"
                      )}
                    >
                      <EditableMediaBand
                        src={resolvedImage || null}
                        opacity={imageOpacity}
                        blur={imageBlur}
                        tall={!heightLocked}
                        fillHeight={heightLocked}
                        editMode={editMode}
                        showControls={editMode && selected}
                        userId={profile.id}
                        profilePhotos={profilePhotos}
                        onChangeSrc={(url) => setProp("imageUrl", url)}
                        className={
                          heightLocked ? "absolute inset-0 h-full" : undefined
                        }
                      />
                      <div
                        className={cn(
                          "pointer-events-none absolute inset-0",
                          gradientClass
                        )}
                      />
                      <div
                        className={cn(
                          "absolute inset-x-0 z-[5] flex flex-col gap-2",
                          posClass,
                          contentPad,
                          sectionAlignClass(section.style)
                        )}
                      >
                        <InlineEditable
                          as="h2"
                          enabled={editMode}
                          value={title}
                          placeholder="Nadpis…"
                          onChange={(v) => setProp("title", v)}
                          style={sectionTitleStyle(section.style)}
                          className={cn(
                            sectionTitleClass(),
                            titleWeight,
                            textRevealClass(!editMode),
                            "mb-1 block w-full text-white"
                          )}
                        />
                        <InlineEditable
                          as="p"
                          enabled={editMode}
                          multiline
                          value={body}
                          placeholder="Text…"
                          onChange={(v) => setProp("body", v)}
                          style={sectionBodyStyle(section.style)}
                          className={cn(
                            "block w-full whitespace-pre-wrap leading-relaxed text-zinc-200",
                            textRevealClass(!editMode)
                          )}
                        />
                      </div>
                    </div>
                  );
                }

                const photoCol =
                  photoLeft || photoRight ? (
                    <div
                      className={cn(
                        "w-full space-y-2 sm:shrink-0",
                        photoWidthClass,
                        heightLocked &&
                          "h-[42%] min-h-0 space-y-1 sm:flex sm:h-auto sm:min-h-0 sm:flex-1 sm:flex-col"
                      )}
                    >
                      <EditableMediaBand
                        src={resolvedImage || null}
                        opacity={imageOpacity}
                        blur={imageBlur}
                        framed
                        aspectClass={heightLocked ? undefined : aspectClass}
                        fillHeight={heightLocked}
                        editMode={editMode}
                        showControls={editMode && selected}
                        userId={profile.id}
                        profilePhotos={profilePhotos}
                        onChangeSrc={(url) => setProp("imageUrl", url)}
                        className={cn(
                          "w-full",
                          heightLocked && "min-h-0 flex-1"
                        )}
                      />
                      {showImageCaption && editMode && selected ? (
                        <InlineEditable
                          as="p"
                          enabled
                          value={imageCaption}
                          placeholder="Popis fotky…"
                          onChange={(v) => setProp("imageCaption", v)}
                          className="block w-full shrink-0 text-sm text-zinc-400"
                        />
                      ) : showImageCaption && imageCaption ? (
                        <p className="shrink-0 text-sm text-zinc-400">
                          {imageCaption}
                        </p>
                      ) : null}
                    </div>
                  ) : null;

                if (photoLeft || photoRight) {
                  if (contentLayout === "stack") {
                    return (
                      <div
                        className={cn(
                          "flex flex-col gap-4",
                          heightLocked && "min-h-0 flex-1",
                          sectionAlignClass(section.style)
                        )}
                      >
                        <div className={cn(heightLocked && "shrink-0")}>
                          {titleEl}
                        </div>
                        <div
                          className={cn(
                            "flex min-h-0 flex-col gap-4 sm:flex-row",
                            heightLocked
                              ? "flex-1 items-stretch"
                              : "sm:items-start",
                            photoRight && "sm:flex-row-reverse"
                          )}
                        >
                          {photoCol}
                          <div
                            className={cn(
                              "min-w-0 flex-1",
                              heightLocked && "overflow-auto"
                            )}
                          >
                            {bodyEl}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      className={cn(
                        "flex flex-col gap-4 sm:flex-row",
                        heightLocked
                          ? "min-h-0 flex-1 items-stretch"
                          : "sm:items-start",
                        photoRight && "sm:flex-row-reverse"
                      )}
                    >
                      {photoCol}
                      {textCol}
                    </div>
                  );
                }

                return (
                  <div
                    className={cn(heightLocked && "flex min-h-0 flex-1 flex-col")}
                  >
                    {textCol}
                  </div>
                );
              }
              case "gallery": {
                const title = propString(section.props, "title", "Galéria");
                const items = resolveGalleryItems(section, gallery);
                const urls = items.map((i) => i.url);
                const speedRaw = propNum(
                  section.props,
                  "speedMs",
                  section.templateId === "gallery.marquee" ? 40000 : 4500
                );
                const speed =
                  section.templateId === "gallery.marquee" && speedRaw < 1000
                    ? 40000
                    : speedRaw;
                const showCaptions = propBool(
                  section.props,
                  "showCaptions",
                  true
                );
                const showTitle = propBool(section.props, "showTitle", true);
                const tileSize = propString(
                  section.props,
                  "tileSize",
                  "md"
                ) as "sm" | "md" | "lg";

                const updateCaption = (index: number, caption: string) => {
                  if (!onUpdateSection) return;
                  const raw = Array.isArray(section.props.items)
                    ? ([...section.props.items] as {
                        id?: string;
                        url?: string;
                        caption?: string;
                      }[])
                    : [];
                  while (raw.length <= index) {
                    raw.push({
                      id: `g_${raw.length}`,
                      url: gallery[raw.length] || items[raw.length]?.url || "",
                      caption: "",
                    });
                  }
                  const prev = raw[index] ?? {};
                  raw[index] = {
                    id: prev.id || items[index]?.id || `g_${index}`,
                    url: prev.url || items[index]?.url || "",
                    caption,
                  };
                  onUpdateSection({
                    ...section,
                    props: { ...section.props, items: raw },
                  });
                };

                return (
                  <div>
                    {showTitle ? header(title) : null}
                    {section.templateId === "gallery.slideshow" ? (
                      <GallerySlideshow
                        items={items}
                        speedMs={speed}
                        showCaptions={showCaptions}
                        onOpen={(i) => openLightbox(urls, i)}
                        editMode={editMode && selected}
                        onCaptionChange={updateCaption}
                      />
                    ) : section.templateId === "gallery.marquee" ? (
                      <GalleryMarquee
                        items={items}
                        speedMs={speed}
                        tileSize={tileSize}
                        showCaptions={showCaptions}
                        onOpen={(i) => openLightbox(urls, i)}
                        editMode={editMode && selected}
                        onCaptionChange={updateCaption}
                      />
                    ) : section.templateId === "gallery.bento" ? (
                      <GalleryBento
                        items={items}
                        showCaptions={showCaptions}
                        onOpen={(i) => openLightbox(urls, i)}
                        editMode={editMode && selected}
                        onCaptionChange={updateCaption}
                      />
                    ) : (
                      <GalleryGrid
                        items={items}
                        columns={
                          section.templateId === "gallery.grid2" ? 2 : 3
                        }
                        showCaptions={showCaptions}
                        onOpen={(i) => openLightbox(urls, i)}
                        editMode={editMode && selected}
                        onCaptionChange={updateCaption}
                      />
                    )}
                  </div>
                );
              }
              case "calendar": {
                const title = propString(
                  section.props,
                  "title",
                  "Dostupnosť"
                );
                const subtitle = propString(section.props, "subtitle");
                return (
                  <div>
                    {section.templateId !== "calendar.card"
                      ? header(title)
                      : null}
                    {section.templateId === "calendar.compact" ? (
                      <CalendarCompactSection djId={profile.id} />
                    ) : section.templateId === "calendar.card" ? (
                      <CalendarCardSection
                        djId={profile.id}
                        title={title}
                        subtitle={subtitle}
                      />
                    ) : section.templateId === "calendar.weeks" ? (
                      <CalendarWeeksSection djId={profile.id} />
                    ) : (
                      <CalendarMonthSection djId={profile.id} />
                    )}
                  </div>
                );
              }
              case "media": {
                const title = propString(section.props, "title", "Ukážky");
                if (!videos.length) {
                  return (
                    <div>
                      {header(title)}
                      <p className="text-sm text-zinc-500">
                        Pridaj videá v profile.
                      </p>
                    </div>
                  );
                }
                const featured = section.templateId === "media.featured";
                const filmstrip = section.templateId === "media.filmstrip";
                const main = featured ? videos[0] : null;
                const rest = featured ? videos.slice(1) : videos;

                const renderVideo = (url: string, key: string) => {
                  const embed = getVideoEmbedUrl(url);
                  if (embed) {
                    return (
                      <div
                        key={key}
                        className="aspect-video overflow-hidden rounded-2xl border border-white/10"
                      >
                        <iframe
                          src={embed}
                          title="Video"
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    );
                  }
                  if (isDirectVideoFile(url)) {
                    return (
                      <video
                        key={key}
                        src={url}
                        controls
                        className="w-full rounded-2xl border border-white/10"
                      />
                    );
                  }
                  return (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm text-violet-300 hover:underline"
                    >
                      {url}
                    </a>
                  );
                };

                return (
                  <div>
                    {header(title)}
                    <div className="space-y-4">
                      {main ? (
                        <div className="aspect-video overflow-hidden rounded-2xl border border-white/10">
                          {getVideoEmbedUrl(main) ? (
                            <iframe
                              src={getVideoEmbedUrl(main)!}
                              title="Video"
                              className="h-full w-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <video
                              src={main}
                              controls
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                      ) : null}
                      {filmstrip ? (
                        <div className="flex gap-3 overflow-x-auto pb-1">
                          {videos.map((url) => (
                            <div
                              key={url}
                              className="w-[240px] shrink-0 sm:w-[280px]"
                            >
                              {renderVideo(url, url)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          className={
                            featured && rest.length
                              ? "grid gap-3 sm:grid-cols-2"
                              : "space-y-4"
                          }
                        >
                          {rest.map((url) => renderVideo(url, url))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              case "packages": {
                const title = propString(
                  section.props,
                  "title",
                  "Špeciálna ponuka"
                );
                const items = extras.filter((e) => e.is_active !== false);
                const asList = section.templateId === "packages.list";
                const highlight = section.templateId === "packages.highlight";
                return (
                  <div>
                    {header(title)}
                    {items.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        Zatiaľ žiadne položky v Špeciálnej ponuke. Pridaj ich v
                        dashboarde → Špeciálna ponuka.
                      </p>
                    ) : (
                      <div
                        className={
                          asList
                            ? "space-y-3"
                            : "grid gap-3 sm:grid-cols-2"
                        }
                      >
                        {items.map((pkg, idx) => (
                          <div
                            key={pkg.id}
                            className={cn(
                              "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]",
                              highlight &&
                                idx === 0 &&
                                cn("border-2", accent.border, "bg-white/[0.06]")
                            )}
                          >
                            {pkg.image_url ? (
                              <div className="relative aspect-[16/10] w-full">
                                <Image
                                  src={pkg.image_url}
                                  alt={pkg.title}
                                  fill
                                  className="object-cover"
                                  sizes="360px"
                                />
                              </div>
                            ) : null}
                            <div className="p-4">
                              <div className="flex items-baseline justify-between gap-2">
                                <h3 className="font-medium text-white">
                                  {pkg.title}
                                </h3>
                                {pkg.price > 0 ? (
                                  <span
                                    className={cn(
                                      "text-sm font-semibold",
                                      accent.text
                                    )}
                                  >
                                    {formatExtraPrice(pkg.price)}
                                  </span>
                                ) : null}
                              </div>
                              {pkg.description ? (
                                <p className="mt-2 text-sm text-zinc-400">
                                  {pkg.description}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              case "reviews": {
                const title = propString(section.props, "title", "Recenzie");
                const limit = propNum(section.props, "limit", 6);
                const list = reviews.slice(0, limit);
                const asGrid = section.templateId === "reviews.grid";
                const spotlight = section.templateId === "reviews.spotlight";
                const strip = section.templateId === "reviews.strip";

                const reviewCard = (r: LandingReview, big = false) => (
                  <div
                    key={r.id}
                    className={cn(
                      "rounded-2xl border border-white/10 bg-white/[0.03] p-4",
                      big && "p-6 text-center",
                      strip && "min-w-[240px] shrink-0"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        big && "justify-center"
                      )}
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            big ? "h-4 w-4" : "h-3.5 w-3.5",
                            i < r.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-zinc-600"
                          )}
                        />
                      ))}
                      <span className="ml-2 text-xs text-zinc-500">
                        {r.client_name}
                      </span>
                    </div>
                    {r.comment ? (
                      <p
                        className={cn(
                          "mt-2 text-sm text-zinc-300",
                          big && "mt-4 text-base leading-relaxed text-zinc-200"
                        )}
                      >
                        {big ? `„${r.comment}“` : r.comment}
                      </p>
                    ) : null}
                  </div>
                );

                return (
                  <div>
                    {header(title)}
                    {list.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        Zatiaľ žiadne recenzie.
                      </p>
                    ) : spotlight ? (
                      reviewCard(list[0]!, true)
                    ) : strip ? (
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {list.map((r) => reviewCard(r))}
                      </div>
                    ) : (
                      <div
                        className={
                          asGrid
                            ? "grid gap-3 sm:grid-cols-2"
                            : "space-y-3"
                        }
                      >
                        {list.map((r) => reviewCard(r))}
                      </div>
                    )}
                  </div>
                );
              }
              case "faq": {
                const title = propString(section.props, "title", "FAQ");
                const items = (
                  Array.isArray(section.props.items)
                    ? section.props.items
                    : []
                ) as FaqItem[];
                const stack = section.templateId === "faq.stack";
                const columns = section.templateId === "faq.columns";
                const canEditFaq = editMode && selected;

                const updateFaqItem = (
                  id: string,
                  patch: Partial<FaqItem>
                ) => {
                  if (!onUpdateSection) return;
                  onUpdateSection({
                    ...section,
                    props: {
                      ...section.props,
                      items: items.map((it) =>
                        it.id === id ? { ...it, ...patch } : it
                      ),
                    },
                  });
                };

                return (
                  <div>
                    {header(title)}
                    <div
                      className={cn(
                        "space-y-2",
                        columns && "sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0"
                      )}
                    >
                      {items
                        .filter(
                          (item) =>
                            canEditFaq ||
                            item.question.trim() ||
                            item.answer.trim()
                        )
                        .map((item) =>
                          stack || canEditFaq || columns ? (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                            >
                              <InlineEditable
                                as="p"
                                enabled={canEditFaq}
                                value={item.question}
                                placeholder="Otázka…"
                                onChange={(v) =>
                                  updateFaqItem(item.id, { question: v })
                                }
                                className="block w-full font-medium text-white"
                              />
                              <InlineEditable
                                as="p"
                                enabled={canEditFaq}
                                multiline
                                value={item.answer}
                                placeholder="Odpoveď…"
                                onChange={(v) =>
                                  updateFaqItem(item.id, { answer: v })
                                }
                                className="mt-2 block w-full text-sm text-zinc-400"
                              />
                            </div>
                          ) : (
                            <details
                              key={item.id}
                              className="group rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                            >
                              <summary className="cursor-pointer list-none font-medium text-white marker:content-none">
                                {item.question}
                              </summary>
                              <p className="mt-2 text-sm text-zinc-400">
                                {item.answer}
                              </p>
                            </details>
                          )
                        )}
                    </div>
                  </div>
                );
              }
              case "contact": {
                const title = propString(section.props, "title", "Kontakt");
                const showSocials = propBool(
                  section.props,
                  "showSocials",
                  true
                );
                const showLocation = propBool(
                  section.props,
                  "showLocation",
                  true
                );
                const cards = section.templateId === "contact.cards";
                const pills = section.templateId === "contact.pill";
                return (
                  <div>
                    {header(title)}
                    <div
                      className={cn(
                        "text-sm text-zinc-300",
                        cards
                          ? "grid gap-3 sm:grid-cols-2"
                          : pills
                            ? "flex flex-wrap items-center justify-center gap-2"
                            : "space-y-3"
                      )}
                    >
                      {showLocation && profile.location ? (
                        <p
                          className={cn(
                            "flex items-center gap-2",
                            cards &&
                              "rounded-2xl border border-white/10 bg-white/[0.03] p-4",
                            pills &&
                              "rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5"
                          )}
                        >
                          <MapPin className="h-4 w-4 text-zinc-500" />
                          {profile.location}
                        </p>
                      ) : null}
                      {showSocials && socials.length > 0 ? (
                        <div
                          className={cn(
                            "flex flex-wrap gap-2",
                            cards &&
                              "rounded-2xl border border-white/10 bg-white/[0.03] p-4",
                            pills && "contents"
                          )}
                        >
                          {socials.map(([key, url]) => (
                            <a
                              key={key}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                "rounded-full border border-white/10 px-3 py-1 capitalize hover:bg-white/5",
                                accent.text
                              )}
                            >
                              {key}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              }
              case "cta": {
                const title = propString(
                  section.props,
                  "title",
                  "Pripravení?"
                );
                const label = propString(section.props, "label", "Poslať dopyt");
                const buttonStyle =
                  propString(section.props, "buttonStyle", "solid") ===
                  "outline"
                    ? "outline"
                    : "solid";
                const split = section.templateId === "cta.split";
                const minimal = section.templateId === "cta.minimal";
                return (
                  <div
                    className={cn(
                      "flex gap-4",
                      split
                        ? "flex-col items-start justify-between sm:flex-row sm:items-center"
                        : cn("flex-col", sectionAlignClass(section.style))
                    )}
                  >
                    {!minimal || title || editMode ? (
                      <InlineEditable
                        as="h2"
                        enabled={editMode}
                        value={title}
                        placeholder="CTA nadpis…"
                        onChange={(v) => setProp("title", v)}
                        style={sectionTitleStyle(section.style)}
                        className={cn(
                          sectionTitleClass(),
                          titleWeight,
                          textRevealClass(!editMode),
                          "block",
                          minimal && !title && !editMode && "hidden"
                        )}
                      />
                    ) : null}
                    <CtaButton
                      profile={profile}
                      label={label}
                      accent={theme.accent}
                      style={buttonStyle}
                      bookingEnabled={bookingEnabled}
                    />
                  </div>
                );
              }
              default:
                return null;
            }
          })();

          const showDelete =
            editMode &&
            onDeleteSection &&
            canRemoveSection(section) &&
            selected;

          const inner = (
            <>
              {showDelete ? (
                <button
                  type="button"
                  title="Vymazať sekciu"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSection(section.id);
                  }}
                  className="absolute right-3 top-3 z-10 rounded-lg border border-rose-500/30 bg-rose-500/15 p-1.5 text-rose-300 opacity-0 transition hover:bg-rose-500/25 group-hover/section:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {content}
            </>
          );

          let card: ReactNode;
          if (onSelectSection) {
            card = (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSection(section.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectSection(section.id);
                  }
                }}
                className={cn(wrapClass, "group/section relative")}
                style={wrapStyle}
              >
                {inner}
              </div>
            );
          } else {
            card = (
              <section className={wrapClass} style={wrapStyle}>
                {content}
              </section>
            );
          }

          const insertBefore =
            editMode &&
            onRequestInsertAt &&
            visibleIndex > 0 &&
            fullIndex > 0;
          const insertAfter =
            editMode &&
            onRequestInsertAt &&
            visibleIndex === visible.length - 1;

          return (
            <div key={section.id} className="flex flex-col">
              {insertBefore ? (
                <SectionInsertGap
                  onInsert={() =>
                    onRequestInsertAt(Math.max(1, fullIndex))
                  }
                />
              ) : null}
              {card}
              {insertAfter ? (
                <SectionInsertGap
                  onInsert={() => onRequestInsertAt(sections.length)}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {afterSections ? (
        <div className="relative z-10">{afterSections}</div>
      ) : null}

      {lightboxIndex !== null && lightboxUrls.length > 0 ? (
        <GalleryLightbox
          images={lightboxUrls}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      ) : null}
    </div>
  );
}

function SectionInsertGap({ onInsert }: { onInsert: () => void }) {
  return (
    <div className="group/insert relative flex items-center justify-center py-3">
      <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-white/10 transition group-hover/insert:bg-violet-400/40" />
      <button
        type="button"
        title="Vložiť sekciu sem"
        onClick={(e) => {
          e.stopPropagation();
          onInsert();
        }}
        className="relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#121212] text-zinc-400 shadow-lg transition hover:border-violet-400/50 hover:bg-violet-500/20 hover:text-white"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
