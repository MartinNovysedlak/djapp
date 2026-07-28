"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Loader2,
  MessageCircle,
  Star,
} from "lucide-react";
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
  compact?: boolean;
};

export function ReviewInviteLink({
  bookingId,
  clientName,
  className,
  defaultOpen = false,
  compact = false,
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
        "overflow-hidden rounded-2xl border border-white/10 bg-black/25",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 text-left transition-colors hover:bg-white/[0.03]",
          compact ? "px-3 py-2.5" : "px-4 py-3"
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10",
            compact ? "size-7" : "size-8"
          )}
        >
          <Star
            className={cn(
              "text-violet-300",
              compact ? "size-3" : "size-3.5"
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-semibold text-white",
              compact ? "text-[13px] leading-tight" : "text-sm"
            )}
          >
            Odkaz na hodnotenie
          </p>
          {!compact ? (
            <p className="text-[11px] text-zinc-500">
              Pošli klientovi — ohodnotí ťa aj bez účtu
            </p>
          ) : (
            <p className="truncate text-[10px] text-zinc-500">
              Recenzia bez registrácie
            </p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "shrink-0 text-zinc-500 transition-transform",
            compact ? "size-3.5" : "size-4",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-white/8 px-4 py-4">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-violet-400" />
            </div>
          ) : url ? (
            <>
              <p className="text-xs leading-relaxed text-zinc-400">
                Unikátny odkaz na formulár s 4 kategóriami. Funguje aj pre
                ľudí mimo {BRAND.name} — stačí WhatsApp, SMS alebo e-mail.
                Platný až po skončení akcie; jedno hodnotenie na rezerváciu.
              </p>
              <p className="break-all rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 font-mono text-[11px] text-zinc-300">
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
