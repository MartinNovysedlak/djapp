"use client";

import * as React from "react";
import { Loader2, MapPin, Move, Save, ZoomIn, ZoomOut } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STAGE_SIZE = 260; // px — main crop viewport
const OUTPUT_SIZE = 512; // px — exported square image resolution
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type NaturalSize = { w: number; h: number };
type Pan = { x: number; y: number }; // fraction of container size, e.g. -0.5..0.5

function computeDisplaySize(natural: NaturalSize, container: number, zoom: number) {
  const scale0 = container / Math.min(natural.w, natural.h);
  return {
    w: natural.w * scale0 * zoom,
    h: natural.h * scale0 * zoom,
  };
}

function clampPan(natural: NaturalSize, container: number, zoom: number, pan: Pan): Pan {
  const { w, h } = computeDisplaySize(natural, container, zoom);
  const maxX = Math.max(0, (w - container) / 2) / container;
  const maxY = Math.max(0, (h - container) / 2) / container;
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}

/** Shared visual: renders the same crop region at an arbitrary viewport size. */
function CroppedImage({
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
  const { w, h } = computeDisplaySize(natural, size, zoom);
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="absolute select-none"
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

  const dragState = React.useRef<{ startX: number; startY: number; startPan: Pan } | null>(
    null
  );

  // Load the selected file into a data URL whenever the dialog opens with a new file.
  React.useEffect(() => {
    if (!open || !file) {
      setImgSrc(null);
      setNatural(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setImgSrc(e.target?.result as string);
    reader.readAsDataURL(file);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [open, file]);

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
  };

  const updateZoom = (nextZoom: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    setZoom(z);
    if (natural) setPan((prev) => clampPan(natural, STAGE_SIZE, z, prev));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!natural) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, startPan: pan };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current || !natural) return;
    const dx = (e.clientX - dragState.current.startX) / STAGE_SIZE;
    const dy = (e.clientY - dragState.current.startY) / STAGE_SIZE;
    const next = {
      x: dragState.current.startPan.x + dx,
      y: dragState.current.startPan.y + dy,
    };
    setPan(clampPan(natural, STAGE_SIZE, zoom, next));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    if ((e.target as HTMLElement).hasPointerCapture?.(e.pointerId)) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    updateZoom(zoom - e.deltaY * 0.0015);
  };

  const handleConfirm = async () => {
    if (!imgSrc || !natural) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = computeDisplaySize(natural, OUTPUT_SIZE, zoom);
    const centerX = OUTPUT_SIZE / 2 + pan.x * OUTPUT_SIZE;
    const centerY = OUTPUT_SIZE / 2 + pan.y * OUTPUT_SIZE;

    const img = new Image();
    img.src = imgSrc;
    await new Promise<void>((resolve) => {
      if (img.complete) return resolve();
      img.onload = () => resolve();
    });

    ctx.drawImage(img, centerX - w / 2, centerY - h / 2, w, h);

    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.92
    );
  };

  const ready = Boolean(imgSrc && natural);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upraviť profilovú fotku</DialogTitle>
          <DialogDescription>
            Potiahnutím posuň fotku a posuvníkom priblíž alebo vzdiaľ výrez.
          </DialogDescription>
        </DialogHeader>

        {/* ── Crop stage ──────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-4">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-inner"
            style={{ width: STAGE_SIZE, height: STAGE_SIZE, touchAction: "none", cursor: ready ? "grab" : "default" }}
          >
            {imgSrc && (
              <img
                src={imgSrc}
                alt=""
                onLoad={handleImgLoad}
                className="hidden"
              />
            )}
            {ready && natural && (
              <CroppedImage
                src={imgSrc!}
                natural={natural}
                zoom={zoom}
                pan={pan}
                size={STAGE_SIZE}
              />
            )}
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="size-5 animate-spin text-violet-400" />
              </div>
            )}
            {/* Circular guide overlay */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                boxShadow: `0 0 0 999px oklch(0.05 0.01 285 / 0.72)`,
                borderRadius: "9999px",
                margin: 10,
              }}
            />
            {ready && (
              <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] text-zinc-300 backdrop-blur-sm">
                <Move className="size-3" />
                Potiahni pre posun
              </div>
            )}
          </div>

          {/* Zoom control */}
          <div className="flex w-full items-center gap-3">
            <button
              type="button"
              onClick={() => updateZoom(zoom - 0.2)}
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
              onClick={() => updateZoom(zoom + 0.2)}
              disabled={!ready}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              <ZoomIn className="size-4" />
            </button>
          </div>

          {/* ── Live previews ─────────────────────────────────────────────── */}
          {ready && natural && (
            <div className="grid w-full grid-cols-2 gap-3">
              {/* Dashboard preview */}
              <div className="flex flex-col items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <div
                  className={cn(
                    "relative overflow-hidden rounded-full border-2 border-border/50"
                  )}
                  style={{ width: 72, height: 72 }}
                >
                  <CroppedImage src={imgSrc!} natural={natural} zoom={zoom} pan={pan} size={72} />
                </div>
                <p className="text-[11px] text-zinc-500">V dashboarde</p>
              </div>

              {/* Catalogue card preview */}
              <div className="flex flex-col items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <div className="relative flex h-16 w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500">
                  <div
                    className="relative overflow-hidden rounded-full border-2 border-white/30 shadow-lg"
                    style={{ width: 44, height: 44 }}
                  >
                    <CroppedImage src={imgSrc!} natural={natural} zoom={zoom} pan={pan} size={44} />
                  </div>
                </div>
                <p className="flex items-center gap-1 text-[11px] text-zinc-500">
                  <MapPin className="size-2.5" />V katalógu umelcov
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleConfirm}
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
