"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Map stored blur percent (0–100) to CSS px (0–6). */
export function blurPercentToPx(blur: number): number {
  const n = Number.isFinite(blur) ? blur : 0;
  const pct = Math.min(100, Math.max(0, n));
  return Math.round((pct / 100) * 6 * 10) / 10;
}

type Props = {
  src: string | null;
  /** 0–100 */
  opacity?: number;
  /** 0–100 percent → 0–6px */
  blur?: number;
  tall?: boolean;
  editMode?: boolean;
  /** Show upload controls only when true (e.g. section selected) */
  showControls?: boolean;
  userId?: string;
  profilePhotos?: string[];
  onChangeSrc?: (url: string) => void;
  className?: string;
  /** rounded frame instead of full-bleed band */
  framed?: boolean;
  aspectClass?: string;
  /** Fill parent height (ignores aspectClass / default band heights) */
  fillHeight?: boolean;
};

export function EditableMediaBand({
  src,
  opacity = 100,
  blur = 0,
  tall = false,
  editMode = false,
  showControls,
  userId,
  profilePhotos = [],
  onChangeSrc,
  className,
  framed = false,
  aspectClass,
  fillHeight = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const opacityClamped = Math.min(100, Math.max(0, opacity));
  const blurPx = blurPercentToPx(blur);
  const controlsVisible = showControls ?? editMode;

  async function upload(files: FileList | null) {
    if (!files?.length || !userId || !onChangeSrc) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("userId", userId);
      fd.append("files", files[0]!);
      const res = await fetch("/api/upload-media", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { urls?: string[]; error?: string };
      if (res.ok && json.urls?.[0]) {
        onChangeSrc(json.urls[0]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      setPickerOpen(false);
    }
  }

  return (
    <div
      className={cn(
        "group/media relative w-full shrink-0 overflow-hidden bg-zinc-900",
        fillHeight
          ? cn(
              "h-full min-h-0",
              framed && "rounded-2xl border border-white/10"
            )
          : framed
            ? cn(
                aspectClass ?? "aspect-[4/5]",
                "rounded-2xl border border-white/10"
              )
            : tall
              ? "h-[280px] sm:h-[360px]"
              : "h-36 md:h-44",
        className
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          opacity: opacityClamped / 100,
          filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
          transform: blurPx > 0 ? "scale(1.04)" : undefined,
        }}
      >
        {src ? (
          <Image
            src={src}
            alt=""
            fill
            className="object-cover"
            sizes={framed ? "400px" : "(max-width: 768px) 100vw, 720px"}
            priority={!framed}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[color-mix(in_oklab,var(--page-accent)_40%,#2a2a35)] via-[#18181f] to-[#0A0A0A]" />
        )}
      </div>

      {!framed ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,transparent_30%,oklch(0.16_0.02_285/0.45))]"
        />
      ) : null}

      {controlsVisible && onChangeSrc ? (
        <div
          className={cn(
            "absolute inset-x-0 z-20 flex flex-wrap items-center justify-center gap-2 p-3 opacity-100 transition sm:opacity-0 sm:group-hover/media:opacity-100",
            tall
              ? "top-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent"
              : "bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
          )}
        >
          <button
            type="button"
            disabled={uploading}
            onClick={(e) => {
              e.stopPropagation();
              fileRef.current?.click();
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md hover:bg-black/80"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            Nahrať fotku
          </button>
          {profilePhotos.length > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPickerOpen((o) => !o);
              }}
              className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs text-zinc-200 backdrop-blur-md hover:bg-black/80"
            >
              Z profilu
            </button>
          ) : null}
        </div>
      ) : null}

      {pickerOpen && profilePhotos.length > 0 ? (
        <div
          className={cn(
            "absolute inset-x-2 z-30 max-h-36 overflow-auto rounded-xl border border-white/15 bg-black/90 p-2 shadow-xl backdrop-blur-xl",
            tall ? "top-14" : "bottom-14"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-4 gap-1.5">
            {profilePhotos.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => {
                  onChangeSrc?.(url);
                  setPickerOpen(false);
                }}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-lg border",
                  src === url ? "border-violet-400" : "border-white/10"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void upload(e.target.files)}
      />
    </div>
  );
}

export function MediaEffectSliders({
  opacity,
  blur,
  onOpacity,
  onBlur,
}: {
  /** 0–100 */
  opacity: number;
  /** 0–100 percent → applied as 0–6px */
  blur: number;
  onOpacity: (v: number) => void;
  onBlur: (v: number) => void;
}) {
  const blurPct = Math.min(100, Math.max(0, blur));
  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="flex justify-between text-[11px] text-zinc-500">
          Priehľadnosť
          <span className="text-zinc-400">{opacity}%</span>
        </span>
        <input
          type="range"
          min={20}
          max={100}
          value={opacity}
          onChange={(e) => onOpacity(Number(e.target.value))}
          className="w-full accent-violet-400"
        />
      </label>
      <label className="block space-y-1">
        <span className="flex justify-between text-[11px] text-zinc-500">
          Rozmazanie
          <span className="text-zinc-400">{blurPct}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={blurPct}
          onChange={(e) => onBlur(Number(e.target.value))}
          className="w-full accent-violet-400"
        />
      </label>
    </div>
  );
}
