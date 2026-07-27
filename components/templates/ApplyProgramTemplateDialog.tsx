"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  applyProgramTemplateToBooking,
  listProgramTemplates,
  type ProgramTemplate,
} from "@/app/actions/program-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function ApplyProgramTemplateDialog({
  open,
  onOpenChange,
  bookingId,
  hasExistingItems,
  onApplied,
}: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<ProgramTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("16:00");
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await listProgramTemplates();
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setTemplates(result.templates);
      setSelectedId(result.templates[0]?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, showToast]);

  async function handleApply() {
    if (!selectedId || submitting) return;
    setSubmitting(true);
    const result = await applyProgramTemplateToBooking({
      bookingId,
      templateId: selectedId,
      eventStartTime: startTime,
      replaceExisting: hasExistingItems ? replaceExisting : true,
    });
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast(`Program vytvorený (${result.inserted} bodov).`, "success");
    onOpenChange(false);
    onApplied();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-white/10 bg-[#0A0A0A] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Program zo šablóny</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Vyber šablónu a čas začiatku akcie. Časy bodov sa dopočítajú z
            offsetov — potom ich môžeš ľubovoľne upraviť.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-violet-400" />
          </div>
        ) : templates.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            Nemáš žiadnu šablónu. Vytvor ju v sekcii „Šablóny programu“.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Šablóna</Label>
              <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                {templates.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={cn(
                        "flex w-full flex-col rounded-xl border px-3 py-2.5 text-left transition-colors",
                        selectedId === t.id
                          ? "border-violet-500/40 bg-violet-500/15"
                          : "border-white/10 bg-black/30 hover:border-white/20"
                      )}
                    >
                      <span className="text-sm font-medium text-white">
                        {t.name}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {t.item_count ?? 0} bodov
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-start">Čas začiatku akcie</Label>
              <Input
                id="event-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-10 rounded-xl"
                required
              />
            </div>

            {hasExistingItems ? (
              <label className="flex cursor-pointer items-start gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-white/20 bg-black/40"
                />
                <span>
                  Nahradiť existujúci program (inak sa body pridajú na koniec)
                </span>
              </label>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-full"
          >
            Zrušiť
          </Button>
          <Button
            type="button"
            disabled={!selectedId || submitting || templates.length === 0}
            onClick={() => void handleApply()}
            className="rounded-full"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Vytvoriť program"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
