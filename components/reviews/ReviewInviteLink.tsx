"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Loader2, MessageCircle, Star } from "lucide-react";
import { ensureReviewShareSlug } from "@/app/actions/review-invite";
import { reviewInviteUrl } from "@/lib/review-invite";
import { BRAND } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";

type ReviewInviteLinkProps = {
  bookingId: string;
  clientName?: string | null;
  className?: string;
  defaultOpen?: boolean;
};

export function ReviewInviteLink({
  bookingId,
  clientName,
  className,
  defaultOpen = false,
}: ReviewInviteLinkProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || url) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await ensureReviewShareSlug(bookingId);
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setUrl(reviewInviteUrl(result.slug));
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
      showToast("Odkaz na hodnotenie skopírovaný.", "success");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      showToast("Kopírovanie zlyhalo.", "error");
    }
  }

  function shareWhatsApp() {
    if (!url) return;
    const name = clientName?.trim() || "Ahoj";
    const text = `${name}, ďakujem za akciu! Budem rád za krátke hodnotenie tu: ${url}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/[0.04]",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-500/[0.06]"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10">
          <Star className="size-3.5 text-amber-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Odkaz na hodnotenie
          </p>
          <p className="text-[11px] text-zinc-500">
            Pošli klientovi — ohodnotí ťa aj bez účtu
          </p>
        </div>
        <Link2 className="size-3.5 shrink-0 text-zinc-500" />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-amber-500/15 px-4 py-4">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-amber-400" />
            </div>
          ) : url ? (
            <>
              <p className="text-xs leading-relaxed text-zinc-400">
                Unikátny odkaz na formulár s 4 kategóriami. Funguje aj pre
                ľudí mimo {BRAND.name} — stačí WhatsApp, SMS alebo e-mail.
                Platný až po skončení akcie; jedno hodnotenie na rezerváciu.
              </p>
              <p className="break-all rounded-xl border border-white/8 bg-black/30 px-3 py-2 font-mono text-[11px] text-zinc-300">
                {url}
              </p>
              <div className="flex flex-wrap gap-2">
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
                  onClick={shareWhatsApp}
                  className="gap-1.5 rounded-full"
                >
                  <MessageCircle className="size-3.5" />
                  WhatsApp
                </Button>
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
