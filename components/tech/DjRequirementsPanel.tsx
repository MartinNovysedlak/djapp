"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronDown, Loader2, Save, Speaker } from "lucide-react";
import {
  getDjRequirements,
  upsertDjRequirements,
} from "@/app/actions/tech";
import { ApplyRequirementTemplateDialog } from "@/components/templates/ApplyRequirementTemplateDialog";
import {
  RequirementsItemsEditor,
  toDraftItems,
  toPersistItems,
  type DraftRequirementItem,
} from "@/components/tech/RequirementsItemsEditor";
import { Button } from "@/components/ui/button";
import {
  formatRequirementItemSummary,
  type DjRequirements,
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
  if (data.items.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        Požiadavky zatiaľ nie sú vyplnené.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {data.items.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200"
        >
          {formatRequirementItemSummary(item)}
        </li>
      ))}
    </ul>
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
  const [templateOpen, setTemplateOpen] = useState(false);

  const [items, setItems] = useState<DraftRequirementItem[]>([]);
  const [visible, setVisible] = useState(true);

  const applyData = useCallback((r: DjRequirements | null) => {
    setData(r);
    setItems(toDraftItems(r?.items ?? []));
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
      items: toPersistItems(items),
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
                ? "Checklist ozvučenia a setupu"
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
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="max-w-md text-[11px] leading-relaxed text-zinc-500">
                  Pridaj položky zo zoznamu. Poznámka je voliteľná. Šablónu môžeš
                  upraviť v{" "}
                  <Link
                    href="/dashboard/requirement-templates"
                    className="text-violet-300 underline-offset-2 hover:underline"
                  >
                    Šablónach požiadaviek
                  </Link>
                  .
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setTemplateOpen(true)}
                >
                  Zo šablóny
                </Button>
              </div>

              <RequirementsItemsEditor items={items} onChange={setItems} />

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

      {mode === "dj" ? (
        <ApplyRequirementTemplateDialog
          open={templateOpen}
          onOpenChange={setTemplateOpen}
          bookingId={bookingId}
          hasExistingItems={items.length > 0}
          onApplied={() => {
            setLoaded(false);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
