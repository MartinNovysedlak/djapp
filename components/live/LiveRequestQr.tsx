"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Loader2, QrCode, Radio } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import Link from "next/link";
import { ensureLiveSlug } from "@/app/actions/live-requests";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/lib/toast-context";
import { BRAND } from "@/lib/brand";
import { liveBoothHref, type BookingsTab } from "@/lib/bookings-nav";
import { cn } from "@/lib/utils";

type LiveRequestQrProps = {
  bookingId: string;
  mode: "client" | "dj";
  className?: string;
  defaultOpen?: boolean;
  /** Current bookings tab — used so Live "Späť" returns to the same place. */
  returnTab?: BookingsTab;
};

function publicLiveUrl(slug: string) {
  return `${BRAND.url.replace(/\/$/, "")}/live/${slug}`;
}

export function LiveRequestQr({
  bookingId,
  mode,
  className,
  defaultOpen = false,
  returnTab,
}: LiveRequestQrProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || url) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await ensureLiveSlug(bookingId);
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setUrl(publicLiveUrl(result.slug));
      setSlug(result.slug);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, url, bookingId, showToast]);

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast("Odkaz skopírovaný.", "success");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      showToast("Kopírovanie zlyhalo.", "error");
    }
  }

  function downloadQr() {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas || !slug) return;
    const link = document.createElement("a");
    link.download = `live-qr-${slug}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-black/25",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10">
          <QrCode className="size-3.5 text-violet-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Live želania · QR</p>
          <p className="text-[11px] text-zinc-500">
            {mode === "dj"
              ? "QR pre hostí + live obrazovka za pultom"
              : "Zdieľaj QR s hosťami na akcii"}
          </p>
        </div>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-white/8 px-4 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-violet-400" />
            </div>
          ) : url ? (
            <>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                <div
                  ref={canvasWrapRef}
                  className="rounded-2xl border border-white/10 bg-white p-3"
                >
                  <QRCodeCanvas
                    value={url}
                    size={168}
                    level="M"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#0a0a0a"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
                  <p className="text-xs leading-relaxed text-zinc-400">
                    Hostia naskenujú QR a pošlú pesničku — buď názov + interpret,
                    alebo YouTube / Spotify link.
                  </p>
                  <p className="break-all rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 font-mono text-[11px] text-zinc-300">
                    {url}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={copyLink}
                      className="gap-1.5 rounded-full"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-emerald-300" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      Kopírovať
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={downloadQr}
                      className="gap-1.5 rounded-full"
                    >
                      <Download className="size-3.5" />
                      Stiahnuť QR
                    </Button>
                    {mode === "dj" ? (
                      <Link
                        href={liveBoothHref(bookingId, returnTab)}
                        className={cn(
                          buttonVariants({ size: "sm" }),
                          "gap-1.5 rounded-full"
                        )}
                      >
                        <Radio className="size-3.5" />
                        Otvoriť Live
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-500">
              QR sa nepodarilo pripraviť. Skús znova otvoriť sekciu.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
