"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  ListMusic,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  createProgramTemplate,
  deleteProgramTemplate,
  duplicateProgramTemplate,
  listProgramTemplates,
  type ProgramTemplate,
} from "@/app/actions/program-templates";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Reveal } from "@/components/motion";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";

export function ProgramTemplatesList() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<ProgramTemplate[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listProgramTemplates();
    setLoading(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setTemplates(result.templates);
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await createProgramTemplate({ name, description });
    setBusy(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setCreateOpen(false);
    setName("");
    setDescription("");
    showToast("Šablóna vytvorená.", "success");
    router.push(`/dashboard/program-templates/${result.template.id}`);
  }

  async function handleDuplicate(id: string) {
    setBusyId(id);
    const result = await duplicateProgramTemplate(id);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Šablóna skopírovaná.", "success");
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Naozaj zmazať túto šablónu?")) return;
    setBusyId(id);
    const result = await deleteProgramTemplate(id);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Šablóna zmazaná.", "success");
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Príprava
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Moje šablóny programu
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-zinc-400">
              Ulož si štandardnú svadbu alebo firemnú akciu a pri rezervácii ju
              len uprav — bez stavby programu od nuly.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="gap-1.5 rounded-full"
          >
            <Plus className="size-4" />
            Nová šablóna
          </Button>
        </div>
      </Reveal>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-violet-400" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/25 px-6 py-12 text-center">
          <ListMusic className="mx-auto size-8 text-zinc-500" />
          <p className="mt-3 text-sm font-medium text-white">
            Zatiaľ žiadne šablóny
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Vytvor napr. „Moja štandardná svadba“ s príchodom, prvým tancom a
            tortou.
          </p>
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-5 gap-1.5 rounded-full"
          >
            <Plus className="size-4" />
            Vytvoriť prvú šablónu
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {templates.map((t) => {
            const isBusy = busyId === t.id;
            return (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/10">
                  <ListMusic className="size-4 text-sky-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {t.name}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {t.item_count ?? 0}{" "}
                    {(t.item_count ?? 0) === 1
                      ? "bod"
                      : (t.item_count ?? 0) < 5
                        ? "body"
                        : "bodov"}
                    {t.description ? ` · ${t.description}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Link
                    href={`/dashboard/program-templates/${t.id}`}
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                      "gap-1.5 rounded-full"
                    )}
                  >
                    <Pencil className="size-3.5" />
                    Upraviť
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => void handleDuplicate(t.id)}
                    className="gap-1.5 rounded-full"
                  >
                    {isBusy ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    Duplikovať
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => void handleDelete(t.id)}
                    className="gap-1.5 rounded-full text-red-300 hover:text-red-200"
                  >
                    <Trash2 className="size-3.5" />
                    Zmazať
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl border-white/10 bg-[#0A0A0A] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nová šablóna programu</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Názov</Label>
              <Input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="napr. Moja štandardná svadba"
                className="h-10 rounded-xl"
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc">
                Popis{" "}
                <span className="font-normal text-zinc-500">(voliteľné)</span>
              </Label>
              <Textarea
                id="tpl-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Krátka poznámka k použitiu…"
                className="min-h-[80px] rounded-xl"
                maxLength={400}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="rounded-full"
              >
                Zrušiť
              </Button>
              <Button type="submit" disabled={busy} className="rounded-full">
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Vytvoriť"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
