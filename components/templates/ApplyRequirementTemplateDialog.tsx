"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  applyRequirementTemplateToBooking,
  listRequirementTemplates,
  type RequirementTemplate,
} from "@/app/actions/requirement-templates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  hasExistingItems: boolean;
  onApplied: () => void;
};

export function ApplyRequirementTemplateDialog({
  open,
  onOpenChange,
  bookingId,
  hasExistingItems,
  onApplied,
}: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<RequirementTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await listRequirementTemplates();
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setTemplates(result.templates);
      const preferred =
        result.templates.find((t) => t.is_default) ?? result.templates[0];
      setSelectedId(preferred?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, showToast]);

  async function handleApply() {
    if (!selectedId || submitting) return;
    setSubmitting(true);
    const result = await applyRequirementTemplateToBooking({
      bookingId,
      templateId: selectedId,
      replaceExisting: hasExistingItems ? replaceExisting : true,
    });
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast(`Požiadavky načítané (${result.itemCount}).`, "success");
    onOpenChange(false);
    onApplied();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-white/10 bg-[#0A0A0A] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Požiadavky zo šablóny</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Vyber checklist, ktorý vždy posielaš klientovi. Potom ho môžeš ešte
            upraviť.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-violet-400" />
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Nemáš žiadnu šablónu. Vytvor ju v{" "}
            <Link
              href="/dashboard/requirement-templates"
              className="text-violet-300 underline-offset-2 hover:underline"
            >
              Šablónach požiadaviek
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-3">
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                      selectedId === t.id
                        ? "border-violet-400/50 bg-violet-500/10"
                        : "border-white/10 bg-black/30 hover:bg-white/[0.03]"
                    )}
                  >
                    <p className="text-sm font-medium text-white">
                      {t.name}
                      {t.is_default ? (
                        <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-violet-300">
                          Predvolená
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {t.items.length} položiek
                      {t.description ? ` · ${t.description}` : ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>

            {hasExistingItems ? (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="size-4 rounded border-white/20 bg-black/40"
                />
                Nahradiť aktuálne požiadavky
              </label>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Zrušiť
          </Button>
          <Button
            type="button"
            className="rounded-full"
            disabled={!selectedId || submitting || templates.length === 0}
            onClick={() => void handleApply()}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Použiť"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
