"use client";

import * as React from "react";
import { Loader2, Move, Save, ZoomIn, ZoomOut } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STAGE_SIZE = 280;
const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type NaturalSize = { w: number; h: number };
/** Pan as fraction of the crop stage (image moves with the pointer). */
type Pan = { x: number; y: number };

function coverScale(natural: NaturalSize, container: number, zoom: number) {
  return (container / Math.min(natural.w, natural.h)) * zoom;
}

function displaySize(natural: NaturalSize, container: number, zoom: number) {
  const s = coverScale(natural, container, zoom);
  return { w: natural.w * s, h: natural.h * s, scale: s };
}

function clampPan(
  natural: NaturalSize,
  container: number,
  zoom: number,
  pan: Pan
): Pan {
  const { w, h } = displaySize(natural, container, zoom);
  const maxX = Math.max(0, (w - container) / 2) / container;
  const maxY = Math.max(0, (h - container) / 2) / container;
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}

/** Source square in natural image pixels that maps to the visible crop. */
function sourceCropRect(
  natural: NaturalSize,
  container: number,
  zoom: number,
  pan: Pan
) {
  const { w: displayW, h: displayH, scale } = displaySize(
    natural,
    container,
    zoom
  );
  const imageLeft = container / 2 - displayW / 2 + pan.x * container;
  const imageTop = container / 2 - displayH / 2 + pan.y * container;
  const sx = (0 - imageLeft) / scale;
  const sy = (0 - imageTop) / scale;
  const size = container / scale;
  return {
    sx: Math.max(0, Math.min(natural.w - size, sx)),
    sy: Math.max(0, Math.min(natural.h - size, sy)),
    size: Math.min(size, natural.w, natural.h),
  };
}

function CropStageImage({
  src,
  natural,
  zoom,
  pan,
  size,
}: {
  src: string;
  natural: NaturalSize;
  zoom: number;
  pan: Pan;
  size: number;
}) {
  const { w, h } = displaySize(natural, size, zoom);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      className="absolute max-w-none select-none"
      style={{
        width: `${w}px`,
        height: `${h}px`,
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) translate(${pan.x * size}px, ${pan.y * size}px)`,
      }}
    />
  );
}

type AvatarCropperDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onConfirm: (blob: Blob) => void | Promise<void>;
  confirming?: boolean;
};

export default function AvatarCropperDialog({
  open,
  onOpenChange,
  file,
  onConfirm,
  confirming = false,
}: AvatarCropperDialogProps) {
  const [imgSrc, setImgSrc] = React.useState<string | null>(null);
  const [natural, setNatural] = React.useState<NaturalSize | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState<Pan>({ x: 0, y: 0 });

  const dragState = React.useRef<{
    startX: number;
    startY: number;
    startPan: Pan;
  } | null>(null);

  React.useEffect(() => {
    if (!open || !file) {
      setImgSrc(null);
      setNatural(null);
      return;
    }
    let cancelled = false;
    const reader = new FileReader();
    reader.onload = () => {
      if (cancelled) return;
      const src = reader.result as string;
      setImgSrc(src);
      setZoom(1);
      setPan({ x: 0, y: 0 });

      const probe = new window.Image();
      probe.onload = () => {
        if (cancelled) return;
        setNatural({ w: probe.naturalWidth, h: probe.naturalHeight });
      };
      probe.onerror = () => {
        if (!cancelled) setNatural(null);
      };
      probe.src = src;
    };
    reader.readAsDataURL(file);
    return () => {
      cancelled = true;
    };
  }, [open, file]);

  const updateZoom = (nextZoom: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    setZoom(z);
    if (natural) setPan((prev) => clampPan(natural, STAGE_SIZE, z, prev));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!natural) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, startPan: pan };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current || !natural) return;
    const dx = (e.clientX - dragState.current.startX) / STAGE_SIZE;
    const dy = (e.clientY - dragState.current.startY) / STAGE_SIZE;
    setPan(
      clampPan(natural, STAGE_SIZE, zoom, {
        x: dragState.current.startPan.x + dx,
        y: dragState.current.startPan.y + dy,
      })
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    updateZoom(zoom - e.deltaY * 0.0015);
  };

  const handleConfirm = async () => {
    if (!imgSrc || !natural) return;

    try {
      const { sx, sy, size } = sourceCropRect(
        natural,
        STAGE_SIZE,
        zoom,
        pan
      );

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new window.Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = imgSrc;
      });

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.drawImage(img, sx, sy, size, size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92)
      );
      if (blob) await onConfirm(blob);
    } catch (err) {
      console.error("[AvatarCropperDialog]", err);
    }
  };

  const ready = Boolean(imgSrc && natural);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upraviť profilovú fotku</DialogTitle>
          <DialogDescription>
            Posuň a priblíž fotku — uloží sa výrez vo vnútri kruhu.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-inner"
            style={{
              width: STAGE_SIZE,
              height: STAGE_SIZE,
              touchAction: "none",
              cursor: ready ? "grab" : "default",
            }}
          >
            {ready && natural ? (
              <CropStageImage
                src={imgSrc!}
                natural={natural}
                zoom={zoom}
                pan={pan}
                size={STAGE_SIZE}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="size-5 animate-spin text-violet-400" />
              </div>
            )}

            {/* Darken outside the crop circle — circle matches full stage */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background:
                  "radial-gradient(circle closest-side, transparent 69%, oklch(0.05 0.01 285 / 0.75) 70%)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[8%] rounded-full border border-white/40"
            />

            {ready ? (
              <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] text-zinc-300 backdrop-blur-sm">
                <Move className="size-3" />
                Potiahni pre posun
              </div>
            ) : null}
          </div>

          <div className="flex w-full items-center gap-3">
            <button
              type="button"
              onClick={() => updateZoom(zoom - 0.15)}
              disabled={!ready}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              <ZoomOut className="size-4" />
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={!ready}
              onChange={(e) => updateZoom(Number(e.target.value))}
              className="h-1.5 w-full flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-violet-500 disabled:opacity-40"
            />
            <button
              type="button"
              onClick={() => updateZoom(zoom + 0.15)}
              disabled={!ready}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              <ZoomIn className="size-4" />
            </button>
          </div>

          {ready && natural ? (
            <div className="flex w-full items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="relative size-16 overflow-hidden rounded-full border-2 border-white/20">
                  <CropStageImage
                    src={imgSrc!}
                    natural={natural}
                    zoom={zoom}
                    pan={pan}
                    size={64}
                  />
                </div>
                <p className="text-[11px] text-zinc-500">Náhľad</p>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!ready || confirming}
            className="gap-2"
          >
            {confirming ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Ukladám…
              </>
            ) : (
              <>
                <Save className="size-4" />
                Použiť fotku
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
