"use client";

import { useEffect, useState } from "react";
import { Loader2, Tag, Trash2, Zap } from "lucide-react";
import {
  deactivateLastMinuteOffer,
  upsertLastMinuteOffer,
} from "@/app/actions/last-minute";
import type { LastMinuteOffer } from "@/lib/last-minute";
import {
  formatLastMinutePrice,
  isOfferLive,
} from "@/lib/last-minute";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@/lib/dates";

type LastMinuteOfferDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventDate: string;
  existing?: LastMinuteOffer | null;
  onSaved: (offer: LastMinuteOffer) => void;
  onRemoved?: (offerId: string) => void;
};

export function LastMinuteOfferDialog({
  open,
  onOpenChange,
  eventDate,
  existing,
  onSaved,
  onRemoved,
}: LastMinuteOfferDialogProps) {
  const { showToast } = useToast();
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [bookWithinDays, setBookWithinDays] = useState("7");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDiscountedPrice(
      existing ? String(existing.discounted_price) : ""
    );
    setOriginalPrice(
      existing?.original_price != null ? String(existing.original_price) : ""
    );
    setBookWithinDays(String(existing?.book_within_days ?? 7));
    setNote(existing?.note ?? "");
  }, [open, existing]);

  const dateLabel = parseLocalDate(eventDate).toLocaleDateString("sk-SK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  async function handleSave() {
    setBusy(true);
    const result = await upsertLastMinuteOffer({
      id: existing?.id,
      eventDate,
      discountedPrice: Number(discountedPrice.replace(",", ".")),
      originalPrice: originalPrice.trim()
        ? Number(originalPrice.replace(",", "."))
        : null,
      bookWithinDays: Number(bookWithinDays),
      note,
    });
    setBusy(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Last-minute ponuka uložená.", "success");
    onSaved(result.offer);
    onOpenChange(false);
  }

  async function handleRemove() {
    if (!existing) return;
    setBusy(true);
    const result = await deactivateLastMinuteOffer(existing.id);
    setBusy(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Ponuka vypnutá.", "success");
    onRemoved?.(existing.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-[#121212] text-white sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-4 text-amber-300" />
            Voľný termín nablízku
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Označ {dateLabel} ako last-minute ponuku so zníženou cenou. Lepšie
            zahrať za menej než mať prázdny kalendár.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="lm-price">Znížená cena (€)</Label>
            <Input
              id="lm-price"
              type="number"
              min={0}
              step="1"
              value={discountedPrice}
              onChange={(e) => setDiscountedPrice(e.target.value)}
              placeholder="napr. 250"
              className="rounded-xl border-white/10 bg-black/40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lm-original">Bežná cena (€, voliteľné)</Label>
            <Input
              id="lm-original"
              type="number"
              min={0}
              step="1"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="napr. 400"
              className="rounded-xl border-white/10 bg-black/40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lm-days">Rezervovať do (dní od dnes)</Label>
            <Input
              id="lm-days"
              type="number"
              min={1}
              max={60}
              value={bookWithinDays}
              onChange={(e) => setBookWithinDays(e.target.value)}
              className="rounded-xl border-white/10 bg-black/40"
            />
            <p className="text-[11px] text-zinc-500">
              Ponuka platí, ak klient rezervuje do tohto počtu dní (najneskôr v
              deň akcie).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lm-note">Poznámka (voliteľné)</Label>
            <Textarea
              id="lm-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Napr. firemný večierok, klub, svadba…"
              className="rounded-xl border-white/10 bg-black/40"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            disabled={busy}
            onClick={() => void handleSave()}
            className="w-full gap-2 rounded-full"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Tag className="size-4" />
            )}
            {existing ? "Uložiť zmeny" : "Publikovať ponuku"}
          </Button>
          {existing ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void handleRemove()}
              className="w-full gap-2 rounded-full border-red-500/30 text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="size-4" />
              Vypnúť ponuku
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LastMinuteBadge({
  price,
  eventDate,
  className,
  compact = false,
}: {
  price: number;
  eventDate?: string;
  className?: string;
  compact?: boolean;
}) {
  const dateBit =
    eventDate &&
    parseLocalDate(eventDate).toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "short",
    });

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/15 font-semibold text-amber-100",
        compact
          ? "px-2 py-0.5 text-[10px]"
          : "px-2.5 py-1 text-[11px]",
        className
      )}
    >
      <Zap className={cn(compact ? "size-2.5" : "size-3")} />
      {compact ? "Last-minute" : "Voľný termín nablízku"}
      {dateBit ? ` · ${dateBit}` : null}
      {" · "}
      {formatLastMinutePrice(price)}
    </span>
  );
}

export function LastMinuteOffersList({
  offers,
  emptyLabel = "Žiadne aktívne last-minute ponuky.",
}: {
  offers: LastMinuteOffer[];
  emptyLabel?: string;
}) {
  const live = offers.filter((o) => isOfferLive(o));
  if (live.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {live.map((o) => (
        <li
          key={o.id}
          className="flex items-start justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] px-3.5 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">
              {parseLocalDate(o.event_date).toLocaleDateString("sk-SK", {
                weekday: "short",
                day: "numeric",
                month: "long",
              })}
            </p>
            <p className="mt-0.5 text-[11px] text-amber-100/80">
              {formatLastMinutePrice(o.discounted_price)}
              {o.original_price != null ? (
                <span className="ml-1.5 text-zinc-500 line-through">
                  {formatLastMinutePrice(o.original_price)}
                </span>
              ) : null}
              {" · "}
              rezervovať do{" "}
              {parseLocalDate(o.expires_at).toLocaleDateString("sk-SK")}
            </p>
            {o.note ? (
              <p className="mt-1 text-[11px] text-zinc-500">{o.note}</p>
            ) : null}
          </div>
          <LastMinuteBadge
            price={o.discounted_price}
            compact
            className="shrink-0"
          />
        </li>
      ))}
    </ul>
  );
}

