"use client";

import Image from "next/image";
import { BadgeCheck } from "lucide-react";
import type { LandingProfile } from "@/app/actions/dj-page";
import { EditableMediaBand } from "@/components/page-builder/EditableMediaBand";
import { InlineEditable } from "@/components/page-builder/InlineEditable";
import {
  sectionAlignClass,
  sectionBodyStyle,
  sectionTitleStyle,
  textRevealClass,
} from "@/components/page-builder/sections/section-utils";
import {
  ACCENT_CLASSES,
  type PageSection,
  type PageTheme,
} from "@/lib/page-builder/types";
import {
  resolveProfilePhoto,
  themeDensityPad,
  themeRadiusClass,
} from "@/lib/page-builder/theme-utils";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type HeroProps = {
  section: PageSection;
  profile: LandingProfile;
  theme: PageTheme;
  name: string;
  kindLabel: string;
  editMode: boolean;
  titleWeight: string;
  cta: ReactNode;
  setProp: (key: string, value: unknown) => void;
  profilePhotos?: string[];
  selected?: boolean;
};

function propStr(props: Record<string, unknown>, key: string) {
  const v = props[key];
  return typeof v === "string" && v.trim() ? v.trim() : "";
}

function propNum(props: Record<string, unknown>, key: string, fallback: number) {
  const v = props[key];
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function HeroSectionView({
  section,
  profile,
  theme,
  name,
  kindLabel,
  editMode,
  titleWeight,
  cta,
  setProp,
  profilePhotos = [],
  selected = false,
}: HeroProps) {
  const accent = ACCENT_CLASSES[theme.accent];
  const radiusClass = themeRadiusClass(theme.radius);
  const contentPad = themeDensityPad(theme.density);
  const heroStyle = theme.heroStyle;
  const props = section.props;
  const headline = propStr(props, "headline") || name;
  const sub =
    propStr(props, "subheadline") ||
    [kindLabel, profile.location].filter(Boolean).join(" · ");
  const showCover =
    props.showCover !== false && section.templateId !== "hero.minimal";
  const showAvatar = props.showAvatar !== false;
  const imageOpacity = propNum(props, "imageOpacity", 100);
  const imageBlur = propNum(props, "imageBlur", 0);

  const customCover = propStr(props, "coverImageUrl");
  const customSide = propStr(props, "sideImageUrl");

  const coverUrl = showCover
    ? resolveProfilePhoto(profile, customCover || null)
    : null;
  const sideUrl =
    resolveProfilePhoto(profile, customSide || customCover || null) ||
    (showCover ? coverUrl : null);
  const avatarUrl = showAvatar ? profile.avatar_url?.trim() || null : null;
  const bannerSrc = showCover
    ? coverUrl || sideUrl || avatarUrl
    : null;

  const onChangeCover = (url: string) => setProp("coverImageUrl", url);
  const onChangeSide = (url: string) => setProp("sideImageUrl", url);

  const headlineBlock = (opts?: { centered?: boolean; light?: boolean }) => (
    <div className={cn(opts?.centered && "w-full text-center")}>
      <div
        className={cn(
          "flex items-center gap-2",
          opts?.centered && "justify-center"
        )}
      >
        <InlineEditable
          as="h1"
          enabled={editMode}
          value={headline}
          placeholder="Meno / headline"
          onChange={(v) => setProp("headline", v)}
          style={sectionTitleStyle(section.style)}
          className={cn(
            titleWeight,
            "tracking-tight text-white",
            textRevealClass(!editMode)
          )}
        />
        {profile.is_verified ? (
          <BadgeCheck className={cn("h-5 w-5 shrink-0", accent.text)} />
        ) : null}
      </div>
      <InlineEditable
        as="p"
        enabled={editMode}
        value={sub}
        placeholder="Podnadpis…"
        onChange={(v) => setProp("subheadline", v)}
        style={sectionBodyStyle(section.style)}
        className={cn(
          "mt-1.5 block",
          opts?.light ? "text-zinc-200/90" : "text-zinc-400",
          textRevealClass(!editMode)
        )}
      />
    </div>
  );

  const avatarEl = (size: "sm" | "md") => {
    if (!avatarUrl) return null;
    const sizeClass =
      size === "md"
        ? "size-24 sm:size-28 md:size-32"
        : "size-20 sm:size-24";
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-3xl border-4 border-[#0A0A0A] bg-zinc-800 shadow-2xl",
          sizeClass
        )}
      >
        <Image
          src={avatarUrl}
          alt={name}
          fill
          className="object-cover"
          sizes="128px"
        />
      </div>
    );
  };

  const bodyPad = cn(contentPad, "pb-6 pt-5 sm:pb-8 sm:pt-6");

  const mediaControls = editMode && selected;

  const coverBand = showCover ? (
    <EditableMediaBand
      src={bannerSrc}
      opacity={imageOpacity}
      blur={imageBlur}
      editMode={editMode}
      showControls={mediaControls}
      userId={profile.id}
      profilePhotos={profilePhotos}
      onChangeSrc={onChangeCover}
    />
  ) : null;

  /* ── SPLIT ── */
  if (heroStyle === "split") {
    return (
      <div
        className={cn(
          bodyPad,
          "grid gap-6 sm:grid-cols-2 sm:items-center sm:gap-8"
        )}
      >
        <EditableMediaBand
          src={sideUrl || bannerSrc}
          opacity={imageOpacity}
          blur={imageBlur}
          framed
          aspectClass="aspect-[4/5] sm:aspect-[3/4]"
          editMode={editMode}
          showControls={mediaControls}
          userId={profile.id}
          profilePhotos={profilePhotos}
          onChangeSrc={onChangeSide}
          className={radiusClass}
        />
        <div className="flex flex-col items-start gap-5">
          {avatarEl("sm")}
          {headlineBlock()}
          {cta}
        </div>
      </div>
    );
  }

  /* ── POSTER ── */
  if (heroStyle === "poster") {
    return (
      <div
        className={cn(
          bodyPad,
          "mx-auto flex max-w-md flex-col items-center gap-5 text-center"
        )}
      >
        <EditableMediaBand
          src={coverUrl || sideUrl}
          opacity={imageOpacity}
          blur={imageBlur}
          framed
          aspectClass="aspect-[3/4] max-h-[420px]"
          editMode={editMode}
          showControls={mediaControls}
          userId={profile.id}
          profilePhotos={profilePhotos}
          onChangeSrc={onChangeCover}
          className={cn("w-full", radiusClass)}
        />
        {avatarUrl && (coverUrl || sideUrl) ? (
          <div className="-mt-12">{avatarEl("md")}</div>
        ) : null}
        {headlineBlock({ centered: true })}
        <div className="flex justify-center">{cta}</div>
      </div>
    );
  }

  /* ── IMMERSIVE ── */
  if (heroStyle === "immersive") {
    if (!showCover) {
      return (
        <div
          className={cn(
            bodyPad,
            "flex flex-col items-center gap-4 text-center"
          )}
        >
          {avatarEl("md")}
          {headlineBlock({ centered: true })}
          {cta}
        </div>
      );
    }
    return (
      <div className="relative w-full">
        <EditableMediaBand
          src={bannerSrc}
          opacity={imageOpacity}
          blur={imageBlur}
          tall
          editMode={editMode}
          showControls={mediaControls}
          userId={profile.id}
          profilePhotos={profilePhotos}
          onChangeSrc={onChangeCover}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-[5] flex flex-col items-center gap-4 pb-7 pt-16 text-center sm:pb-9",
            contentPad
          )}
        >
          {avatarEl("md")}
          {headlineBlock({ centered: true, light: true })}
          {cta}
        </div>
      </div>
    );
  }

  /* ── OVERLAP ── */
  if (heroStyle === "overlap") {
    return (
      <div className="flex w-full flex-col">
        {coverBand}
        <div className={cn("relative", contentPad, "pb-7 sm:pb-9")}>
          <div
            className={cn(
              "flex flex-col gap-5",
              section.style.align === "center"
                ? "items-center text-center"
                : "items-stretch"
            )}
          >
            <div
              className={cn(
                "flex gap-4",
                showCover && "-mt-14 sm:-mt-16 md:-mt-20",
                section.style.align === "center"
                  ? "flex-col items-center"
                  : "flex-row items-end"
              )}
            >
              {avatarEl("md") ?? (
                <div className="size-24 shrink-0 rounded-3xl border-4 border-[#0A0A0A] bg-white/10 shadow-2xl sm:size-28 md:size-32" />
              )}
              <div
                className={cn(
                  "min-w-0 flex-1",
                  section.style.align !== "center" && "pb-1"
                )}
              >
                {headlineBlock({
                  centered: section.style.align === "center",
                })}
              </div>
            </div>
            <div
              className={cn(
                section.style.align === "center" && "flex justify-center"
              )}
            >
              {cta}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── CLASSIC ── */
  return (
    <div className="flex w-full flex-col">
      {coverBand}
      <div
        className={cn(
          bodyPad,
          "flex flex-col gap-5",
          sectionAlignClass(section.style),
          !showCover && "pt-6"
        )}
      >
        <div
          className={cn(
            "flex gap-4",
            section.style.align === "center"
              ? "flex-col items-center"
              : "items-end"
          )}
        >
          {avatarEl("sm")}
          {headlineBlock({ centered: section.style.align === "center" })}
        </div>
        {cta}
      </div>
    </div>
  );
}
