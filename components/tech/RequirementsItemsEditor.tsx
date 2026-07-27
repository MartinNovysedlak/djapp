"use client";

import { Plus, X } from "lucide-react";
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
  getRequirementItemMeta,
  REQUIREMENT_CATALOG,
  type RequirementItem,
  type RequirementItemId,
} from "@/lib/tech/types";

export type DraftRequirementItem = RequirementItem & { noteOpen: boolean };

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

type Props = {
  items: DraftRequirementItem[];
  onChange: (items: DraftRequirementItem[]) => void;
};

export function RequirementsItemsEditor({ items, onChange }: Props) {
  const selectedIds = new Set(items.map((i) => i.id));
  const available = REQUIREMENT_CATALOG.filter((c) => !selectedIds.has(c.id));

  function addItem(id: RequirementItemId) {
    if (selectedIds.has(id)) return;
    const meta = getRequirementItemMeta(id);
    onChange([
      ...items,
      {
        id,
        note: null,
        noteOpen: false,
        ...(meta?.hasQuantity ? { quantity: 2 } : {}),
        ...(meta?.choices ? { choice: meta.choices[0]?.value ?? null } : {}),
      },
    ]);
  }

  function removeItem(id: RequirementItemId) {
    onChange(items.filter((i) => i.id !== id));
  }

  function updateItem(id: RequirementItemId, patch: Partial<DraftRequirementItem>) {
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  return (
    <div className="space-y-3">
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
                      <p className="text-[11px] text-zinc-500">{meta.hint}</p>
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

                {meta?.choices ? (
                  <div className="mt-2 space-y-1">
                    <Label className="text-[11px] text-zinc-500">Voľba</Label>
                    <Select
                      value={item.choice ?? meta.choices[0]?.value ?? null}
                      onValueChange={(v) =>
                        updateItem(item.id, { choice: v || null })
                      }
                    >
                      <SelectTrigger className="h-9 w-full rounded-xl">
                        <SelectValue placeholder="Vyber">
                          {(v) =>
                            meta.choices?.find((o) => o.value === v)?.label ??
                            "Vyber"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {meta.choices.map((o) => (
                          <SelectItem
                            key={o.value}
                            value={o.value}
                            label={o.label}
                          >
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
                  </div>
                ) : null}

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
                    onOpen={() => updateItem(item.id, { noteOpen: true })}
                    onClose={() =>
                      updateItem(item.id, { noteOpen: false, note: null })
                    }
                    onChange={(v) =>
                      updateItem(item.id, { note: v || null })
                    }
                    placeholder={
                      item.id === "booth_table"
                        ? "napr. min. 180×80 cm, výška ~90 cm"
                        : item.id === "microphone"
                          ? "káblový / bezdrôtový, príhovory…"
                          : item.id === "sound"
                            ? "napr. suby podľa veľkosti sály…"
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
  );
}

export function toPersistItems(items: DraftRequirementItem[]): RequirementItem[] {
  return items.map(({ id, note, quantity, choice }) => {
    const meta = getRequirementItemMeta(id);
    return {
      id,
      note: note?.trim() || null,
      ...(meta?.hasQuantity ? { quantity: quantity ?? null } : {}),
      ...(meta?.choices ? { choice: choice ?? null } : {}),
    };
  });
}

export function toDraftItems(items: RequirementItem[]): DraftRequirementItem[] {
  return items.map((item) => ({
    ...item,
    noteOpen: Boolean(item.note),
  }));
}
