"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChevronDown, Loader2, Save, Speaker } from "lucide-react";
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
  getLightsLabel,
  getMicrophoneLabel,
  getSoundProvidedLabel,
  LIGHTS_OPTIONS,
  MICROPHONE_OPTIONS,
  SOUND_PROVIDED_OPTIONS,
  type DjRequirements,
  type LightsSetup,
  type MicrophoneNeed,
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

function RequirementsReadView({ data }: { data: DjRequirements }) {
  const rows: { label: string; value: string | null }[] = [
    {
      label: "Ozvučenie",
      value: [
        getSoundProvidedLabel(data.sound_provided_by),
        data.sound_notes,
      ]
        .filter(Boolean)
        .join(" — ") || null,
    },
    { label: "Stôl / pult", value: data.booth_table_notes },
    {
      label: "Prúd",
      value: [
        data.power_sockets_min != null
          ? `min. ${data.power_sockets_min}× zásuvka`
          : null,
        data.power_dedicated_circuit
          ? "samostatný okruh (nie so svetlami)"
          : null,
        data.power_notes,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    },
    {
      label: "Monitor pri DJ",
      value: data.needs_booth_monitor
        ? "Áno — potrebujem reproduktory pri pulte"
        : null,
    },
    {
      label: "Mikrofón",
      value: [
        getMicrophoneLabel(data.microphone_need),
        data.microphone_notes,
      ]
        .filter(Boolean)
        .join(" — ") || null,
    },
    {
      label: "Svetlá",
      value: [getLightsLabel(data.lights_setup), data.lights_notes]
        .filter(Boolean)
        .join(" — ") || null,
    },
    {
      label: "Vonku",
      value: data.needs_weather_cover
        ? "Potrebujem zákryt / ochranu pred dažďom"
        : null,
    },
    {
      label: "Parkovanie / vykládka",
      value: [
        data.needs_parking ? "Potrebujem parkovanie pri vykládke" : null,
        data.load_in_notes,
      ]
        .filter(Boolean)
        .join(" — ") || null,
    },
    { label: "Ďalšie", value: data.other_notes },
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
        <p className="text-xs text-zinc-500">
          Požiadavky zatiaľ nie sú vyplnené.
        </p>
      ) : null}
    </dl>
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

  const [soundBy, setSoundBy] = useState<SoundProvidedBy | "">("");
  const [soundNotes, setSoundNotes] = useState("");
  const [boothTable, setBoothTable] = useState("");
  const [sockets, setSockets] = useState("2");
  const [dedicated, setDedicated] = useState(true);
  const [powerNotes, setPowerNotes] = useState("");
  const [boothMonitor, setBoothMonitor] = useState(false);
  const [mic, setMic] = useState<MicrophoneNeed | "">("");
  const [micNotes, setMicNotes] = useState("");
  const [lights, setLights] = useState<LightsSetup | "">("");
  const [lightsNotes, setLightsNotes] = useState("");
  const [weatherCover, setWeatherCover] = useState(false);
  const [parking, setParking] = useState(false);
  const [loadIn, setLoadIn] = useState("");
  const [other, setOther] = useState("");
  const [visible, setVisible] = useState(true);

  const applyData = useCallback((r: DjRequirements | null) => {
    setData(r);
    setSoundBy(r?.sound_provided_by ?? "");
    setSoundNotes(r?.sound_notes ?? "");
    setBoothTable(r?.booth_table_notes ?? "");
    setSockets(
      r?.power_sockets_min != null ? String(r.power_sockets_min) : "2"
    );
    setDedicated(r?.power_dedicated_circuit ?? true);
    setPowerNotes(r?.power_notes ?? "");
    setBoothMonitor(r?.needs_booth_monitor ?? false);
    setMic(r?.microphone_need ?? "");
    setMicNotes(r?.microphone_notes ?? "");
    setLights(r?.lights_setup ?? "");
    setLightsNotes(r?.lights_notes ?? "");
    setWeatherCover(r?.needs_weather_cover ?? false);
    setParking(r?.needs_parking ?? false);
    setLoadIn(r?.load_in_notes ?? "");
    setOther(r?.other_notes ?? "");
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

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (submitting || mode !== "dj") return;
    setSubmitting(true);
    const result = await upsertDjRequirements({
      bookingId,
      soundProvidedBy: (soundBy || null) as SoundProvidedBy | null,
      soundNotes,
      boothTableNotes: boothTable,
      powerSocketsMin: sockets ? Number(sockets) : null,
      powerDedicatedCircuit: dedicated,
      powerNotes,
      needsBoothMonitor: boothMonitor,
      microphoneNeed: (mic || null) as MicrophoneNeed | null,
      microphoneNotes: micNotes,
      lightsSetup: (lights || null) as LightsSetup | null,
      lightsNotes,
      needsWeatherCover: weatherCover,
      needsParking: parking,
      loadInNotes: loadIn,
      otherNotes: other,
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
                ? "Ozvučenie, prúd, stôl, mikrofón, svetlá…"
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
            <form onSubmit={handleSave} className="space-y-3">
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Jednoduchý checklist pre klienta a miesto — čo treba pripraviť
                na ozvučenie a setup. Uvidia to v dashboarde aj cez odkaz / QR.
              </p>

              <div className="space-y-1.5">
                <Label>Ozvučenie (PA)</Label>
                <Select
                  value={soundBy || undefined}
                  onValueChange={(v) =>
                    setSoundBy((v as SoundProvidedBy) || "")
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
              </div>

              <div className="space-y-1.5">
                <Label>Poznámka k ozvučeniu</Label>
                <Textarea
                  value={soundNotes}
                  onChange={(e) => setSoundNotes(e.target.value)}
                  placeholder="napr. suby podľa veľkosti sály, 100 dB bez skreslenia…"
                  className="min-h-[70px] rounded-xl"
                  maxLength={500}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Stôl / pult</Label>
                <Input
                  value={boothTable}
                  onChange={(e) => setBoothTable(e.target.value)}
                  placeholder="napr. pevný stôl min. 180×80 cm, výška ~90 cm"
                  className="h-10 rounded-xl"
                  maxLength={400}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Min. počet zásuviek 230V</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={sockets}
                    onChange={(e) => setSockets(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={dedicated}
                      onChange={(e) => setDedicated(e.target.checked)}
                      className="size-4 rounded border-white/20 bg-black/40"
                    />
                    Samostatný okruh (nie so svetlami)
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Poznámka k prúdu</Label>
                <Input
                  value={powerNotes}
                  onChange={(e) => setPowerNotes(e.target.value)}
                  placeholder="zásuvky blízko pultu, predlžovačka…"
                  className="h-10 rounded-xl"
                  maxLength={400}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={boothMonitor}
                  onChange={(e) => setBoothMonitor(e.target.checked)}
                  className="size-4 rounded border-white/20 bg-black/40"
                />
                Potrebujem monitor / reproduktory pri DJ pulte
              </label>

              <div className="space-y-1.5">
                <Label>Mikrofón</Label>
                <Select
                  value={mic || undefined}
                  onValueChange={(v) =>
                    setMic((v as MicrophoneNeed) || "")
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue placeholder="Vyber">
                      {(v) =>
                        MICROPHONE_OPTIONS.find((o) => o.value === v)?.label ??
                        "Vyber"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {MICROPHONE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} label={o.label}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Poznámka k mikrofónu</Label>
                <Input
                  value={micNotes}
                  onChange={(e) => setMicNotes(e.target.value)}
                  placeholder="príhovory, tombola, karaoke…"
                  className="h-10 rounded-xl"
                  maxLength={300}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Svetlá</Label>
                <Select
                  value={lights || undefined}
                  onValueChange={(v) =>
                    setLights((v as LightsSetup) || "")
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue placeholder="Vyber">
                      {(v) =>
                        LIGHTS_OPTIONS.find((o) => o.value === v)?.label ??
                        "Vyber"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LIGHTS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} label={o.label}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Poznámka k svetlám</Label>
                <Input
                  value={lightsNotes}
                  onChange={(e) => setLightsNotes(e.target.value)}
                  className="h-10 rounded-xl"
                  maxLength={400}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={weatherCover}
                  onChange={(e) => setWeatherCover(e.target.checked)}
                  className="size-4 rounded border-white/20 bg-black/40"
                />
                Ak je vonku — potrebujem zákryt / ochranu pred dažďom
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={parking}
                  onChange={(e) => setParking(e.target.checked)}
                  className="size-4 rounded border-white/20 bg-black/40"
                />
                Potrebujem parkovanie pri vykládke
              </label>

              <div className="space-y-1.5">
                <Label>Vykládka / prístup</Label>
                <Textarea
                  value={loadIn}
                  onChange={(e) => setLoadIn(e.target.value)}
                  placeholder="vchod, výťah, čas load-inu…"
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
