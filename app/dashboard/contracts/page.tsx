"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CircleHelp,
  FileSignature,
  FileText,
  Loader2,
  Pencil,
  Receipt,
  Trash2,
  Upload,
  Variable,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Reveal } from "@/components/motion";
import { useDashboardUser } from "@/components/DashboardUserContext";
import { useToast } from "@/lib/toast-context";
import {
  deleteContractTemplate,
  listContractTemplates,
} from "@/app/actions/contracts";
import {
  deleteInvoiceTemplate,
  listInvoiceTemplates,
} from "@/app/actions/invoices";

type TemplateKind = "contract" | "invoice";

type UnifiedTemplate = {
  kind: TemplateKind;
  id: string;
  template_name: string;
  created_at: string;
  placeholder_count: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const KIND_META: Record<
  TemplateKind,
  {
    label: string;
    editHref: (id: string) => string;
    uploadUrl: string;
    icon: typeof FileSignature;
    badgeClass: string;
  }
> = {
  contract: {
    label: "Zmluva",
    editHref: (id) => `/dashboard/contracts/edit/${id}`,
    uploadUrl: "/api/contracts/upload",
    icon: FileSignature,
    badgeClass: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  },
  invoice: {
    label: "Faktúra",
    editHref: (id) => `/dashboard/invoices/edit/${id}`,
    uploadUrl: "/api/invoices/upload",
    icon: Receipt,
    badgeClass: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
  },
};

export default function ContractsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { loading: userLoading } = useDashboardUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingKindRef = useRef<TemplateKind>("contract");

  const [templates, setTemplates] = useState<UnifiedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [kindDialogOpen, setKindDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UnifiedTemplate | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [contracts, invoices] = await Promise.all([
      listContractTemplates(),
      listInvoiceTemplates(),
    ]);

    const merged: UnifiedTemplate[] = [];
    if (contracts.ok) {
      merged.push(
        ...contracts.templates.map((t) => ({
          kind: "contract" as const,
          id: t.id,
          template_name: t.template_name,
          created_at: t.created_at,
          placeholder_count: t.placeholder_count,
        }))
      );
    } else {
      showToast(contracts.error ?? "Šablóny zmlúv sa nepodarilo načítať.", "error");
    }
    if (invoices.ok) {
      merged.push(
        ...invoices.templates.map((t) => ({
          kind: "invoice" as const,
          id: t.id,
          template_name: t.template_name,
          created_at: t.created_at,
          placeholder_count: t.placeholder_count,
        }))
      );
    } else {
      showToast(invoices.error ?? "Šablóny faktúr sa nepodarilo načítať.", "error");
    }

    merged.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setTemplates(merged);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openUploadFor(kind: TemplateKind) {
    pendingKindRef.current = kind;
    setKindDialogOpen(false);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const kind = pendingKindRef.current;
    const meta = KIND_META[kind];

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("templateName", file.name.replace(/\.docx$/i, ""));

      const res = await fetch(meta.uploadUrl, {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        template?: { id: string };
        error?: string;
      };

      if (!res.ok || !data.template?.id) {
        showToast(data.error ?? "Šablónu sa nepodarilo nahrať.", "error");
        return;
      }

      showToast("Šablóna nahraná — teraz doplň premenné v editore.", "success");
      router.push(meta.editHref(data.template.id));
    } catch {
      showToast("Šablónu sa nepodarilo nahrať.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setTemplates((prev) => prev.filter((t) => t.id !== target.id));

    const result =
      target.kind === "contract"
        ? await deleteContractTemplate(target.id)
        : await deleteInvoiceTemplate(target.id);

    if (!result.ok) {
      showToast(result.error ?? "Šablónu sa nepodarilo odstrániť.", "error");
      void refresh();
      return;
    }
    showToast("Šablóna odstránená.", "success");
  }

  if (userLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-white/5" />
        <div className="h-4 w-72 rounded-lg bg-white/[0.04]" />
        <div className="mt-6 h-40 rounded-3xl bg-white/[0.03]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Reveal>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Šablóny
              </h1>
              <Link
                href="/dashboard/contracts/tutorial"
                className="inline-flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-violet-300"
              >
                <CircleHelp className="size-3.5" />
                Ako to funguje?
              </Link>
            </div>
            <p className="mt-1.5 text-sm text-zinc-500">
              Nahraj Word šablónu (.docx) pre zmluvu alebo faktúru a polia
              doplníš ťahaním v editore. Hotové PDF generuješ v{" "}
              <Link
                href="/dashboard/contracts/generate"
                className="text-violet-300 hover:text-violet-200"
              >
                PDF zmluvy
              </Link>{" "}
              alebo{" "}
              <Link
                href="/dashboard/invoices/generate"
                className="text-violet-300 hover:text-violet-200"
              >
                PDF faktúry
              </Link>
              .
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setKindDialogOpen(true)}
            disabled={uploading}
            className="gap-1.5 self-start rounded-full"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Nahrať šablónu
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </Reveal>

      <Reveal delay={80}>
        {templates.length === 0 ? (
          <div className="rounded-[2rem] border border-white/8 bg-card/40 px-6 py-14 text-center">
            <FileText className="mx-auto size-8 text-zinc-600" />
            <h3 className="mt-4 text-lg font-semibold text-white">
              Ešte nemáš žiadnu šablónu
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
              Nahraj akýkoľvek Word dokument (.docx) — premenné v tvare{" "}
              {"{{premenna}}"} doplníš potom priamo v editore šablóny.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => {
              const meta = KIND_META[template.kind];
              const Icon = meta.icon;
              return (
                <article
                  key={`${template.kind}:${template.id}`}
                  className="card-lift flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-card/70 p-5 backdrop-blur-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/10">
                      <Icon className="size-5 text-violet-300" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">
                          {template.template_name}
                        </p>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            meta.badgeClass
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1">
                          <Variable className="size-3" />
                          {template.placeholder_count} premenných
                        </span>
                        <span>Nahraná {formatDate(template.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={meta.editHref(template.id)}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "gap-1.5 rounded-full"
                      )}
                    >
                      <Pencil className="size-3.5" />
                      Upraviť mapovanie
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="rounded-full border-red-500/30 text-red-300 hover:bg-red-500/10"
                      onClick={() => setDeleteTarget(template)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Reveal>

      <Dialog open={kindDialogOpen} onOpenChange={setKindDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aký typ šablóny nahrávaš?</DialogTitle>
            <DialogDescription>
              Zmluvy a faktúry majú vlastné premenné a vlastné úložisko
              vygenerovaných PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => openUploadFor("contract")}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center transition-colors hover:border-violet-500/40 hover:bg-violet-500/10"
            >
              <FileSignature className="size-7 text-violet-300" />
              <span className="text-sm font-semibold text-white">Zmluva</span>
              <span className="text-xs text-zinc-500">
                Podpisovanie, vyplnenie zákazníkom
              </span>
            </button>
            <button
              type="button"
              onClick={() => openUploadFor("invoice")}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center transition-colors hover:border-fuchsia-500/40 hover:bg-fuchsia-500/10"
            >
              <Receipt className="size-7 text-fuchsia-300" />
              <span className="text-sm font-semibold text-white">Faktúra</span>
              <span className="text-xs text-zinc-500">
                Odberateľ, ceny, splatnosť — tvoje IČO/IBAN napíš do Wordu
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odstrániť šablónu?</DialogTitle>
            <DialogDescription>
              „{deleteTarget?.template_name}“ sa natrvalo odstráni. Túto akciu
              nemožno vrátiť späť.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="gap-2 rounded-full"
            >
              <Trash2 className="size-4" />
              Odstrániť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
