"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { submitDjOffer } from "@/app/actions/bulk-inquiries";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DjOfferForm({
  bookingId,
  clientBudget,
  existingOfferPrice,
  existingOfferMessage,
  mode = "single",
  onDone,
}: {
  bookingId: string;
  clientBudget?: number | null;
  existingOfferPrice?: number | null;
  existingOfferMessage?: string | null;
  mode?: "single" | "bulk";
  onDone?: () => void;
}) {
  const { showToast } = useToast();
  const [price, setPrice] = useState(
    existingOfferPrice != null ? String(existingOfferPrice) : ""
  );
  const [note, setNote] = useState(existingOfferMessage ?? "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(existingOfferPrice != null);

  const handleSubmit = async () => {
    const value = Number(price.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) {
      showToast("Zadaj platnú cenu v EUR.", "error");
      return;
    }
    setBusy(true);
    const result = await submitDjOffer({
      bookingId,
      offerPrice: value,
      offerMessage: note.trim() || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setSent(true);
    showToast(
      existingOfferPrice != null
        ? "Ponuka aktualizovaná."
        : "Ponuka odoslaná klientovi.",
      "success"
    );
    onDone?.();
  };

  if (sent && existingOfferPrice == null) {
    return (
      <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200">
        <Check className="mr-1.5 inline size-4" />
        Ponuka je odoslaná. Klient ju potvrdí alebo odmietne — medzitým môžete
        chatovať.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-sky-300">
          {mode === "bulk" ? "Skupinový dopyt — tvoja ponuka" : "Tvoja ponuka"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Klient uvidí cenu a môže potvrdiť rezerváciu. Dovtedy môžete chatovať.
        </p>
        {clientBudget != null ? (
          <p className="mt-1.5 flex items-baseline justify-between gap-4 text-xs text-zinc-400">
            <span>Rozpočet klienta cca</span>
            <span className="font-semibold tabular-nums text-zinc-200">
              {Number(clientBudget).toLocaleString("sk-SK")} €
            </span>
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`offer-price-${bookingId}`}>
            Tvoja cena (EUR) *
          </Label>
          <Input
            id={`offer-price-${bookingId}`}
            inputMode="decimal"
            placeholder="napr. 450"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`offer-note-${bookingId}`}>Správa k ponuke</Label>
          <Textarea
            id={`offer-note-${bookingId}`}
            rows={2}
            placeholder="Čo je v cene, doprava, setup…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-xl"
          />
        </div>
      </div>
      <Button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={busy}
        className="gap-1.5 rounded-full"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {existingOfferPrice != null ? "Aktualizovať ponuku" : "Poslať ponuku"}
      </Button>
    </div>
  );
}

/** @deprecated Use DjOfferForm */
export function BulkOfferForm(props: {
  bookingId: string;
  onDone?: () => void;
}) {
  return <DjOfferForm {...props} mode="bulk" />;
}
