"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChevronDown, Loader2, Plus, Save, Speaker, X } from "lucide-react";
import {
  getDjRequirements,
  upsertDjRequirements,
} from "@/app/actions/tech";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getRequirementItemLabel,
  getRequirementItemMeta,
  getSoundProvidedLabel,
  REQUIREMENT_CATALOG,
  SOUND_PROVIDED_OPTIONS,
  type DjRequirements,
  type RequirementItem,
  type RequirementItemId,
  type SoundProvidedBy,
} from "@/lib/tech/types";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";

type Props = {
  bookingId: string;
  mode: "client" | "dj";
  shareToken?: string;
  className?: string;
  defaultOpen?: boolean;
  embedded?: boolean;
};

type DraftItem = RequirementItem & { noteOpen: boolean };

function formatItemSummary(item: RequirementItem) {
  const label = getRequirementItemLabel(item.id);
  const parts: string[] = [];
  if (item.id === "power_sockets" && item.quantity != null) {
    parts.push(`min. ${item.quantity}×`);
  }
  if (item.note) parts.push(item.note);
  return parts.length ? `${label} — ${parts.join(" · ")}` : label;
}

function RequirementsReadView({ data }: { data: DjRequirements }) {
  const sound = [
    getSoundProvidedLabel(data.sound_provided_by),
    data.sound_notes,
  ]
    .filter(Boolean)
    .join(" — ");

  const hasAnything = Boolean(sound) || data.items.length > 0;

  return (
    <div className="space-y-4">
      {sound ? (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Ozvučenie
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-200">
            {sound}
          </p>
        </div>
      ) : null}

      {data.items.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Dodatočné požiadavky
          </p>
          <ul className="mt-2 space-y-2">
            {data.items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200"
              >
                {formatItemSummary(item)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!hasAnything ? (
        <p className="text-xs text-zinc-500">
          Požiadavky zatiaľ nie sú vyplnené.
        </p>
      ) : null}
    </div>
  );
}

function OptionalNote({
  open,
  value,
  onOpen,
  onChange,
  onClose,
  placeholder,
}: {
  open: boolean;
  value: string;
  onOpen: () => void;
  onChange: (v: string) => void;
  onClose: () => void;
  placeholder?: string;
}) {
  if (!open && !value) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="text-[11px] font-medium text-violet-300/90 transition-colors hover:text-violet-200"
      >
        + Pridať poznámku
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] text-zinc-500">Poznámka</Label>
        <button
          type="button"
          onClick={() => {
            onChange("");
            onClose();
          }}
          className="text-[11px] text-zinc-500 hover:text-zinc-300"
        >
          Odstrániť
        </button>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Doplňujúci detail…"}
        className="min-h-[64px] rounded-xl"
        maxLength={500}
      />
    </div>
  );
}

export function DjRequirementsPanel({
  bookingId,
  mode,
  shareToken,
  className,
  defaultOpen = false,
  embedded = false,
}: Props) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(defaultOpen || embedded);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<DjRequirements | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [soundBy, setSoundBy] = useState<SoundProvidedBy | null>(null);
  const [soundNotes, setSoundNotes] = useState("");
  const [soundNoteOpen, setSoundNoteOpen] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [visible, setVisible] = useState(true);

  const applyData = useCallback((r: DjRequirements | null) => {
    setData(r);
    setSoundBy(r?.sound_provided_by ?? null);
    setSoundNotes(r?.sound_notes ?? "");
    setSoundNoteOpen(Boolean(r?.sound_notes));
    setItems(
      (r?.items ?? []).map((item) => ({
        ...item,
        noteOpen: Boolean(item.note),
      }))
    );
    setVisible(r?.visible_to_client ?? true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getDjRequirements(bookingId, shareToken);
    setLoading(false);
    if (!result.ok) {
      showToast(result.error, "error");
      setLoaded(true);
      return;
    }
    applyData(result.requirements);
    setLoaded(true);
  }, [bookingId, shareToken, showToast, applyData]);

  useEffect(() => {
    if (!open || loaded) return;
    void load();
  }, [open, loaded, load]);

  const selectedIds = new Set(items.map((i) => i.id));
  const available = REQUIREMENT_CATALOG.filter((c) => !selectedIds.has(c.id));

  function addItem(id: RequirementItemId) {
    if (selectedIds.has(id)) return;
    const meta = getRequirementItemMeta(id);
    setItems((prev) => [
      ...prev,
      {
        id,
        note: null,
        noteOpen: false,
        ...(meta?.hasQuantity ? { quantity: 2 } : {}),
      },
    ]);
  }

  function removeItem(id: RequirementItemId) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateItem(id: RequirementItemId, patch: Partial<DraftItem>) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
    );
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (submitting || mode !== "dj") return;
    setSubmitting(true);
    const result = await upsertDjRequirements({
      bookingId,
      soundProvidedBy: soundBy,
      soundNotes,
      items: items.map(({ id, note, quantity }) => ({
        id,
        note: note?.trim() || null,
        ...(id === "power_sockets" ? { quantity: quantity ?? null } : {}),
      })),
      visibleToClient: visible,
    });
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    applyData(result.requirements);
    showToast("Požiadavky DJ uložené.", "success");
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-black/25",
        className
      )}
    >
      {embedded ? null : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10">
            <Speaker className="size-3.5 text-amber-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Požiadavky DJ</p>
            <p className="text-[11px] text-zinc-500">
              {mode === "dj"
                ? "Ozvučenie + dodatočné požiadavky"
                : "Čo umelec potrebuje na akcii"}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-zinc-500 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      )}

      {open ? (
        <div
          className={cn(
            "space-y-4 px-4 py-4",
            !embedded && "border-t border-white/8"
          )}
        >
          {loading && !loaded ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-amber-400" />
            </div>
          ) : mode === "dj" ? (
            <form onSubmit={handleSave} className="space-y-4">
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Najprv ozvučenie, potom pridaj čo ešte treba — poznámka je
                voliteľná pri každej položke.
              </p>

              <div className="space-y-2">
                <Label>Ozvučenie (PA)</Label>
                <Select
                  value={soundBy}
                  onValueChange={(v) =>
                    setSoundBy((v as SoundProvidedBy) || null)
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue placeholder="Vyber">
                      {(v) =>
                        SOUND_PROVIDED_OPTIONS.find((o) => o.value === v)
                          ?.label ?? "Vyber"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SOUND_PROVIDED_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} label={o.label}>
                        <span className="flex flex-col text-left">
                          <span>{o.label}</span>
                          <span className="text-[10px] text-zinc-500">
                            {o.hint}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <OptionalNote
                  open={soundNoteOpen}
                  value={soundNotes}
                  onOpen={() => setSoundNoteOpen(true)}
                  onClose={() => setSoundNoteOpen(false)}
                  onChange={setSoundNotes}
                  placeholder="napr. suby podľa veľkosti sály…"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    Dodatočné požiadavky
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    Vyber zo zoznamu — potom môžeš doplniť poznámku.
                  </p>
                </div>

                {items.length > 0 ? (
                  <ul className="space-y-2">
                    {items.map((item) => {
                      const meta = getRequirementItemMeta(item.id);
                      return (
                        <li
                          key={item.id}
                          className="rounded-xl border border-white/10 bg-black/35 px-3 py-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white">
                                {meta?.label ?? item.id}
                              </p>
                              {meta?.hint ? (
                                <p className="text-[11px] text-zinc-500">
                                  {meta.hint}
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
                              aria-label="Odstrániť"
                            >
                              <X className="size-4" />
                            </button>
                          </div>

                          {meta?.hasQuantity ? (
                            <div className="mt-2 max-w-[140px] space-y-1">
                              <Label className="text-[11px] text-zinc-500">
                                Min. počet
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                max={20}
                                value={item.quantity ?? 2}
                                onChange={(e) =>
                                  updateItem(item.id, {
                                    quantity: Number(e.target.value) || null,
                                  })
                                }
                                className="h-9 rounded-xl"
                              />
                            </div>
                          ) : null}

                          <div className="mt-2">
                            <OptionalNote
                              open={item.noteOpen}
                              value={item.note ?? ""}
                              onOpen={() =>
                                updateItem(item.id, { noteOpen: true })
                              }
                              onClose={() =>
                                updateItem(item.id, {
                                  noteOpen: false,
                                  note: null,
                                })
                              }
                              onChange={(v) =>
                                updateItem(item.id, { note: v || null })
                              }
                              placeholder={
                                item.id === "booth_table"
                                  ? "napr. min. 180×80 cm, výška ~90 cm"
                                  : item.id === "microphone"
                                    ? "káblový / bezdrôtový, príhovory…"
                                    : "Doplňujúci detail…"
                              }
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Zatiaľ nič pridané — vyber nižšie.
                  </p>
                )}

                {available.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {available.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => addItem(opt.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-white"
                      >
                        <Plus className="size-3" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={(e) => setVisible(e.target.checked)}
                  className="size-4 rounded border-white/20 bg-black/40"
                />
                Zobraziť zákazníkovi (dashboard / QR)
              </label>

              <Button
                type="submit"
                disabled={submitting}
                className="gap-1.5 rounded-full"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Uložiť požiadavky
              </Button>
            </form>
          ) : data ? (
            <RequirementsReadView data={data} />
          ) : (
            <p className="text-xs text-zinc-500">
              Umelec zatiaľ nezdieľal požiadavky na akciu.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
