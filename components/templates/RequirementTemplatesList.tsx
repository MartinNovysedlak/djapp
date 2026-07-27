"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Loader2,
  Pencil,
  Plus,
  Speaker,
  Star,
  Trash2,
} from "lucide-react";
import {
  createRequirementTemplate,
  deleteRequirementTemplate,
  duplicateRequirementTemplate,
  listRequirementTemplates,
  setDefaultRequirementTemplate,
  type RequirementTemplate,
} from "@/app/actions/requirement-templates";
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

export function RequirementTemplatesList() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<RequirementTemplate[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [useDefaultItems, setUseDefaultItems] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listRequirementTemplates();
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
    const result = await createRequirementTemplate({
      name,
      description,
      useDefaultItems,
    });
    setBusy(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setCreateOpen(false);
    setName("");
    setDescription("");
    setUseDefaultItems(true);
    showToast("Šablóna vytvorená.", "success");
    router.push(`/dashboard/requirement-templates/${result.template.id}`);
  }

  async function handleDuplicate(id: string) {
    setBusyId(id);
    const result = await duplicateRequirementTemplate(id);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Šablóna skopírovaná.", "success");
    await load();
  }

  async function handleSetDefault(id: string) {
    setBusyId(id);
    const result = await setDefaultRequirementTemplate(id);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Predvolená šablóna nastavená.", "success");
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Naozaj zmazať túto šablónu?")) return;
    setBusyId(id);
    const result = await deleteRequirementTemplate(id);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Šablóna zmazaná.", "success");
    await load();
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
              Šablóny požiadaviek
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-zinc-400">
              Ulož checklist, ktorý vždy posielaš klientovi — ozvučenie, stôl,
              prúd a ďalšie. Pri rezervácii ho len použiješ.
            </p>
          </div>
          <Button
            type="button"
            className="gap-1.5 rounded-full"
            onClick={() => setCreateOpen(true)}
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
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-12 text-center">
          <Speaker className="mx-auto size-8 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">
            Zatiaľ nemáš žiadnu šablónu.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  {t.is_default ? (
                    <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-300">
                      Predvolená
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {t.items.length} položiek
                  {t.description ? ` · ${t.description}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {!t.is_default ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    disabled={busyId === t.id}
                    onClick={() => void handleSetDefault(t.id)}
                  >
                    <Star className="size-3.5" />
                    Predvolená
                  </Button>
                ) : null}
                <Link
                  href={`/dashboard/requirement-templates/${t.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "rounded-full"
                  )}
                >
                  <Pencil className="size-3.5" />
                  Upraviť
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  disabled={busyId === t.id}
                  onClick={() => void handleDuplicate(t.id)}
                >
                  <Copy className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-red-300 hover:text-red-200"
                  disabled={busyId === t.id}
                  onClick={() => void handleDelete(t.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl border-white/10 bg-[#0A0A0A]">
          <DialogHeader>
            <DialogTitle>Nová šablóna požiadaviek</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="req-tpl-name">Názov</Label>
              <Input
                id="req-tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="napr. Svadba štandard"
                className="h-10 rounded-xl"
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-tpl-desc">Popis (voliteľné)</Label>
              <Textarea
                id="req-tpl-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[70px] rounded-xl"
                maxLength={400}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={useDefaultItems}
                onChange={(e) => setUseDefaultItems(e.target.checked)}
                className="size-4 rounded border-white/20 bg-black/40"
              />
              Predvyplniť štandardným checklistom
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setCreateOpen(false)}
              >
                Zrušiť
              </Button>
              <Button type="submit" disabled={busy} className="rounded-full">
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Vytvoriť"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
