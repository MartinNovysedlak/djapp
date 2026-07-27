"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import {
  getRequirementTemplate,
  updateRequirementTemplate,
} from "@/app/actions/requirement-templates";
import {
  RequirementsItemsEditor,
  toDraftItems,
  toPersistItems,
  type DraftRequirementItem,
} from "@/components/tech/RequirementsItemsEditor";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";

type Props = {
  templateId: string;
};

export function RequirementTemplateEditor({ templateId }: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<DraftRequirementItem[]>([]);
  const [isDefault, setIsDefault] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getRequirementTemplate(templateId);
    setLoading(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setName(result.template.name);
    setDescription(result.template.description ?? "");
    setItems(toDraftItems(result.template.items));
    setIsDefault(result.template.is_default);
  }, [templateId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const result = await updateRequirementTemplate({
      templateId,
      name,
      description,
      items: toPersistItems(items),
    });
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Šablóna uložená.", "success");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/requirement-templates"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "rounded-full"
          )}
        >
          <ArrowLeft className="size-4" />
          Späť
        </Link>
        {isDefault ? (
          <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-300">
            Predvolená
          </span>
        ) : null}
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Editor šablóny
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Checklist, ktorý môžeš pri rezervácii poslať klientovi jedným klikom.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="meta-name">Názov šablóny</Label>
          <Input
            id="meta-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 rounded-xl"
            maxLength={120}
            required
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
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-4">
        <div>
          <p className="text-sm font-medium text-white">Položky checklistu</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Pridaj / odober položky a voliteľne doplň poznámky.
          </p>
        </div>
        <RequirementsItemsEditor items={items} onChange={setItems} />
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
        Uložiť šablónu
      </Button>
    </form>
  );
}
