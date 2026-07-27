"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  addProgramTemplateItem,
  deleteProgramTemplateItem,
  getProgramTemplate,
  moveProgramTemplateItem,
  updateProgramTemplate,
  updateProgramTemplateItem,
  type ProgramTemplate,
  type ProgramTemplateItem,
} from "@/app/actions/program-templates";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";
import {
  getTimelineTypeMeta,
  TIMELINE_ITEM_TYPES,
  TIMELINE_START_MODES,
  type TimelineItemType,
  type TimelineStartMode,
} from "@/lib/timeline/types";

type FormState = {
  itemType: TimelineItemType;
  title: string;
  notes: string;
  durationMinutes: string;
  defaultOffsetMinutes: string;
  startMode: TimelineStartMode | "";
  startDetail: string;
  isCritical: boolean;
  songTitle: string;
  songArtist: string;
};

const EMPTY_FORM: FormState = {
  itemType: "entrance",
  title: "Nástup novomanželov",
  notes: "",
  durationMinutes: "",
  defaultOffsetMinutes: "",
  startMode: "timed",
  startDetail: "",
  isCritical: false,
  songTitle: "",
  songArtist: "",
};

type Props = { templateId: string };

export function ProgramTemplateEditor({ templateId }: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<ProgramTemplate | null>(null);
  const [items, setItems] = useState<ProgramTemplateItem[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getProgramTemplate(templateId);
    setLoading(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setTemplate(result.template);
    setItems(result.items);
    setName(result.template.name);
    setDescription(result.template.description ?? "");
  }, [templateId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyType(type: TimelineItemType) {
    const meta = getTimelineTypeMeta(type);
    setForm((f) => ({
      ...f,
      itemType: type,
      title: f.title.trim() ? f.title : meta.defaultTitle,
    }));
  }

  function startEdit(item: ProgramTemplateItem) {
    setEditingId(item.id);
    setForm({
      itemType: item.item_type,
      title: item.title,
      notes: item.notes ?? "",
      durationMinutes:
        item.duration_minutes != null ? String(item.duration_minutes) : "",
      defaultOffsetMinutes:
        item.default_offset_minutes != null
          ? String(item.default_offset_minutes)
          : "",
      startMode: item.start_mode ?? "",
      startDetail: item.start_detail ?? "",
      isCritical: item.is_critical,
      songTitle: item.song_title ?? "",
      songArtist: item.song_artist ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function saveMeta() {
    if (savingMeta || !template) return;
    setSavingMeta(true);
    const result = await updateProgramTemplate({
      templateId: template.id,
      name,
      description,
    });
    setSavingMeta(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setTemplate(result.template);
    showToast("Šablóna uložená.", "success");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const payload = {
      itemType: form.itemType,
      title: form.title,
      notes: form.notes,
      durationMinutes: form.durationMinutes
        ? Number(form.durationMinutes)
        : null,
      defaultOffsetMinutes: form.defaultOffsetMinutes
        ? Number(form.defaultOffsetMinutes)
        : null,
      startMode: (form.startMode || null) as TimelineStartMode | null,
      startDetail: form.startDetail,
      isCritical: form.isCritical,
      songTitle: form.songTitle,
      songArtist: form.songArtist,
    };

    if (editingId) {
      const result = await updateProgramTemplateItem({
        itemId: editingId,
        ...payload,
      });
      setSubmitting(false);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setItems((prev) =>
        prev.map((i) => (i.id === editingId ? result.item! : i))
      );
      cancelEdit();
      showToast("Bod upravený.", "success");
      return;
    }

    const result = await addProgramTemplateItem({
      templateId,
      ...payload,
    });
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setItems((prev) => [...prev, result.item]);
    setForm((f) => ({
      ...EMPTY_FORM,
      itemType: f.itemType,
      startMode: f.startMode,
    }));
    showToast("Bod pridaný.", "success");
  }

  async function handleDelete(itemId: string) {
    setBusyId(itemId);
    const result = await deleteProgramTemplateItem(itemId);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    if (editingId === itemId) cancelEdit();
    showToast("Bod odstránený.", "success");
  }

  async function handleMove(itemId: string, direction: "up" | "down") {
    setBusyId(itemId);
    const result = await moveProgramTemplateItem(itemId, direction);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setItems(result.items);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="py-16 text-center text-sm text-zinc-500">
        Šablóna sa nenašla.{" "}
        <Link
          href="/dashboard/program-templates"
          className="text-violet-300 underline"
        >
          Späť
        </Link>
      </div>
    );
  }

  const typeMeta = getTimelineTypeMeta(form.itemType);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/program-templates"
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "gap-1.5 rounded-full"
          )}
        >
          <ArrowLeft className="size-3.5" />
          Šablóny
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-white">
            Editor šablóny
          </h1>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="meta-name">Názov šablóny</Label>
          <Input
            id="meta-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 rounded-xl"
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meta-desc">Popis</Label>
          <Textarea
            id="meta-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[70px] rounded-xl"
            maxLength={400}
          />
        </div>
        <Button
          type="button"
          onClick={() => void saveMeta()}
          disabled={savingMeta}
          className="rounded-full"
        >
          {savingMeta ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Uložiť názov"
          )}
        </Button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4"
      >
        <p className="text-sm font-medium text-white">
          {editingId ? "Upraviť bod" : "Pridať bod"}
        </p>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Offset = minúty od začiatku akcie (napr. 0 = začiatok, 90 = po 1,5 h).
          Pri použití šablóny sa časy dopočítajú zo skutočného začiatku.
        </p>

        <div className="space-y-1.5">
          <Label>Typ</Label>
          <Select
            value={form.itemType}
            onValueChange={(v) => {
              if (v) applyType(v as TimelineItemType);
            }}
          >
            <SelectTrigger className="h-10 w-full rounded-xl">
              <SelectValue>
                {(v) =>
                  getTimelineTypeMeta((v as TimelineItemType) || form.itemType)
                    .label
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {TIMELINE_ITEM_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} label={t.label}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Názov</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder={typeMeta.defaultTitle || "Názov bodu"}
            className="h-10 rounded-xl"
            maxLength={160}
            required
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Offset od začiatku (min)</Label>
            <Input
              type="number"
              min={0}
              max={4320}
              value={form.defaultOffsetMinutes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  defaultOffsetMinutes: e.target.value,
                }))
              }
              placeholder="napr. 120"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Trvanie (min)</Label>
            <Input
              type="number"
              min={1}
              max={1440}
              value={form.durationMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, durationMinutes: e.target.value }))
              }
              placeholder="napr. 15"
              className="h-10 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Spôsob spustenia</Label>
          <Select
            value={form.startMode || undefined}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                startMode: (v as TimelineStartMode) || "",
              }))
            }
          >
            <SelectTrigger className="h-10 w-full rounded-xl">
              <SelectValue placeholder="Voliteľné">
                {(v) =>
                  TIMELINE_START_MODES.find((m) => m.value === v)?.label ??
                  "Voliteľné"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TIMELINE_START_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value} label={m.label}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Skladba</Label>
            <Input
              value={form.songTitle}
              onChange={(e) =>
                setForm((f) => ({ ...f, songTitle: e.target.value }))
              }
              className="h-10 rounded-xl"
              maxLength={160}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Interpret</Label>
            <Input
              value={form.songArtist}
              onChange={(e) =>
                setForm((f) => ({ ...f, songArtist: e.target.value }))
              }
              className="h-10 rounded-xl"
              maxLength={160}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Poznámka</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="min-h-[70px] rounded-xl"
            maxLength={500}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={form.isCritical}
            onChange={(e) =>
              setForm((f) => ({ ...f, isCritical: e.target.checked }))
            }
            className="size-4 rounded border-white/20 bg-black/40"
          />
          Kritický moment
        </label>

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
            {editingId ? "Uložiť bod" : "Pridať bod"}
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

      <div className="space-y-2">
        <p className="text-sm font-medium text-white">
          Body šablóny ({items.length})
        </p>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-zinc-500">
            Pridaj body programu — príchod, prvý tanec, torta…
          </p>
        ) : (
          <ol className="space-y-2">
            {items.map((item, index) => {
              const busy = busyId === item.id;
              const meta = getTimelineTypeMeta(item.item_type);
              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-xl border border-white/10 bg-black/25 px-3 py-2.5",
                    editingId === item.id && "opacity-50"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] uppercase text-zinc-300">
                          {meta.label}
                        </span>
                        {item.default_offset_minutes != null ? (
                          <span className="text-[10px] text-sky-300">
                            +{item.default_offset_minutes} min
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500">
                            bez offsetu
                          </span>
                        )}
                        {item.duration_minutes ? (
                          <span className="text-[10px] text-zinc-500">
                            ~{item.duration_minutes} min
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-medium text-white">
                        {item.title}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        disabled={busy || index === 0}
                        onClick={() => void handleMove(item.id, "up")}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white disabled:opacity-30"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={busy || index === items.length - 1}
                        onClick={() => void handleMove(item.id, "down")}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white disabled:opacity-30"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEdit(item)}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDelete(item.id)}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-red-300"
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
