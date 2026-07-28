"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Download, Link2, Loader2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { ensureGuestShareSlug } from "@/app/actions/guest-share";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast-context";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type ClientShareQrProps = {
  bookingId: string;
  className?: string;
  defaultOpen?: boolean;
};

function publicShareUrl(slug: string) {
  return `${BRAND.url.replace(/\/$/, "")}/akcia/${slug}`;
}

export function ClientShareQr({
  bookingId,
  className,
  defaultOpen = false,
}: ClientShareQrProps) {
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
      const result = await ensureGuestShareSlug(bookingId);
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setUrl(publicShareUrl(result.slug));
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
    link.download = `akcia-qr-${slug}.png`;
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
          <Link2 className="size-3.5 text-violet-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Odkaz pre klienta · QR
          </p>
          <p className="text-[11px] text-zinc-500">
            Harmonogram, playlist, technika — bez registrácie
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-zinc-500 transition-transform",
            open && "rotate-180"
          )}
        />
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
                    Pošli klientovi tento unikátny odkaz. Môže kedykoľvek
                    otvoriť a upravovať harmonogram, playlist aj dotazník o
                    mieste a pozrieť si požiadavky DJ — bez účtu.
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
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-500">
              Odkaz sa nepodarilo pripraviť. Skús znova otvoriť sekciu.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
