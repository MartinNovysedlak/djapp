"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

type GalleryLightboxProps = {
  images: string[];
  index: number | null;
  altPrefix?: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

/**
 * Full-screen photo viewer for DJ gallery — Esc / backdrop / X to close,
 * arrows for prev/next.
 */
export function GalleryLightbox({
  images,
  index,
  altPrefix = "Fotka",
  onClose,
  onIndexChange,
}: GalleryLightboxProps) {
  const open = index !== null && images.length > 0;
  const current = open ? images[index!] : null;

  const go = useCallback(
    (delta: number) => {
      if (index === null || images.length === 0) return;
      const next = (index + delta + images.length) % images.length;
      onIndexChange(next);
    },
    [index, images.length, onIndexChange]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, go]);

  if (!open || !current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Zväčšená fotka"
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-[0.75rem] border border-white/15 bg-black/50 text-white transition-colors hover:bg-white/10"
        aria-label="Zavrieť"
      >
        <X className="size-5" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-[0.75rem] border border-white/15 bg-black/50 text-white transition-colors hover:bg-white/10 sm:left-6"
            aria-label="Predchádzajúca"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-[0.75rem] border border-white/15 bg-black/50 text-white transition-colors hover:bg-white/10 sm:right-6"
            aria-label="Ďalšia"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      <div
        className="relative flex max-h-[85vh] max-w-[min(96vw,56rem)] flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative max-h-[80vh] w-full overflow-hidden rounded-[0.75rem]">
          <Image
            src={current}
            alt={`${altPrefix} ${(index ?? 0) + 1}`}
            width={1600}
            height={1200}
            className="max-h-[80vh] w-auto max-w-full object-contain"
            sizes="(max-width: 896px) 96vw, 56rem"
            priority
          />
        </div>
        <p className="flex items-center gap-1.5 text-xs text-zinc-400">
          <ZoomIn className="size-3.5" />
          {(index ?? 0) + 1} / {images.length}
        </p>
      </div>
    </div>
  );
}

/** Thumbnail with hover zoom cue — used to open the lightbox. */
export function GalleryThumbButton({
  className,
  children,
  onClick,
}: {
  className?: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-left",
        className
      )}
    >
      {children}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/35">
        <ZoomIn className="size-6 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
      </span>
    </button>
  );
}
