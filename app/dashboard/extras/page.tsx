"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteDjExtra,
  listDjExtras,
  saveDjExtra,
} from "@/app/actions/extras";
import { ExtraIcon } from "@/components/extras/ExtraIcon";
import { Reveal } from "@/components/motion";
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
  EXTRA_ICON_OPTIONS,
  type DjExtra,
} from "@/lib/extras/types";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";

type FormState = {
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
  isActive: boolean;
};

const EMPTY: FormState = {
  title: "",
  description: "",
  icon: "sparkles",
  imageUrl: "",
  isActive: true,
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export default function DjExtrasPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [extras, setExtras] = useState<DjExtra[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listDjExtras();
    if (!result.ok) {
      showToast(result.error, "error");
      setLoading(false);
      return;
    }
    setExtras(result.extras);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(extra: DjExtra) {
    setEditingId(extra.id);
    setForm({
      title: extra.title,
      description: extra.description ?? "",
      icon: extra.icon || "sparkles",
      imageUrl: extra.image_url ?? "",
      isActive: extra.is_active,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setDragOver(false);
  }

  async function uploadImage(file: File) {
    if (
      !ACCEPT.split(",").includes(file.type) &&
      !file.type.startsWith("image/")
    ) {
      showToast("Nahraj JPG, PNG, WebP alebo GIF.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Súbor je príliš veľký (max 5 MB).", "error");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-extra-image", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error || "Upload zlyhal.");
      }
      setForm((f) => ({ ...f, imageUrl: json.url! }));
      showToast("Fotka nahraná.", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload zlyhal.";
      showToast(message, "error");
    } finally {
      setUploading(false);
    }
  }

  function handleFilePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadImage(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadImage(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || uploading) return;
    setSubmitting(true);
    const result = await saveDjExtra({
      id: editingId ?? undefined,
      title: form.title,
      description: form.description,
      icon: form.icon,
      imageUrl: form.imageUrl,
      isActive: form.isActive,
    });
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setExtras((prev) => {
      const idx = prev.findIndex((x) => x.id === result.extra.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = result.extra;
        return next;
      }
      return [...prev, result.extra];
    });
    cancelEdit();
    showToast(editingId ? "Položka upravená." : "Položka pridaná.", "success");
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const result = await deleteDjExtra(id);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setExtras((prev) => prev.filter((x) => x.id !== id));
    if (editingId === id) cancelEdit();
    showToast("Položka zmazaná.", "success");
  }

  return (
    <div className="mx-auto max-w-3xl pt-4">
      <Reveal>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Ponuka špeciálnych vecí
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Tu si pripravíš, čo navyše vieš klientovi ponúknuť — napríklad
            plazivý dym, fotobúdku, extra svetlá alebo iné detaily akcie. Klient
            si to pri potvrdenej rezervácii vyberie v sekcii{" "}
            <span className="text-zinc-200">Špeciálne požiadavky</span>. Cenu
            sem nedávaj — ide len o tvoju ponuku, čo vieš zabezpečiť.
          </p>
        </div>
      </Reveal>

      <Reveal delay={60}>
        <form
          onSubmit={handleSubmit}
          className="mb-6 space-y-4 rounded-3xl border border-white/10 bg-card/70 p-5 backdrop-blur-md md:p-6"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-fuchsia-300" />
            <h2 className="text-sm font-semibold text-white">
              {editingId ? "Upraviť položku" : "Nová položka ponuky"}
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="extra-title">Názov</Label>
              <Input
                id="extra-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder='napr. "Plazivý dym na prvý tanec"'
                className="h-10 rounded-xl"
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Ikona</Label>
              <Select
                value={form.icon}
                onValueChange={(v) =>
                  v && setForm((f) => ({ ...f, icon: v }))
                }
              >
                <SelectTrigger className="h-10 w-full rounded-xl">
                  <SelectValue>
                    {(v) =>
                      EXTRA_ICON_OPTIONS.find((i) => i.value === v)?.label ??
                      "Ikona"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EXTRA_ICON_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      label={opt.label}
                    >
                      <span className="flex items-center gap-2">
                        <ExtraIcon name={opt.value} className="size-3.5" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="extra-desc">
              Popis{" "}
              <span className="font-normal text-zinc-500">
                (čo klient dostane)
              </span>
            </Label>
            <Textarea
              id="extra-desc"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Stručne vysvetli, o čo ide a kedy sa to hodí…"
              className="min-h-[80px] rounded-xl"
              maxLength={400}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Fotka{" "}
              <span className="font-normal text-zinc-500">(voliteľné)</span>
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={handleFilePick}
            />

            {form.imageUrl ? (
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.imageUrl}
                  alt="Náhľad položky"
                  className="h-44 w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 py-3">
                  <p className="text-xs text-zinc-300">Fotka pripravená</p>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 rounded-full"
                    >
                      Zmeniť
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={uploading}
                      onClick={() =>
                        setForm((f) => ({ ...f, imageUrl: "" }))
                      }
                      className="h-8 rounded-full border-red-500/30 text-red-300 hover:bg-red-500/10"
                    >
                      Odstrániť
                    </Button>
                  </div>
                </div>
                {uploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="size-6 animate-spin text-fuchsia-300" />
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                }}
                onDrop={handleDrop}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center transition-colors",
                  dragOver
                    ? "border-fuchsia-400/60 bg-fuchsia-500/10"
                    : "border-white/15 bg-white/[0.02] hover:border-fuchsia-500/35 hover:bg-fuchsia-500/[0.04]",
                  uploading && "pointer-events-none opacity-70"
                )}
              >
                {uploading ? (
                  <Loader2 className="size-7 animate-spin text-fuchsia-300" />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10">
                    <ImagePlus className="size-5 text-fuchsia-300" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white">
                    {uploading
                      ? "Nahrávam…"
                      : dragOver
                        ? "Pusť fotku sem"
                        : "Pretiahni fotku sem"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    alebo klikni a vyber zo zariadenia · JPG, PNG, WebP · max 5 MB
                  </p>
                </div>
              </button>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.checked }))
              }
              className="size-3.5 rounded border-white/20"
            />
            Aktívna (viditeľná pre klientov)
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={submitting || uploading}
              className="gap-1.5 rounded-full"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : editingId ? (
                <Pencil className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {editingId ? "Uložiť zmeny" : "Pridať do ponuky"}
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
      </Reveal>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-fuchsia-400" />
        </div>
      ) : extras.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-card/50 px-6 py-14 text-center text-sm text-zinc-500">
          Zatiaľ nič v ponuke. Pridaj napríklad plazivý dym alebo nasvietenie —
          klient to uvidí pri potvrdenej rezervácii.
        </div>
      ) : (
        <div className="space-y-3">
          {extras.map((extra, i) => (
            <Reveal key={extra.id} delay={80 + i * 40}>
              <article
                className={cn(
                  "flex items-start gap-3 rounded-3xl border border-white/10 bg-card/70 p-4 backdrop-blur-md md:p-5",
                  !extra.is_active && "opacity-55"
                )}
              >
                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-fuchsia-500/10">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">
                      {extra.title}
                    </h3>
                    {!extra.is_active ? (
                      <span className="rounded-md border border-zinc-500/30 bg-zinc-500/10 px-1.5 py-0.5 text-[10px] text-zinc-400">
                        Neaktívna
                      </span>
                    ) : null}
                  </div>
                  {extra.description ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      {extra.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => startEdit(extra)}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-fuchsia-300"
                    title="Upraviť"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busyId === extra.id}
                    onClick={() => handleDelete(extra.id)}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-red-300"
                    title="Zmazať"
                  >
                    {busyId === extra.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
