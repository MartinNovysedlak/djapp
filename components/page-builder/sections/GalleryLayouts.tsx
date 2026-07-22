"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { InlineEditable } from "@/components/page-builder/InlineEditable";
import { cn } from "@/lib/utils";
import type { GalleryResolvedItem } from "@/components/page-builder/sections/section-utils";

export function GalleryGrid({
  items,
  columns = 3,
  onOpen,
  editMode = false,
  showCaptions = true,
  onCaptionChange,
}: {
  items: GalleryResolvedItem[];
  columns?: 2 | 3 | 4;
  onOpen?: (index: number) => void;
  editMode?: boolean;
  showCaptions?: boolean;
  onCaptionChange?: (index: number, caption: string) => void;
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-zinc-500">Zatiaľ žiadne fotky v galérii.</p>
    );
  }
  const colClass =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-3";

  return (
    <div className={cn("grid grid-cols-1 gap-3", colClass)}>
      {items.map((item, i) => (
        <div
          key={item.id}
          className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-left"
        >
          <button
            type="button"
            onClick={() => onOpen?.(i)}
            className="group relative aspect-[4/3] w-full overflow-hidden"
          >
            <Image
              src={item.url}
              alt={item.caption || `Fotka ${i + 1}`}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
          </button>
          {showCaptions && editMode && onCaptionChange ? (
            <div className="px-3 py-2">
              <InlineEditable
                as="p"
                enabled
                value={item.caption}
                placeholder="Popis fotky…"
                onChange={(v) => onCaptionChange(i, v)}
                className="block w-full text-sm text-zinc-300"
              />
            </div>
          ) : showCaptions && item.caption ? (
            <p className="px-3 py-2 text-sm text-zinc-300">{item.caption}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function GallerySlideshow({
  items,
  speedMs = 4500,
  onOpen,
  editMode = false,
  showCaptions = true,
  onCaptionChange,
}: {
  items: GalleryResolvedItem[];
  speedMs?: number;
  onOpen?: (index: number) => void;
  editMode?: boolean;
  showCaptions?: boolean;
  onCaptionChange?: (index: number, caption: string) => void;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length < 2 || editMode) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, Math.max(2000, speedMs));
    return () => window.clearInterval(id);
  }, [items.length, speedMs, editMode]);

  if (!items.length) {
    return (
      <p className="text-sm text-zinc-500">Zatiaľ žiadne fotky v galérii.</p>
    );
  }

  const current = items[index]!;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onOpen?.(index)}
        className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/10"
      >
        <Image
          key={current.id}
          src={current.url}
          alt={current.caption || "Fotka"}
          fill
          className="object-cover animate-in fade-in duration-700"
          sizes="(max-width: 768px) 100vw, 720px"
        />
      </button>
      {showCaptions && editMode && onCaptionChange ? (
        <InlineEditable
          as="p"
          enabled
          value={current.caption}
          placeholder="Popis fotky…"
          onChange={(v) => onCaptionChange(index, v)}
          className="block w-full text-center text-sm text-zinc-300"
        />
      ) : showCaptions && current.caption ? (
        <p className="text-center text-sm text-zinc-300">{current.caption}</p>
      ) : null}
      {items.length > 1 ? (
        <div className="flex justify-center gap-1.5">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition",
                i === index ? "w-5 bg-white" : "w-1.5 bg-white/30"
              )}
              aria-label={`Fotka ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const MARQUEE_TILE: Record<string, string> = {
  sm: "h-20 w-32",
  md: "h-28 w-44",
  lg: "h-36 w-56",
};

export function GalleryMarquee({
  items,
  speedMs = 40000,
  tileSize = "md",
  onOpen,
  editMode = false,
  showCaptions = true,
  onCaptionChange,
}: {
  items: GalleryResolvedItem[];
  /** Full loop duration in ms (higher = slower). */
  speedMs?: number;
  tileSize?: "sm" | "md" | "lg";
  onOpen?: (index: number) => void;
  editMode?: boolean;
  showCaptions?: boolean;
  onCaptionChange?: (index: number, caption: string) => void;
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-zinc-500">Zatiaľ žiadne fotky v galérii.</p>
    );
  }

  const loop = [...items, ...items];
  const durationSec = Math.max(8, (speedMs || 40000) / 1000);
  const tileClass = MARQUEE_TILE[tileSize] ?? MARQUEE_TILE.md;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden">
        <div
          className="flex w-max gap-3 hover:[animation-play-state:paused]"
          style={{
            animation: `page-marquee ${durationSec}s linear infinite`,
          }}
        >
          {loop.map((item, i) => {
            const realIndex = i % items.length;
            return (
              <button
                key={`${item.id}_${i}`}
                type="button"
                onClick={() => onOpen?.(realIndex)}
                className={cn(
                  "relative shrink-0 overflow-hidden rounded-xl border border-white/10",
                  tileClass
                )}
              >
                <Image
                  src={item.url}
                  alt={item.caption || "Fotka"}
                  fill
                  className="object-cover"
                  sizes="224px"
                />
              </button>
            );
          })}
        </div>
      </div>
      {showCaptions && editMode && onCaptionChange ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-2">
              <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md border border-white/10">
                <Image
                  src={item.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <InlineEditable
                as="p"
                enabled
                value={item.caption}
                placeholder={`Popis ${i + 1}…`}
                onChange={(v) => onCaptionChange(i, v)}
                className="min-w-0 flex-1 text-sm text-zinc-300"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Asymmetric bento mosaic — first photo large, rest tiled. */
export function GalleryBento({
  items,
  onOpen,
  editMode = false,
  showCaptions = true,
  onCaptionChange,
}: {
  items: GalleryResolvedItem[];
  onOpen?: (index: number) => void;
  editMode?: boolean;
  showCaptions?: boolean;
  onCaptionChange?: (index: number, caption: string) => void;
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-zinc-500">Zatiaľ žiadne fotky v galérii.</p>
    );
  }

  const [first, ...rest] = items;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:grid-rows-2 sm:gap-3">
        <button
          type="button"
          onClick={() => onOpen?.(0)}
          className="relative col-span-2 aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 sm:row-span-2 sm:aspect-auto sm:min-h-[280px]"
        >
          <Image
            src={first!.url}
            alt={first!.caption || "Fotka"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        </button>
        {rest.slice(0, 4).map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen?.(i + 1)}
            className="relative aspect-square overflow-hidden rounded-2xl border border-white/10"
          >
            <Image
              src={item.url}
              alt={item.caption || "Fotka"}
              fill
              className="object-cover"
              sizes="25vw"
            />
          </button>
        ))}
      </div>
      {showCaptions && editMode && onCaptionChange
        ? items.slice(0, 5).map((item, i) => (
            <InlineEditable
              key={item.id}
              as="p"
              enabled
              value={item.caption}
              placeholder={`Popis ${i + 1}…`}
              onChange={(v) => onCaptionChange(i, v)}
              className="block w-full text-sm text-zinc-400"
            />
          ))
        : null}
    </div>
  );
}
