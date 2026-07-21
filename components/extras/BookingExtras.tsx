"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  addExtraToBooking,
  getBookingExtrasBundle,
  removeExtraFromBooking,
} from "@/app/actions/extras";
import { ExtraIcon } from "@/components/extras/ExtraIcon";
import type { BookingExtra, DjExtra } from "@/lib/extras/types";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type BookingExtrasProps = {
  bookingId: string;
  mode: "client" | "dj";
  className?: string;
  defaultOpen?: boolean;
};

export function BookingExtras({
  bookingId,
  mode,
  className,
  defaultOpen = false,
}: BookingExtrasProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<DjExtra[]>([]);
  const [selected, setSelected] = useState<BookingExtra[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getBookingExtrasBundle(bookingId);
    if (!result.ok) {
      setError(result.error);
      showToast(result.error, "error");
      setLoading(false);
      setLoaded(true);
      return;
    }
    setCatalog(result.catalog);
    setSelected(result.selected);
    setLoaded(true);
    setLoading(false);
  }, [bookingId, showToast]);

  useEffect(() => {
    if (!open || loaded) return;
    void load();
  }, [open, loaded, load]);

  const selectedIds = useMemo(
    () => new Set(selected.map((s) => s.extra_id).filter(Boolean) as string[]),
    [selected]
  );

  const available = useMemo(
    () => catalog.filter((c) => !selectedIds.has(c.id)),
    [catalog, selectedIds]
  );

  async function handleAdd(extraId: string) {
    setBusyId(extraId);
    const result = await addExtraToBooking({ bookingId, extraId });
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setSelected((prev) => [...prev, result.selected]);
    showToast("Pridané k požiadavkám.", "success");
  }

  async function handleRemove(rowId: string) {
    setBusyId(rowId);
    const result = await removeExtraFromBooking(rowId);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setSelected((prev) => prev.filter((s) => s.id !== rowId));
    showToast("Odstránené z požiadaviek.", "success");
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
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/10">
          <Sparkles className="size-3.5 text-fuchsia-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {mode === "client"
              ? "Špeciálne požiadavky"
              : "Špeciálne požiadavky klienta"}
          </p>
          <p className="text-[11px] text-zinc-500">
            {mode === "client"
              ? "Vyber zo špeciálnej ponuky účinkujúceho"
              : "Čo si klient vybral z tvojej ponuky"}
            {loaded && !error ? (
              <>
                {" · "}
                {selected.length === 0
                  ? "nič nevybrané"
                  : `${selected.length} vybrané`}
              </>
            ) : null}
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
          {loading && !loaded ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-fuchsia-400" />
            </div>
          ) : error ? (
            <p className="text-xs text-red-300/90">{error}</p>
          ) : (
            <>
              {selected.length > 0 ? (
                <ul className="space-y-2">
                  {selected.map((row) => {
                    const busy = busyId === row.id;
                    return (
                      <li
                        key={row.id}
                        className="flex items-start gap-3 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/[0.06] px-3 py-2.5"
                      >
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-fuchsia-500/20 bg-black/30 text-fuchsia-200">
                          <Check className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white">
                            {row.title}
                          </p>
                          {row.description ? (
                            <p className="mt-0.5 text-[11px] text-zinc-500">
                              {row.description}
                            </p>
                          ) : null}
                        </div>
                        {mode === "client" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleRemove(row.id)}
                            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-red-300"
                            title="Odobrať"
                          >
                            {busy ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : mode === "dj" ? (
                <p className="text-xs text-zinc-500">
                  Klient zatiaľ nevybral žiadne špeciálne požiadavky.
                </p>
              ) : null}

              {mode === "client" ? (
                available.length === 0 && catalog.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    Účinkujúci zatiaľ nemá v špeciálnej ponuke žiadne položky.
                  </p>
                ) : available.length === 0 ? (
                  <p className="text-xs text-emerald-300/80">
                    Všetky dostupné položky už máš vybrané.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                      Špeciálna ponuka
                    </p>
                    <ul className="space-y-2">
                      {available.map((extra) => {
                        const busy = busyId === extra.id;
                        return (
                          <li
                            key={extra.id}
                            className="flex items-start gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-fuchsia-500/[0.08] to-transparent px-3 py-3"
                          >
                            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30">
                              {extra.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={extra.image_url}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              ) : (
                                <ExtraIcon
                                  name={extra.icon}
                                  className="size-4 text-fuchsia-300"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-white">
                                {extra.title}
                              </p>
                              {extra.description ? (
                                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                                  {extra.description}
                                </p>
                              ) : null}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy}
                              onClick={() => handleAdd(extra.id)}
                              className="shrink-0 gap-1 rounded-full"
                            >
                              {busy ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Plus className="size-3.5" />
                              )}
                              Chcem
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
