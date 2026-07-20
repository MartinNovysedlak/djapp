"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Info, Loader2, Receipt, Save } from "lucide-react";
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
import { Reveal } from "@/components/motion";
import { useClientUser } from "@/components/ClientUserContext";
import { useToast } from "@/lib/toast-context";
import {
  getClientContractFillFields,
  getGeneratedContractDownloadUrl,
  listClientReceivedContracts,
  markClientContractsSeen,
  submitClientContractFill,
  type ClientFillField,
} from "@/app/actions/contracts";
import {
  getClientInvoiceFillFields,
  getGeneratedInvoiceDownloadUrl,
  listClientReceivedInvoices,
  markClientInvoicesSeen,
  submitClientInvoiceFill,
} from "@/app/actions/invoices";
import { mergeClientBillingFromFill } from "@/app/actions/client-profile";
import {
  CLIENT_BILLING_FIELD_LABELS,
  extractBillingFromValues,
  type ClientBillingFieldKey,
} from "@/lib/client-billing";
import type { GeneratedContractRow } from "@/lib/contracts/types";
import type { GeneratedInvoiceRow } from "@/lib/invoices/types";

type DocKind = "contract" | "invoice";

type UnifiedDoc = {
  kind: DocKind;
  id: string;
  title: string;
  sentAt: string;
  createdAt: string;
  status: "complete" | "pending_fill" | "filled";
  clientSeenAt: string | null;
  filledAt: string | null;
  clientValues: Record<string, string>;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toUnifiedContract(c: GeneratedContractRow): UnifiedDoc {
  return {
    kind: "contract",
    id: c.id,
    title: c.template_name || c.file_name,
    sentAt: c.sent_to_client_at ?? c.created_at,
    createdAt: c.created_at,
    status: c.status,
    clientSeenAt: c.client_seen_at,
    filledAt: c.filled_at,
    clientValues: c.client_values,
  };
}

function toUnifiedInvoice(i: GeneratedInvoiceRow): UnifiedDoc {
  return {
    kind: "invoice",
    id: i.id,
    title: i.template_name || i.file_name || `Faktúra ${i.invoice_number}`,
    sentAt: i.sent_to_client_at ?? i.created_at,
    createdAt: i.created_at,
    status: i.status,
    clientSeenAt: i.client_seen_at,
    filledAt: i.filled_at,
    clientValues: i.client_values,
  };
}

function isUnread(doc: UnifiedDoc) {
  return !doc.clientSeenAt;
}

function statusLabel(doc: UnifiedDoc) {
  if (doc.status === "pending_fill") return "Čaká na tvoje údaje";
  if (doc.status === "filled") return "Vyplnená";
  return null;
}

export default function ClientDocumentsPage() {
  const { loading: userLoading } = useClientUser();
  const { showToast } = useToast();
  const [docs, setDocs] = useState<UnifiedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fillOpenId, setFillOpenId] = useState<string | null>(null);
  const [fillKind, setFillKind] = useState<DocKind>("contract");
  const [fillFields, setFillFields] = useState<ClientFillField[]>([]);
  const [fillValues, setFillValues] = useState<Record<string, string>>({});
  const [fillLoading, setFillLoading] = useState(false);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [pendingBillingSave, setPendingBillingSave] = useState<Partial<
    Record<ClientBillingFieldKey, string>
  > | null>(null);
  const [savingBilling, setSavingBilling] = useState(false);

  const unreadCount = useMemo(() => docs.filter(isUnread).length, [docs]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [contracts, invoices] = await Promise.all([
      listClientReceivedContracts(),
      listClientReceivedInvoices(),
    ]);

    const merged: UnifiedDoc[] = [];
    if (contracts.ok) {
      merged.push(...contracts.contracts.map(toUnifiedContract));
    } else {
      showToast(contracts.error, "error");
    }
    if (invoices.ok) {
      merged.push(...invoices.invoices.map(toUnifiedInvoice));
    } else {
      showToast(invoices.error, "error");
    }

    merged.sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
    setDocs(merged);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading || unreadCount === 0) return;
    const timer = setTimeout(() => {
      void Promise.all([markClientContractsSeen(), markClientInvoicesSeen()]);
    }, 1200);
    return () => clearTimeout(timer);
  }, [loading, unreadCount]);

  async function handleDownload(doc: UnifiedDoc) {
    setBusyId(doc.id);
    try {
      const result =
        doc.kind === "contract"
          ? await getGeneratedContractDownloadUrl(doc.id)
          : await getGeneratedInvoiceDownloadUrl(doc.id);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } finally {
      setBusyId(null);
    }
  }

  async function openFillForm(doc: UnifiedDoc) {
    setFillOpenId(doc.id);
    setFillKind(doc.kind);
    setFillLoading(true);
    setFillFields([]);
    setFillValues({});
    try {
      const result =
        doc.kind === "contract"
          ? await getClientContractFillFields(doc.id)
          : await getClientInvoiceFillFields(doc.id);
      if (!result.ok) {
        showToast(result.error, "error");
        setFillOpenId(null);
        return;
      }
      setFillFields(result.fields);
      const values =
        doc.kind === "contract"
          ? (result as Awaited<ReturnType<typeof getClientContractFillFields>> & {
              ok: true;
            }).contract.client_values
          : (result as Awaited<ReturnType<typeof getClientInvoiceFillFields>> & {
              ok: true;
            }).invoice.client_values;
      const initial: Record<string, string> = {};
      for (const field of result.fields) {
        initial[field.placeholderKey] = values[field.placeholderKey] ?? "";
      }
      setFillValues(initial);
    } finally {
      setFillLoading(false);
    }
  }

  async function handleSaveFill(docId: string) {
    setBusyId(docId);
    try {
      const result =
        fillKind === "contract"
          ? await submitClientContractFill(docId, fillValues)
          : await submitClientInvoiceFill(docId, fillValues);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      const updated =
        fillKind === "contract"
          ? toUnifiedContract(
              (result as Awaited<ReturnType<typeof submitClientContractFill>> & {
                ok: true;
              }).contract
            )
          : toUnifiedInvoice(
              (result as Awaited<ReturnType<typeof submitClientInvoiceFill>> & {
                ok: true;
              }).invoice
            );
      setDocs((prev) => prev.map((d) => (d.id === docId ? updated : d)));
      setFillOpenId(null);
      showToast(
        "Dokument uložený. Teraz si môžeš stiahnuť PDF — DJ dostal upozornenie.",
        "success"
      );

      const extractable = extractBillingFromValues(fillValues);
      if (Object.keys(extractable).length > 0) {
        setPendingBillingSave(extractable);
        setSavePromptOpen(true);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function confirmSaveBilling() {
    if (!pendingBillingSave) {
      setSavePromptOpen(false);
      return;
    }
    setSavingBilling(true);
    try {
      const result = await mergeClientBillingFromFill(pendingBillingSave);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast("Údaje uložené do profilu pre budúce dokumenty.", "success");
      setSavePromptOpen(false);
      setPendingBillingSave(null);
    } finally {
      setSavingBilling(false);
    }
  }

  if (userLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-pulse pt-6">
        <div className="h-8 w-40 rounded-xl bg-white/5" />
        <div className="h-32 rounded-3xl bg-white/[0.03]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pt-6">
      <Reveal>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Dokumenty
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Zmluvy a faktúry, ktoré ti DJ poslal do profilu.
        </p>
      </Reveal>

      {unreadCount > 0 ? (
        <Reveal delay={40}>
          <div className="mt-5 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
            {unreadCount === 1
              ? "Máš 1 nový dokument od DJ-a."
              : `Máš ${unreadCount} nové dokumenty od DJ-a.`}
          </div>
        </Reveal>
      ) : null}

      <Reveal delay={80}>
        <div className="mt-6 space-y-3">
          {docs.length === 0 ? (
            <div className="rounded-[2rem] border border-white/8 bg-card/40 px-6 py-14 text-center">
              <FileText className="mx-auto size-8 text-zinc-600" />
              <h3 className="mt-4 text-lg font-semibold text-white">
                Zatiaľ žiadne dokumenty
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
                Keď ti DJ pošle zmluvu alebo faktúru, objaví sa tu na doplnenie
                alebo stiahnutie.
              </p>
            </div>
          ) : (
            docs.map((doc) => {
              const busy = busyId === doc.id;
              const unread = isUnread(doc);
              const pending = doc.status === "pending_fill";
              const filled = doc.status === "filled";
              const open = fillOpenId === doc.id;
              const status = statusLabel(doc);
              const Icon = doc.kind === "invoice" ? Receipt : FileText;

              return (
                <article
                  key={`${doc.kind}:${doc.id}`}
                  className={`rounded-3xl border p-5 backdrop-blur-md ${
                    pending || unread
                      ? "border-violet-500/35 bg-violet-500/[0.08]"
                      : "border-white/10 bg-card/70"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Icon className="size-3.5 shrink-0 text-violet-300" />
                        <p className="truncate text-sm font-semibold text-white">
                          {doc.title}
                        </p>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                          {doc.kind === "invoice" ? "Faktúra" : "Zmluva"}
                        </span>
                        {unread ? (
                          <span className="rounded-full bg-violet-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Nové
                          </span>
                        ) : null}
                        {status ? (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              pending
                                ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                                : "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-200"
                            }`}
                          >
                            {status}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Prijaté {formatDateTime(doc.sentAt)}
                        {filled && doc.filledAt
                          ? ` · Vyplnené ${formatDateTime(doc.filledAt)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {pending ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy || fillLoading}
                          onClick={() =>
                            open ? setFillOpenId(null) : openFillForm(doc)
                          }
                          className="gap-1.5 rounded-full"
                        >
                          {open ? "Zavrieť" : "Doplniť údaje"}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => handleDownload(doc)}
                          className="gap-1.5 rounded-full"
                        >
                          {busy ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Download className="size-3.5" />
                          )}
                          Stiahnuť PDF
                        </Button>
                      )}
                    </div>
                  </div>

                  {open ? (
                    <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                      {fillLoading ? (
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                          <Loader2 className="size-4 animate-spin" />
                          Načítavam polia…
                        </div>
                      ) : fillFields.length === 0 ? (
                        <>
                          <p className="text-sm text-zinc-400">
                            Všetky údaje už máš v profile. Potvrď dokončenie —
                            DJ dostane hotovú faktúru.
                          </p>
                          <Button
                            type="button"
                            disabled={busy}
                            onClick={() => handleSaveFill(doc.id)}
                            className="gap-1.5 rounded-full"
                          >
                            {busy ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Save className="size-3.5" />
                            )}
                            Potvrdiť a dokončiť
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-zinc-500">
                            Doplň údaje, ulož dokument a následne si stiahneš
                            hotové PDF.
                          </p>
                          {fillFields.map((field) => (
                            <div
                              key={field.placeholderKey}
                              className="space-y-1.5"
                            >
                              <Label className="flex items-center gap-1.5 text-xs text-zinc-400">
                                {field.label}
                                {field.optional ? (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500"
                                    title="Voliteľné — ak nevyplníš, ostane prázdne"
                                  >
                                    <Info className="size-2.5" />
                                    voliteľné
                                  </span>
                                ) : null}
                              </Label>
                              <Input
                                value={fillValues[field.placeholderKey] ?? ""}
                                onChange={(e) =>
                                  setFillValues((prev) => ({
                                    ...prev,
                                    [field.placeholderKey]: e.target.value,
                                  }))
                                }
                                className="h-10 rounded-xl bg-white/[0.03]"
                                placeholder={
                                  field.optional
                                    ? "Nepovinné"
                                    : field.label
                                }
                              />
                            </div>
                          ))}
                          <Button
                            type="button"
                            disabled={busy}
                            onClick={() => handleSaveFill(doc.id)}
                            className="gap-1.5 rounded-full"
                          >
                            {busy ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Save className="size-3.5" />
                            )}
                            Uložiť a dokončiť
                          </Button>
                        </>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </Reveal>

      <Dialog
        open={savePromptOpen}
        onOpenChange={(open) => {
          setSavePromptOpen(open);
          if (!open) setPendingBillingSave(null);
        }}
      >
        <DialogContent className="rounded-3xl border-white/10 bg-[#121212] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Uložiť údaje do profilu?</DialogTitle>
            <DialogDescription>
              Tieto údaje sa často vyskytujú na zmluvách a faktúrach. Môžeš ich
              uložiť a nabudúce sa predvyplnia.
            </DialogDescription>
          </DialogHeader>
          {pendingBillingSave ? (
            <ul className="space-y-1.5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
              {(
                Object.entries(pendingBillingSave) as [
                  ClientBillingFieldKey,
                  string,
                ][]
              ).map(([key, value]) => (
                <li key={key} className="flex justify-between gap-3">
                  <span className="text-zinc-500">
                    {CLIENT_BILLING_FIELD_LABELS[key]}
                  </span>
                  <span className="truncate text-right text-white">{value}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setSavePromptOpen(false);
                setPendingBillingSave(null);
              }}
            >
              Teraz nie
            </Button>
            <Button
              type="button"
              className="rounded-full"
              disabled={savingBilling}
              onClick={() => void confirmSaveBilling()}
            >
              {savingBilling ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : null}
              Áno, uložiť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
