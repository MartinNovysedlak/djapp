"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Building2, ChevronDown, Loader2, Save } from "lucide-react";
import {
  getVenueQuestionnaire,
  upsertVenueQuestionnaire,
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
  getHallSizeLabel,
  getPowerAvailableLabel,
  getVenueSettingLabel,
  HALL_SIZE_OPTIONS,
  POWER_AVAILABLE_OPTIONS,
  VENUE_SETTING_OPTIONS,
  type HallSize,
  type PowerAvailable,
  type VenueQuestionnaire,
  type VenueSetting,
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

function QuestionnaireReadView({ data }: { data: VenueQuestionnaire }) {
  const rows: { label: string; value: string | null }[] = [
    {
      label: "Miesto",
      value: getVenueSettingLabel(data.venue_setting),
    },
    {
      label: "Počet hostí",
      value: data.guest_count != null ? String(data.guest_count) : null,
    },
    {
      label: "Veľkosť sály",
      value: [
        getHallSizeLabel(data.hall_size),
        data.hall_size_notes,
      ]
        .filter(Boolean)
        .join(" — ") || null,
    },
    { label: "Výška stropu", value: data.ceiling_height },
    {
      label: "Prúd na mieste",
      value: [
        getPowerAvailableLabel(data.power_available),
        data.power_notes,
      ]
        .filter(Boolean)
        .join(" — ") || null,
    },
    {
      label: "Pódium",
      value:
        data.stage_available == null
          ? null
          : data.stage_available
            ? "Áno"
            : "Nie",
    },
    { label: "Vonku / počasie", value: data.outdoor_notes },
    { label: "Ďalšie", value: data.other_notes },
  ];

  return (
    <div className="space-y-3">
      {data.submitted_at ? (
        <p className="text-[11px] text-emerald-300/90">
          Vyplnené{" "}
          {new Date(data.submitted_at).toLocaleString("sk-SK", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      ) : null}
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
          <p className="text-xs text-zinc-500">Dotazník je zatiaľ prázdny.</p>
        ) : null}
      </dl>
    </div>
  );
}

export function VenueQuestionnairePanel({
  bookingId,
  mode,
  shareToken,
  className,
  defaultOpen = false,
  embedded = false,
}: Props) {
  const { showToast } = useToast();
  const canEdit = mode === "client" || Boolean(shareToken);
  const [open, setOpen] = useState(defaultOpen || embedded);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<VenueQuestionnaire | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [setting, setSetting] = useState<VenueSetting | "">("");
  const [guestCount, setGuestCount] = useState("");
  const [hallSize, setHallSize] = useState<HallSize | "">("");
  const [hallNotes, setHallNotes] = useState("");
  const [ceiling, setCeiling] = useState("");
  const [power, setPower] = useState<PowerAvailable | "">("");
  const [powerNotes, setPowerNotes] = useState("");
  const [stage, setStage] = useState<"yes" | "no" | "">("");
  const [outdoor, setOutdoor] = useState("");
  const [other, setOther] = useState("");

  const applyData = useCallback((q: VenueQuestionnaire | null) => {
    setData(q);
    setSetting(q?.venue_setting ?? "");
    setGuestCount(q?.guest_count != null ? String(q.guest_count) : "");
    setHallSize(q?.hall_size ?? "");
    setHallNotes(q?.hall_size_notes ?? "");
    setCeiling(q?.ceiling_height ?? "");
    setPower(q?.power_available ?? "");
    setPowerNotes(q?.power_notes ?? "");
    setStage(
      q?.stage_available == null ? "" : q.stage_available ? "yes" : "no"
    );
    setOutdoor(q?.outdoor_notes ?? "");
    setOther(q?.other_notes ?? "");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getVenueQuestionnaire(bookingId, shareToken);
    setLoading(false);
    if (!result.ok) {
      showToast(result.error, "error");
      setLoaded(true);
      return;
    }
    applyData(result.questionnaire);
    setLoaded(true);
  }, [bookingId, shareToken, showToast, applyData]);

  useEffect(() => {
    if (!open || loaded) return;
    void load();
  }, [open, loaded, load]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (submitting || !canEdit) return;
    setSubmitting(true);
    const result = await upsertVenueQuestionnaire({
      bookingId,
      shareToken,
      venueSetting: (setting || null) as VenueSetting | null,
      guestCount: guestCount ? Number(guestCount) : null,
      hallSize: (hallSize || null) as HallSize | null,
      hallSizeNotes: hallNotes,
      ceilingHeight: ceiling,
      powerAvailable: (power || null) as PowerAvailable | null,
      powerNotes,
      stageAvailable: stage === "" ? null : stage === "yes",
      outdoorNotes: outdoor,
      otherNotes: other,
    });
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    applyData(result.questionnaire);
    showToast("Dotazník o mieste uložený.", "success");
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
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-teal-500/25 bg-teal-500/10">
            <Building2 className="size-3.5 text-teal-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              Dotazník o mieste
            </p>
            <p className="text-[11px] text-zinc-500">
              {mode === "dj"
                ? data?.submitted_at
                  ? "Klient vyplnil informácie o mieste"
                  : "Čaká na vyplnenie klientom"
                : "Vnútri/vonku, hostia, sála, prúd…"}
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
              <Loader2 className="size-5 animate-spin text-teal-400" />
            </div>
          ) : mode === "dj" ? (
            data ? (
              <QuestionnaireReadView data={data} />
            ) : (
              <p className="text-xs text-zinc-500">
                Klient ešte nevyplnil dotazník. Pošli mu odkaz / QR na prípravu
                akcie.
              </p>
            )
          ) : (
            <form onSubmit={handleSave} className="space-y-3">
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Pomôž umelcovi pripraviť techniku — či je to vonku/vnútri, koľko
                hostí a aký je priestor.
              </p>

              <div className="space-y-1.5">
                <Label>Miesto konania</Label>
                <Select
                  value={setting || undefined}
                  onValueChange={(v) =>
                    setSetting((v as VenueSetting) || "")
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue placeholder="Vyber">
                      {(v) =>
                        VENUE_SETTING_OPTIONS.find((o) => o.value === v)
                          ?.label ?? "Vyber"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {VENUE_SETTING_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} label={o.label}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Orientačný počet hostí</Label>
                <Input
                  type="number"
                  min={1}
                  max={20000}
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Veľkosť sály / priestoru</Label>
                <Select
                  value={hallSize || undefined}
                  onValueChange={(v) => setHallSize((v as HallSize) || "")}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue placeholder="Vyber">
                      {(v) =>
                        HALL_SIZE_OPTIONS.find((o) => o.value === v)?.label ??
                        "Vyber"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {HALL_SIZE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} label={o.label}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Poznámka k veľkosti</Label>
                <Input
                  value={hallNotes}
                  onChange={(e) => setHallNotes(e.target.value)}
                  placeholder="napr. dlhá úzka sála"
                  className="h-10 rounded-xl"
                  maxLength={300}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Výška stropu</Label>
                <Input
                  value={ceiling}
                  onChange={(e) => setCeiling(e.target.value)}
                  placeholder="napr. cca 3 m"
                  className="h-10 rounded-xl"
                  maxLength={120}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Je na mieste prúd?</Label>
                <Select
                  value={power || undefined}
                  onValueChange={(v) =>
                    setPower((v as PowerAvailable) || "")
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue placeholder="Vyber">
                      {(v) =>
                        POWER_AVAILABLE_OPTIONS.find((o) => o.value === v)
                          ?.label ?? "Vyber"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {POWER_AVAILABLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} label={o.label}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Poznámka k prúdu</Label>
                <Input
                  value={powerNotes}
                  onChange={(e) => setPowerNotes(e.target.value)}
                  className="h-10 rounded-xl"
                  maxLength={400}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Je pódium?</Label>
                <Select
                  value={stage || undefined}
                  onValueChange={(v) =>
                    setStage((v as "yes" | "no") || "")
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue placeholder="Vyber">
                      {(v) =>
                        v === "yes" ? "Áno" : v === "no" ? "Nie" : "Vyber"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes" label="Áno">
                      Áno
                    </SelectItem>
                    <SelectItem value="no" label="Nie">
                      Nie
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Vonku / počasie / plán B</Label>
                <Textarea
                  value={outdoor}
                  onChange={(e) => setOutdoor(e.target.value)}
                  placeholder="ak je vonku — stan, podlaha, záloha pri daždi…"
                  className="min-h-[70px] rounded-xl"
                  maxLength={500}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Ďalšie info</Label>
                <Textarea
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  className="min-h-[70px] rounded-xl"
                  maxLength={800}
                />
              </div>

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
                Odoslať umelcovi
              </Button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
