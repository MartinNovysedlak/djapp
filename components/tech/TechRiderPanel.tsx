"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChevronDown, Loader2, Plug, Save } from "lucide-react";
import { getTechRider, upsertTechRider } from "@/app/actions/tech";
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
  getPaProvidedLabel,
  PA_PROVIDED_OPTIONS,
  type PaProvidedBy,
  type TechRider,
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

function RiderReadView({ rider }: { rider: TechRider }) {
  const rows: { label: string; value: string | null }[] = [
    { label: "Prúd", value: rider.power_requirements },
    { label: "Stôl / pódium", value: rider.table_or_stage },
    {
      label: "DI boxy",
      value: rider.needs_di_boxes
        ? rider.di_boxes_count != null
          ? `Áno · ${rider.di_boxes_count}×`
          : "Áno"
        : "Nie",
    },
    { label: "Svetlá", value: rider.lighting_notes },
    {
      label: "Ozvučenie",
      value: [
        getPaProvidedLabel(rider.pa_provided_by),
        rider.pa_notes,
      ]
        .filter(Boolean)
        .join(" — ") || null,
    },
    { label: "Priestor", value: rider.space_notes },
    {
      label: "Parkovanie / vykládka",
      value: rider.parking_needed
        ? ["Potrebné", rider.load_in_notes].filter(Boolean).join(" — ")
        : rider.load_in_notes,
    },
    { label: "Ďalšie", value: rider.other_notes },
  ];

  return (
    <dl className="space-y-3">
      {rows.map((row) =>
        row.value ? (
          <div key={row.label}>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              {row.label}
            </dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-200">
              {row.value}
            </dd>
          </div>
        ) : null
      )}
      {!rows.some((r) => r.value) ? (
        <p className="text-xs text-zinc-500">Rider je zatiaľ prázdny.</p>
      ) : null}
    </dl>
  );
}

export function TechRiderPanel({
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
  const [rider, setRider] = useState<TechRider | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [power, setPower] = useState("");
  const [tableStage, setTableStage] = useState("");
  const [needsDi, setNeedsDi] = useState(false);
  const [diCount, setDiCount] = useState("");
  const [lighting, setLighting] = useState("");
  const [paBy, setPaBy] = useState<PaProvidedBy | "">("");
  const [paNotes, setPaNotes] = useState("");
  const [space, setSpace] = useState("");
  const [parking, setParking] = useState(false);
  const [loadIn, setLoadIn] = useState("");
  const [other, setOther] = useState("");
  const [visible, setVisible] = useState(true);

  const applyRider = useCallback((r: TechRider | null) => {
    setRider(r);
    setPower(r?.power_requirements ?? "");
    setTableStage(r?.table_or_stage ?? "");
    setNeedsDi(r?.needs_di_boxes ?? false);
    setDiCount(r?.di_boxes_count != null ? String(r.di_boxes_count) : "");
    setLighting(r?.lighting_notes ?? "");
    setPaBy(r?.pa_provided_by ?? "");
    setPaNotes(r?.pa_notes ?? "");
    setSpace(r?.space_notes ?? "");
    setParking(r?.parking_needed ?? false);
    setLoadIn(r?.load_in_notes ?? "");
    setOther(r?.other_notes ?? "");
    setVisible(r?.visible_to_client ?? true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getTechRider(bookingId, shareToken);
    setLoading(false);
    if (!result.ok) {
      showToast(result.error, "error");
      setLoaded(true);
      return;
    }
    applyRider(result.rider);
    setLoaded(true);
  }, [bookingId, shareToken, showToast, applyRider]);

  useEffect(() => {
    if (!open || loaded) return;
    void load();
  }, [open, loaded, load]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (submitting || mode !== "dj") return;
    setSubmitting(true);
    const result = await upsertTechRider({
      bookingId,
      powerRequirements: power,
      tableOrStage: tableStage,
      needsDiBoxes: needsDi,
      diBoxesCount: diCount ? Number(diCount) : null,
      lightingNotes: lighting,
      paProvidedBy: (paBy || null) as PaProvidedBy | null,
      paNotes,
      spaceNotes: space,
      parkingNeeded: parking,
      loadInNotes: loadIn,
      otherNotes: other,
      visibleToClient: visible,
    });
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    applyRider(result.rider);
    showToast("Technický rider uložený.", "success");
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
            <Plug className="size-3.5 text-amber-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Technický rider</p>
            <p className="text-[11px] text-zinc-500">
              {mode === "dj"
                ? "Požiadavky na miesto / zákazníka"
                : "Požiadavky umelca na miesto"}
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
            <form onSubmit={handleSave} className="space-y-3">
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Jednoduchý rider pre miesto konania alebo zákazníka — prúd,
                stôl/pódium, DI, svetlá. Uvidí ho cez odkaz / QR.
              </p>

              <div className="space-y-1.5">
                <Label>Prúd</Label>
                <Input
                  value={power}
                  onChange={(e) => setPower(e.target.value)}
                  placeholder="napr. 2× 230V / 16A blízko pultu"
                  className="h-10 rounded-xl"
                  maxLength={400}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Stôl / pódium</Label>
                <Input
                  value={tableStage}
                  onChange={(e) => setTableStage(e.target.value)}
                  placeholder="napr. stôl 180×80 cm alebo pódium 3×2 m"
                  className="h-10 rounded-xl"
                  maxLength={300}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={needsDi}
                  onChange={(e) => setNeedsDi(e.target.checked)}
                  className="size-4 rounded border-white/20 bg-black/40"
                />
                Potrebujem DI boxy
              </label>
              {needsDi ? (
                <div className="space-y-1.5">
                  <Label>Počet DI</Label>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={diCount}
                    onChange={(e) => setDiCount(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label>Svetlá</Label>
                <Textarea
                  value={lighting}
                  onChange={(e) => setLighting(e.target.value)}
                  placeholder="napr. vlastné LED, potrebujem tmavý strop…"
                  className="min-h-[70px] rounded-xl"
                  maxLength={500}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Ozvučenie (PA)</Label>
                <Select
                  value={paBy || undefined}
                  onValueChange={(v) => setPaBy((v as PaProvidedBy) || "")}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue placeholder="Vyber">
                      {(v) =>
                        PA_PROVIDED_OPTIONS.find((o) => o.value === v)?.label ??
                        "Vyber"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PA_PROVIDED_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} label={o.label}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Poznámka k ozvučeniu</Label>
                <Input
                  value={paNotes}
                  onChange={(e) => setPaNotes(e.target.value)}
                  className="h-10 rounded-xl"
                  maxLength={400}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Priestor</Label>
                <Textarea
                  value={space}
                  onChange={(e) => setSpace(e.target.value)}
                  placeholder="min. priestor pri pulte, prístup…"
                  className="min-h-[70px] rounded-xl"
                  maxLength={500}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={parking}
                  onChange={(e) => setParking(e.target.checked)}
                  className="size-4 rounded border-white/20 bg-black/40"
                />
                Potrebujem parkovanie / vykládku
              </label>

              <div className="space-y-1.5">
                <Label>Load-in / vykládka</Label>
                <Textarea
                  value={loadIn}
                  onChange={(e) => setLoadIn(e.target.value)}
                  className="min-h-[70px] rounded-xl"
                  maxLength={500}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Ďalšie požiadavky</Label>
                <Textarea
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  className="min-h-[70px] rounded-xl"
                  maxLength={800}
                />
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
                Uložiť rider
              </Button>
            </form>
          ) : rider ? (
            <RiderReadView rider={rider} />
          ) : (
            <p className="text-xs text-zinc-500">
              Umelec zatiaľ nezdieľal technický rider.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
