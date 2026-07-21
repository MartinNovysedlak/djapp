"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  ChevronDown,
  Clock,
  Download,
  Loader2,
  Music2,
  Pencil,
  Plus,
  Trash2,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  addTimelineItem,
  deleteTimelineItem,
  getBookingTimeline,
  moveTimelineItem,
  toggleTimelineItemDone,
  updateTimelineItem,
} from "@/app/actions/timeline";
import { formatTimelineTime } from "@/lib/timeline/format";
import {
  formatTimelineTimeRange,
  sortTimelineItems,
} from "@/lib/timeline/sort";
import {
  getTimelineStartModeLabel,
  getTimelineStartModeMeta,
  getTimelineTypeMeta,
  TIMELINE_ITEM_TYPES,
  TIMELINE_START_MODES,
  type TimelineItem,
  type TimelineItemType,
  type TimelineStartMode,
} from "@/lib/timeline/types";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";
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

type EventTimelineProps = {
  bookingId: string;
  mode: "client" | "dj";
  className?: string;
  defaultOpen?: boolean;
};

type FormState = {
  hasTime: boolean;
  eventTime: string;
  endTime: string;
  durationMinutes: string;
  itemType: TimelineItemType;
  title: string;
  notes: string;
  songTitle: string;
  songArtist: string;
  techNotes: string;
  startMode: TimelineStartMode | "";
  startDetail: string;
  isCritical: boolean;
};

const EMPTY_FORM: FormState = {
  hasTime: true,
  eventTime: "",
  endTime: "",
  durationMinutes: "",
  itemType: "other",
  title: "",
  notes: "",
  songTitle: "",
  songArtist: "",
  techNotes: "",
  startMode: "timed",
  startDetail: "",
  isCritical: false,
};

function openStorageKey(bookingId: string) {
  return `timeline-open:${bookingId}`;
}

function draftStorageKey(bookingId: string) {
  return `timeline-draft:${bookingId}`;
}

function readPersistedDraft(bookingId: string): {
  form: FormState;
  editingId: string | null;
  showAdvanced: boolean;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(draftStorageKey(bookingId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      form?: FormState;
      editingId?: string | null;
      showAdvanced?: boolean;
    };
    if (!parsed.form) return null;
    return {
      form: { ...EMPTY_FORM, ...parsed.form },
      editingId: parsed.editingId ?? null,
      showAdvanced: Boolean(parsed.showAdvanced),
    };
  } catch {
    return null;
  }
}

function typeAccent(type: TimelineItemType) {
  switch (type) {
    case "song_cue":
    case "first_dance":
    case "parent_dance":
    case "dance_round":
    case "entrance":
    case "cake":
      return "border-fuchsia-500/25 bg-fuchsia-500/[0.06]";
    case "changeover":
    case "break":
    case "setup":
      return "border-amber-500/25 bg-amber-500/[0.06]";
    case "speech":
    case "toast":
    case "announcement":
      return "border-sky-500/25 bg-sky-500/[0.06]";
    case "party":
    case "show":
    case "performance":
      return "border-violet-500/25 bg-violet-500/[0.06]";
    case "special":
      return "border-rose-500/30 bg-rose-500/[0.08]";
    default:
      return "border-white/8 bg-white/[0.03]";
  }
}

export function EventTimeline({
  bookingId,
  mode,
  className,
  defaultOpen = false,
}: EventTimelineProps) {
  const { showToast } = useToast();
  const draft = useMemo(() => readPersistedDraft(bookingId), [bookingId]);
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(draft?.form ?? EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(
    draft?.editingId ?? null
  );
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(
    draft?.showAdvanced ?? false
  );

  useEffect(() => {
    if (mode === "dj") return;
    try {
      sessionStorage.setItem(openStorageKey(bookingId), open ? "1" : "0");
    } catch {
      /* ignore */
    }
    // mode is fixed for the component instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, open]);

  useEffect(() => {
    if (mode !== "client" || !open) return;
    try {
      sessionStorage.setItem(
        draftStorageKey(bookingId),
        JSON.stringify({ form, editingId, showAdvanced })
      );
    } catch {
      /* ignore */
    }
  }, [bookingId, mode, open, form, editingId, showAdvanced]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const result = await getBookingTimeline(bookingId);
    if (!result.ok) {
      showToast(result.error, "error");
      setLoading(false);
      return;
    }
    setItems(sortTimelineItems(result.items));
    setLoaded(true);
    setLoading(false);
  }, [bookingId, showToast]);

  useEffect(() => {
    if (!open || loaded) return;
    void loadItems();
  }, [open, loaded, loadItems]);

  const sorted = useMemo(() => sortTimelineItems(items), [items]);
  const criticalCount = useMemo(
    () => sorted.filter((i) => i.is_critical).length,
    [sorted]
  );
  const songCueCount = useMemo(
    () =>
      sorted.filter(
        (i) =>
          i.song_title ||
          i.item_type === "song_cue" ||
          i.item_type === "first_dance"
      ).length,
    [sorted]
  );
  const typeMeta = getTimelineTypeMeta(form.itemType);

  function clearDraft() {
    try {
      sessionStorage.removeItem(draftStorageKey(bookingId));
    } catch {
      /* ignore */
    }
  }

  function applyType(type: TimelineItemType) {
    const meta = getTimelineTypeMeta(type);
    setForm((f) => ({
      ...f,
      itemType: type,
      title:
        !f.title.trim() ||
        TIMELINE_ITEM_TYPES.some(
          (t) => t.defaultTitle && t.defaultTitle === f.title
        )
          ? meta.defaultTitle || f.title
          : f.title,
      isCritical:
        type === "first_dance" ||
        type === "entrance" ||
        type === "ceremony" ||
        type === "show" ||
        type === "performance"
          ? true
          : f.isCritical,
    }));
    if (meta.needsSong) setShowAdvanced(true);
  }

  function startEdit(item: TimelineItem) {
    setEditingId(item.id);
    setForm({
      hasTime: Boolean(item.event_time),
      eventTime: formatTimelineTime(item.event_time),
      endTime: formatTimelineTime(item.end_time),
      durationMinutes:
        item.duration_minutes != null ? String(item.duration_minutes) : "",
      itemType: item.item_type === "moment" ? "other" : item.item_type,
      title: item.title,
      notes: item.notes ?? "",
      songTitle: item.song_title ?? "",
      songArtist: item.song_artist ?? "",
      techNotes: item.tech_notes ?? "",
      startMode: item.start_mode ?? "",
      startDetail: item.start_detail ?? "",
      isCritical: item.is_critical,
    });
    setShowAdvanced(Boolean(item.song_title || item.tech_notes || item.song_artist));
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowAdvanced(false);
    clearDraft();
  }

  function formToPayload() {
    return {
      eventTime: form.hasTime ? form.eventTime || null : null,
      endTime: form.hasTime && form.endTime ? form.endTime : null,
      durationMinutes: form.durationMinutes
        ? Number(form.durationMinutes)
        : null,
      itemType: form.itemType,
      title: form.title,
      notes: form.notes,
      songTitle: form.songTitle,
      songArtist: form.songArtist,
      techNotes: form.techNotes,
      energy: null,
      startMode: (form.startMode || null) as TimelineStartMode | null,
      startDetail: form.startDetail,
      isCritical: form.isCritical,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const payload = formToPayload();

    if (editingId) {
      const result = await updateTimelineItem({ itemId: editingId, ...payload });
      setSubmitting(false);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      if (result.item) {
        setItems((prev) =>
          sortTimelineItems(
            prev.map((i) => (i.id === editingId ? result.item! : i))
          )
        );
      }
      cancelEdit();
      showToast("Bod programu upravený.", "success");
      return;
    }

    const result = await addTimelineItem({ bookingId, ...payload });
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    if (result.item) {
      setItems((prev) => sortTimelineItems([...prev, result.item!]));
    }
    setForm((f) => ({
      ...EMPTY_FORM,
      itemType: f.itemType,
      hasTime: f.hasTime,
      startMode: f.startMode,
    }));
    setShowAdvanced(false);
    clearDraft();
    showToast("Bod programu pridaný.", "success");
  }

  async function handleDelete(itemId: string) {
    setBusyId(itemId);
    const result = await deleteTimelineItem(itemId);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    if (editingId === itemId) cancelEdit();
    showToast("Bod programu odstránený.", "success");
  }

  async function handleMove(itemId: string, direction: "up" | "down") {
    setBusyId(itemId);
    const result = await moveTimelineItem(itemId, direction);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setItems(sortTimelineItems(result.items));
  }

  async function handleToggleDone(item: TimelineItem) {
    setBusyId(item.id);
    const result = await toggleTimelineItemDone(item.id, !item.is_done);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, is_done: result.item?.is_done ?? !item.is_done }
          : i
      )
    );
  }

  async function handleExportPdf() {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch("/api/timeline/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      if (!res.ok) {
        let message = "PDF sa nepodarilo vygenerovať.";
        try {
          const json = (await res.json()) as { error?: string };
          if (json.error) message = json.error;
        } catch {
          /* ignore */
        }
        showToast(message, "error");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `program-${bookingId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Program PDF stiahnuté.", "success");
    } catch (err) {
      console.error("[EventTimeline export]", err);
      showToast("PDF sa nepodarilo vygenerovať.", "error");
    } finally {
      setExporting(false);
    }
  }

  const startModeMeta = getTimelineStartModeMeta(
    form.startMode || null
  );

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
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/10">
          <CalendarClock className="size-3.5 text-sky-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Harmonogram</p>
          <p className="text-[11px] text-zinc-500">
            {mode === "client"
              ? "Program akcie (časy, zmeny, skladby, spustenie)"
              : "Program od klienta"}
            {loaded ? (
              <>
                {" · "}
                {sorted.length === 0
                  ? "zatiaľ prázdne"
                  : `${sorted.length} bodov`}
                {criticalCount > 0 ? (
                  <span className="text-rose-300">
                    {" "}
                    · {criticalCount} kritických
                  </span>
                ) : null}
                {songCueCount > 0 ? (
                  <span className="text-fuchsia-300">
                    {" "}
                    · {songCueCount} so skladbou
                  </span>
                ) : null}
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
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-sky-400" />
            </div>
          ) : (
            <>
              {mode === "dj" ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="max-w-md text-xs leading-relaxed text-zinc-500">
                    Program na pult alebo pódiu. Odškrtávaj hotové body —
                    kritické momenty a skladby sú zvýraznené. PDF je tmavé na
                    čítanie v tme.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={exporting || sorted.length === 0}
                    onClick={() => void handleExportPdf()}
                    className="gap-1.5 rounded-full"
                  >
                    {exporting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                    Exportovať program (PDF)
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <p className="text-[11px] leading-relaxed text-zinc-500">
                    Zostav program pre kapelu alebo hudobný sprievod: body s
                    časom aj bez, tanečné kolá, vystúpenia, show, a spôsob
                    spustenia (na znamenie, na slovo…).
                  </p>

                  <div className="space-y-1.5">
                    <Label>Typ bodu</Label>
                    <Select
                      value={form.itemType}
                      onValueChange={(v) => {
                        if (v) applyType(v as TimelineItemType);
                      }}
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl">
                        <SelectValue>
                          {(v) =>
                            getTimelineTypeMeta(
                              (v as TimelineItemType) || form.itemType
                            ).label
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {TIMELINE_ITEM_TYPES.map((t) => (
                          <SelectItem
                            key={t.value}
                            value={t.value}
                            label={t.label}
                          >
                            <span className="flex flex-col text-left">
                              <span>{t.label}</span>
                              <span className="text-[10px] text-zinc-500">
                                {t.hint}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`tl-title-${bookingId}`}>Názov</Label>
                    <Input
                      id={`tl-title-${bookingId}`}
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                      placeholder={
                        typeMeta.defaultTitle || "napr. Po večeri open dance"
                      }
                      className="h-10 rounded-xl"
                      maxLength={160}
                      required
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={form.hasTime}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            hasTime: e.target.checked,
                            eventTime: e.target.checked ? f.eventTime : "",
                            endTime: e.target.checked ? f.endTime : "",
                          }))
                        }
                        className="size-3.5 rounded border-white/20"
                      />
                      <Clock className="size-3.5 text-sky-300" />
                      Má konkrétny čas
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={form.isCritical}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            isCritical: e.target.checked,
                          }))
                        }
                        className="size-3.5 rounded border-white/20"
                      />
                      <Zap className="size-3.5 text-rose-300" />
                      Kritický moment (nesmie sa zmeškať)
                    </label>
                  </div>

                  {form.hasTime ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`tl-time-${bookingId}`}>Od</Label>
                        <Input
                          id={`tl-time-${bookingId}`}
                          type="time"
                          value={form.eventTime}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              eventTime: e.target.value,
                            }))
                          }
                          className="h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`tl-end-${bookingId}`}>
                          Do{" "}
                          <span className="font-normal text-zinc-500">
                            (voliteľné)
                          </span>
                        </Label>
                        <Input
                          id={`tl-end-${bookingId}`}
                          type="time"
                          value={form.endTime}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, endTime: e.target.value }))
                          }
                          className="h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`tl-dur-${bookingId}`}>
                          Trvanie (min){" "}
                          <span className="font-normal text-zinc-500">
                            (voliteľné)
                          </span>
                        </Label>
                        <Input
                          id={`tl-dur-${bookingId}`}
                          type="number"
                          min={1}
                          max={1440}
                          value={form.durationMinutes}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              durationMinutes: e.target.value,
                            }))
                          }
                          placeholder="napr. 15"
                          className="h-10 rounded-xl"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                      <p className="text-[11px] text-amber-200/70 self-center">
                        Bod bez času — zaradí sa podľa poradia (šípky hore/dole).
                        Hodí sa na zmeny, prestávky, „po večeri“…
                      </p>
                      <div className="space-y-1.5">
                        <Label htmlFor={`tl-dur-${bookingId}`}>
                          Trvanie (min){" "}
                          <span className="font-normal text-zinc-500">
                            (voliteľné)
                          </span>
                        </Label>
                        <Input
                          id={`tl-dur-${bookingId}`}
                          type="number"
                          min={1}
                          max={1440}
                          value={form.durationMinutes}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              durationMinutes: e.target.value,
                            }))
                          }
                          placeholder="napr. 15"
                          className="h-10 rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label>Spôsob spustenia</Label>
                    <Select
                      value={form.startMode || "timed"}
                      onValueChange={(v) => {
                        if (!v) return;
                        const mode = v as TimelineStartMode;
                        setForm((f) => ({
                          ...f,
                          startMode: mode,
                          hasTime: mode === "timed" ? true : f.hasTime,
                          startDetail:
                            mode === "on_signal" || mode === "on_word"
                              ? f.startDetail
                              : "",
                        }));
                      }}
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl">
                        <SelectValue>
                          {(v) =>
                            getTimelineStartModeLabel(
                              (v as TimelineStartMode) || form.startMode || "timed"
                            ) ?? "Vyber spôsob"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {TIMELINE_START_MODES.map((m) => (
                          <SelectItem
                            key={m.value}
                            value={m.value}
                            label={m.label}
                          >
                            <span className="flex flex-col text-left">
                              <span>{m.label}</span>
                              <span className="text-[10px] text-zinc-500">
                                {m.hint}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {startModeMeta?.needsDetail ? (
                      <Input
                        value={form.startDetail}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            startDetail: e.target.value,
                          }))
                        }
                        placeholder={startModeMeta.detailPlaceholder}
                        className="mt-2 h-10 rounded-xl"
                        maxLength={300}
                        required
                      />
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`tl-notes-${bookingId}`}>
                      Poznámka pre účinkujúcich
                    </Label>
                    <Textarea
                      id={`tl-notes-${bookingId}`}
                      value={form.notes}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, notes: e.target.value }))
                      }
                      placeholder='napr. "Po príhovore otca hneď prvý tanec"'
                      className="min-h-[64px] rounded-xl"
                      maxLength={500}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="text-xs font-medium text-sky-300/90 hover:text-sky-200"
                  >
                    {showAdvanced
                      ? "Skryť detaily"
                      : "Skladba, technika…"}
                  </button>

                  {showAdvanced ? (
                    <div className="space-y-3 rounded-xl border border-white/8 bg-black/20 p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor={`tl-song-${bookingId}`}>
                            Skladba
                          </Label>
                          <Input
                            id={`tl-song-${bookingId}`}
                            value={form.songTitle}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                songTitle: e.target.value,
                              }))
                            }
                            placeholder="Názov piesne"
                            className="h-10 rounded-xl"
                            maxLength={160}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`tl-artist-${bookingId}`}>
                            Interpret
                          </Label>
                          <Input
                            id={`tl-artist-${bookingId}`}
                            value={form.songArtist}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                songArtist: e.target.value,
                              }))
                            }
                            placeholder="Interpret"
                            className="h-10 rounded-xl"
                            maxLength={160}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`tl-tech-${bookingId}`}>
                          Technika a rekvizity{" "}
                          <span className="font-normal text-zinc-500">
                            (voliteľné)
                          </span>
                        </Label>
                        <Textarea
                          id={`tl-tech-${bookingId}`}
                          value={form.techNotes}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              techNotes: e.target.value,
                            }))
                          }
                          placeholder="napr. pripraviť mikrofon · prskavky · stíšiť pri príhovore"
                          className="min-h-[64px] rounded-xl"
                          maxLength={500}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="gap-1.5 rounded-full"
                    >
                      {submitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : editingId ? (
                        <Pencil className="size-4" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                      {editingId ? "Uložiť zmeny" : "Pridať bod"}
                    </Button>
                    {editingId ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelEdit}
                        className="gap-1.5 rounded-full"
                      >
                        <X className="size-4" />
                        Zrušiť
                      </Button>
                    ) : null}
                  </div>
                </form>
              )}

              {sorted.length === 0 ? (
                <p className="px-1 py-3 text-xs text-zinc-500">
                  Zatiaľ žiadne body. Pridaj napr. prípravu, nástup, tanečné
                  kolo, vystúpenie, show alebo prestávku.
                </p>
              ) : (
                <ol className="relative space-y-0 border-l border-white/10 pl-4">
                  {sorted.map((item, index) => {
                    const busy = busyId === item.id;
                    const isEditing = editingId === item.id;
                    const meta = getTimelineTypeMeta(item.item_type);
                    const timeLabel = formatTimelineTimeRange(
                      item.event_time,
                      item.end_time
                    );
                    const startLabel = getTimelineStartModeLabel(item.start_mode);

                    return (
                      <li
                        key={item.id}
                        className={cn(
                          "relative pb-3.5 last:pb-0",
                          isEditing && "opacity-55"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute -left-[21px] top-2 size-2.5 rounded-full border-2 bg-[#0A0A0A]",
                            item.is_critical
                              ? "border-rose-400"
                              : item.item_type === "changeover" ||
                                  item.item_type === "break"
                                ? "border-amber-400"
                                : "border-sky-400/80"
                          )}
                        />
                        <div
                          className={cn(
                            "rounded-xl border px-3 py-2.5",
                            typeAccent(item.item_type),
                            item.is_done && "opacity-50"
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            {mode === "dj" ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleToggleDone(item)}
                                className={cn(
                                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                                  item.is_done
                                    ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                                    : "border-white/15 bg-black/20 text-transparent hover:border-sky-400/40"
                                )}
                                title={
                                  item.is_done
                                    ? "Hotové"
                                    : "Označiť ako hotové"
                                }
                              >
                                {busy ? (
                                  <Loader2 className="size-3 animate-spin text-zinc-400" />
                                ) : (
                                  <Check className="size-3" />
                                )}
                              </button>
                            ) : null}

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-300">
                                  {meta.label}
                                </span>
                                {item.is_critical ? (
                                  <span className="rounded-md border border-rose-500/40 bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-200">
                                    Kritické
                                  </span>
                                ) : null}
                                {startLabel ? (
                                  <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-200">
                                    {startLabel}
                                  </span>
                                ) : null}
                                {item.duration_minutes ? (
                                  <span className="text-[10px] text-zinc-500">
                                    ~{item.duration_minutes} min
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-1.5 flex items-start gap-3">
                                <div className="min-w-[58px] shrink-0">
                                  {timeLabel ? (
                                    <p className="text-sm font-semibold tabular-nums text-sky-200">
                                      {timeLabel}
                                    </p>
                                  ) : (
                                    <p className="text-[11px] font-medium text-amber-200/80">
                                      bez času
                                    </p>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={cn(
                                      "text-sm font-medium text-white",
                                      item.is_done &&
                                        "line-through decoration-white/40"
                                    )}
                                  >
                                    {item.title}
                                  </p>
                                  {item.start_detail ? (
                                    <p className="mt-1 text-[11px] leading-relaxed text-emerald-200/80">
                                      {item.start_mode === "on_word"
                                        ? `Slovo: „${item.start_detail}"`
                                        : `Znamenie: ${item.start_detail}`}
                                    </p>
                                  ) : null}
                                  {item.song_title ? (
                                    <p className="mt-1 flex items-start gap-1.5 text-xs text-fuchsia-200/90">
                                      <Music2 className="mt-0.5 size-3 shrink-0" />
                                      <span>
                                        {item.song_title}
                                        {item.song_artist
                                          ? ` — ${item.song_artist}`
                                          : ""}
                                      </span>
                                    </p>
                                  ) : null}
                                  {item.notes ? (
                                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                                      {item.notes}
                                    </p>
                                  ) : null}
                                  {item.tech_notes ? (
                                    <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-200/75">
                                      <Wrench className="mt-0.5 size-3 shrink-0" />
                                      {item.tech_notes}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {mode === "client" ? (
                              <div className="flex shrink-0 flex-col items-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={busy || submitting || index === 0}
                                  onClick={() => handleMove(item.id, "up")}
                                  className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-sky-300 disabled:opacity-30"
                                  title="Posunúť hore"
                                >
                                  <ArrowUp className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    busy ||
                                    submitting ||
                                    index === sorted.length - 1
                                  }
                                  onClick={() => handleMove(item.id, "down")}
                                  className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-sky-300 disabled:opacity-30"
                                  title="Posunúť dole"
                                >
                                  <ArrowDown className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={busy || submitting}
                                  onClick={() => startEdit(item)}
                                  className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-sky-300"
                                  title="Upraviť"
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={busy || submitting}
                                  onClick={() => handleDelete(item.id)}
                                  className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-red-300"
                                  title="Odstrániť"
                                >
                                  {busy ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="size-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
