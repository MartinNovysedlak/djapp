"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  CircleHelp,
  Download,
  FileText,
  History,
  Loader2,
  Send,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Reveal } from "@/components/motion";
import { useDashboardUser } from "@/components/DashboardUserContext";
import { useDjBookings } from "@/hooks/useDjBookings";
import { useToast } from "@/lib/toast-context";
import {
  formatBookingPrice,
  getEffectiveBookingPrice,
  isContractPricePlaceholderKey,
} from "@/lib/booking-price";
import {
  getContractGaps,
  getContractPlaceholders,
  getGeneratedContractDownloadUrl,
  listContractTemplates,
  listGeneratedContracts,
  sendGeneratedContractToClient,
  type ContractGap,
} from "@/app/actions/contracts";
import { getPlaceholderDisplayLabel } from "@/lib/contracts/fields";
import {
  GENERATED_CONTRACTS_LIMIT,
  type ContractPlaceholderRow,
  type ContractTemplateWithCount,
  type GeneratedContractRow,
} from "@/lib/contracts/types";

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("sk-SK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function GenerateContractForm() {
  const searchParams = useSearchParams();
  const preselectedBookingId = searchParams.get("bookingId") ?? "";
  const { user, loading: userLoading } = useDashboardUser();
  const { showToast } = useToast();
  const { bookings, loading: bookingsLoading } = useDjBookings(user?.id);

  const [templates, setTemplates] = useState<ContractTemplateWithCount[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateId, setTemplateId] = useState("");
  const [bookingId, setBookingId] = useState(preselectedBookingId);
  const [placeholders, setPlaceholders] = useState<ContractPlaceholderRow[]>([]);
  const [placeholdersLoading, setPlaceholdersLoading] = useState(false);
  const [gaps, setGaps] = useState<ContractGap[]>([]);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContractRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("generate");

  const acceptedBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.type !== "blockout" && b.status === "accepted")
        .sort(
          (a, b) =>
            new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
        ),
    [bookings]
  );

  const selectedBooking = useMemo(
    () => acceptedBookings.find((b) => b.id === bookingId) ?? null,
    [acceptedBookings, bookingId]
  );

  useEffect(() => {
    if (!preselectedBookingId) return;
    setBookingId(preselectedBookingId);
  }, [preselectedBookingId]);

  useEffect(() => {
    if (!bookingId || bookingsLoading) return;
    if (acceptedBookings.some((b) => b.id === bookingId)) return;
    if (preselectedBookingId && bookingId === preselectedBookingId) {
      showToast("Táto rezervácia nie je potvrdená alebo neexistuje.", "error");
      setBookingId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptedBookings, bookingId, bookingsLoading, preselectedBookingId]);

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    const result = await listGeneratedContracts();
    if (result.ok) {
      setGenerated(result.contracts);
    } else {
      showToast(result.error ?? "Históriu zmlúv sa nepodarilo načítať.", "error");
    }
    setHistoryLoading(false);
  }, [showToast]);

  useEffect(() => {
    void (async () => {
      setTemplatesLoading(true);
      const result = await listContractTemplates();
      if (result.ok) {
        setTemplates(result.templates);
        if (result.templates.length === 1) {
          setTemplateId(result.templates[0].id);
        }
      } else {
        showToast(result.error ?? "Šablóny sa nepodarilo načítať.", "error");
      }
      setTemplatesLoading(false);
    })();
    void refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!templateId) {
      setPlaceholders([]);
      return;
    }
    setManualValues({});
    setPlaceholdersLoading(true);
    void (async () => {
      const result = await getContractPlaceholders(templateId);
      if (result.ok) {
        setPlaceholders(result.placeholders);
      } else {
        showToast(result.error, "error");
      }
      setPlaceholdersLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  useEffect(() => {
    if (!templateId || !bookingId) {
      setGaps([]);
      return;
    }
    setGapsLoading(true);
    void (async () => {
      const result = await getContractGaps(templateId, bookingId);
      if (result.ok) {
        setGaps(result.gaps);
      } else {
        showToast(result.error, "error");
      }
      setGapsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, bookingId]);

  useEffect(() => {
    if (!selectedBooking || placeholders.length === 0) return;
    const price = getEffectiveBookingPrice(selectedBooking);
    if (price == null) return;
    const formatted = formatBookingPrice(price);
    setManualValues((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const p of placeholders) {
        if (p.type !== "manual_input") continue;
        if (!isContractPricePlaceholderKey(p.placeholder_key)) continue;
        if (prev[p.placeholder_key]?.trim()) continue;
        next[p.placeholder_key] = formatted;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [selectedBooking, placeholders, bookingId]);

  const manualPlaceholders = useMemo(
    () => placeholders.filter((p) => p.type === "manual_input"),
    [placeholders]
  );

  const clientPlaceholders = useMemo(
    () => placeholders.filter((p) => p.type === "client_input"),
    [placeholders]
  );

  // Auto (database_field) placeholders that resolved empty for this specific
  // booking — the DJ fills these in too so the PDF never ships with blanks.
  const gapFields = useMemo(
    () =>
      gaps.map((g) => ({
        id: `gap:${g.placeholderKey}`,
        placeholder_key: g.placeholderKey,
        label: g.label,
      })),
    [gaps]
  );

  const canSendToClient = Boolean(
    selectedBooking?.client_id || selectedBooking?.client_email?.trim()
  );

  async function handleGenerate(mode: "download" | "send" = "download") {
    if (!bookingId || !templateId) return;
    if (mode === "send" && !canSendToClient) {
      showToast(
        "Rezervácia nemá e-mail zákazníka — nie je kam poslať.",
        "error"
      );
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          templateId,
          manualValues,
          sendToClient: mode === "send",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error ??
            (mode === "send"
              ? "Nepodarilo sa odoslať zmluvu."
              : "Nepodarilo sa vygenerovať PDF.")
        );
      }

      if (mode === "download") {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `zmluva-${selectedBooking?.client_name?.replace(/[^a-zA-Z0-9]+/g, "-") || "klient"}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast("Zmluva vygenerovaná a uložená (posledných 30).", "success");
      } else {
        const data = (await res.json().catch(() => ({}))) as {
          status?: string;
        };
        showToast(
          data.status === "pending_fill"
            ? "Odoslané zákazníkovi na vyplnenie — PDF sa vytvorí až po doplnení údajov."
            : "Zmluva odoslaná zákazníkovi do profilu.",
          "success"
        );
        setActiveTab("history");
      }

      void refreshHistory();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : mode === "send"
            ? "Nepodarilo sa odoslať zmluvu."
            : "Nepodarilo sa vygenerovať PDF.";
      showToast(message, "error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(contractId: string) {
    setBusyId(contractId);
    try {
      const result = await getGeneratedContractDownloadUrl(contractId);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSendToClient(contractId: string) {
    setBusyId(contractId);
    try {
      const result = await sendGeneratedContractToClient(contractId);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setGenerated((prev) =>
        prev.map((c) => (c.id === contractId ? result.contract : c))
      );
      showToast(
        result.contract.status === "pending_fill"
          ? "Zmluva je u zákazníka na doplnenie údajov. Po vyplnení dostaneš upozornenie."
          : "Zmluva je v profile zákazníka a bol odoslaný e-mail.",
        "success"
      );
    } finally {
      setBusyId(null);
    }
  }

  if (userLoading || bookingsLoading || templatesLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-white/5" />
        <div className="h-4 w-72 rounded-lg bg-white/[0.04]" />
        <div className="mt-6 h-64 rounded-3xl bg-white/[0.03]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Reveal>
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              PDF zmluvy
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
            Vygeneruj PDF zo šablóny, alebo spravuj posledných{" "}
            {GENERATED_CONTRACTS_LIMIT} uložených zmlúv.
          </p>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v ?? "generate")}
          className="w-full"
        >
          <TabsList className="mb-6 h-auto w-full flex-wrap gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 sm:w-auto">
            <TabsTrigger
              value="generate"
              className="rounded-xl px-4 py-2.5 data-active:bg-violet-500/15 data-active:text-violet-200"
            >
              <FileText className="size-3.5" />
              Vygenerovať
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-xl px-4 py-2.5 data-active:bg-white/10 data-active:text-white"
            >
              <History className="size-3.5" />
              Posledné zmluvy
              {generated.length > 0 ? ` (${generated.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="outline-none">
            {templates.length === 0 ? (
              <div className="rounded-[2rem] border border-white/8 bg-card/40 px-6 py-14 text-center">
                <FileText className="mx-auto size-8 text-zinc-600" />
                <h3 className="mt-4 text-lg font-semibold text-white">
                  Ešte nemáš žiadnu šablónu
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
                  Najprv nahraj šablónu zmluvy a namapuj jej premenné.
                </p>
                <Link
                  href="/dashboard/contracts"
                  className="mt-5 inline-flex text-sm text-violet-300 hover:text-violet-200"
                >
                  Prejsť na Šablóny →
                </Link>
              </div>
            ) : acceptedBookings.length === 0 ? (
              <div className="rounded-[2rem] border border-white/8 bg-card/40 px-6 py-14 text-center">
                <Calendar className="mx-auto size-8 text-zinc-600" />
                <h3 className="mt-4 text-lg font-semibold text-white">
                  Žiadne potvrdené rezervácie
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
                  Zmluvu môžeš generovať až pre potvrdenú rezerváciu.
                </p>
              </div>
            ) : (
              <div className="space-y-5 rounded-3xl border border-white/10 bg-card/70 p-6 backdrop-blur-md">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Rezervácia</Label>
                  <Select
                    value={bookingId || null}
                    onValueChange={(v) => setBookingId(v ?? "")}
                  >
                    <SelectTrigger className="w-full justify-start gap-2 rounded-xl px-3 data-[size=default]:h-11">
                      <UserIcon className="size-4 shrink-0 text-muted-foreground/60" />
                      <SelectValue placeholder="Vyber rezerváciu">
                        {(value: string | null) => {
                          if (!value) return null;
                          const b = acceptedBookings.find((x) => x.id === value);
                          if (!b) return null;
                          return `${b.client_name ?? "Zákazník"} — ${formatDate(b.event_date)}`;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {acceptedBookings.map((b) => {
                        const label = `${b.client_name ?? "Zákazník"} — ${formatDate(b.event_date)}`;
                        return (
                          <SelectItem key={b.id} value={b.id} label={label}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">Šablóna</Label>
                  <Select
                    value={templateId || null}
                    onValueChange={(v) => setTemplateId(v ?? "")}
                  >
                    <SelectTrigger className="w-full justify-start gap-2 rounded-xl px-3 data-[size=default]:h-11">
                      <FileText className="size-4 shrink-0 text-muted-foreground/60" />
                      <SelectValue placeholder="Vyber šablónu">
                        {(value: string | null) => {
                          if (!value) return null;
                          return (
                            templates.find((t) => t.id === value)
                              ?.template_name ?? null
                          );
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem
                          key={t.id}
                          value={t.id}
                          label={t.template_name}
                        >
                          {t.template_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {placeholdersLoading || gapsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="size-5 animate-spin text-zinc-500" />
                  </div>
                ) : (
                  (manualPlaceholders.length > 0 ||
                    gapFields.length > 0 ||
                    clientPlaceholders.length > 0) && (
                    <div className="space-y-3 border-t border-white/5 pt-4">
                      {manualPlaceholders.length > 0 && (
                        <>
                          <p className="text-xs text-zinc-500">
                            Manuálne polia pre túto zmluvu:
                          </p>
                          {manualPlaceholders.map((p) => (
                            <div key={p.id} className="space-y-1.5">
                              <Label className="text-zinc-400">
                                {getPlaceholderDisplayLabel(p)}
                              </Label>
                              <Input
                                value={manualValues[p.placeholder_key] ?? ""}
                                onChange={(e) =>
                                  setManualValues((prev) => ({
                                    ...prev,
                                    [p.placeholder_key]: e.target.value,
                                  }))
                                }
                                className="h-10 rounded-xl bg-white/[0.03]"
                              />
                            </div>
                          ))}
                        </>
                      )}
                      {clientPlaceholders.length > 0 && (
                        <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-3 text-xs leading-relaxed text-violet-100/90">
                          {clientPlaceholders.length === 1
                            ? "1 pole vyplní zákazník"
                            : `${clientPlaceholders.length} polí vyplní zákazník`}{" "}
                          po odoslaní do profilu (
                          {clientPlaceholders
                            .map((p) => getPlaceholderDisplayLabel(p))
                            .join(", ")}
                          ). Až potom bude PDF hotové a stav sa zmení na
                          vyplnená.
                        </div>
                      )}
                      {gapFields.length > 0 && (
                        <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                          <p className="text-xs text-zinc-500">
                            Niektoré údaje z rezervácie chýbajú. Môžeš ich
                            doplniť — ak ich nevyplníš, v zmluve ostanú prázdne.
                          </p>
                          {gapFields.map((p) => (
                            <div key={p.id} className="space-y-1.5">
                              <Label className="text-zinc-400">
                                {p.label}{" "}
                                <span className="text-zinc-600">
                                  (voliteľné)
                                </span>
                              </Label>
                              <Input
                                value={manualValues[p.placeholder_key] ?? ""}
                                onChange={(e) =>
                                  setManualValues((prev) => ({
                                    ...prev,
                                    [p.placeholder_key]: e.target.value,
                                  }))
                                }
                                placeholder="Nechať prázdne"
                                className="h-10 rounded-xl bg-white/[0.03]"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )}

                <div className="space-y-2 border-t border-white/5 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!bookingId || !templateId || generating}
                      onClick={() => handleGenerate("download")}
                      className="gap-2 rounded-full"
                    >
                      {generating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      Vygenerovať a stiahnuť
                    </Button>
                    <Button
                      type="button"
                      disabled={
                        !bookingId ||
                        !templateId ||
                        generating ||
                        !canSendToClient
                      }
                      onClick={() => handleGenerate("send")}
                      className="gap-2 rounded-full"
                      title={
                        !canSendToClient
                          ? "Rezervácia nemá e-mail zákazníka"
                          : clientPlaceholders.length > 0
                            ? "Vygenerovať a poslať zákazníkovi na vyplnenie"
                            : "Vygenerovať a poslať zákazníkovi do profilu"
                      }
                    >
                      {generating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      {clientPlaceholders.length > 0
                        ? "Poslať na vyplnenie"
                        : "Poslať zákazníkovi"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    {clientPlaceholders.length > 0
                      ? "„Poslať na vyplnenie“ neťahuje PDF tebe — pošle zákazníkovi formulár a PDF vznikne až po doplnení údajov."
                      : "„Poslať zákazníkovi“ uloží PDF a pošle ho do jeho profilu (bez stiahnutia u teba)."}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3 outline-none">
            <p className="mb-1 text-xs text-zinc-600">
              Ukladá sa posledných {GENERATED_CONTRACTS_LIMIT} vygenerovaných
              PDF. Odtiaľ ich môžeš stiahnuť alebo poslať zákazníkovi (aj na
              vyplnenie).
            </p>
            {historyLoading ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="size-5 animate-spin text-zinc-500" />
              </div>
            ) : generated.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-zinc-500">
                Zatiaľ žiadne vygenerované zmluvy.
              </div>
            ) : (
              generated.map((contract) => {
                const busy = busyId === contract.id;
                const sent = !!contract.sent_to_client_at;
                const pending = contract.status === "pending_fill";
                const filled = contract.status === "filled";
                return (
                  <article
                    key={contract.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-card/70 p-5 backdrop-blur-md"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">
                          {contract.client_name || "Zákazník"}
                          {contract.template_name
                            ? ` · ${contract.template_name}`
                            : ""}
                        </p>
                        {pending ? (
                          <span className="rounded-full border border-violet-500/35 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                            Čaká na vyplnenie
                          </span>
                        ) : null}
                        {filled ? (
                          <span className="rounded-full border border-fuchsia-500/35 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-200">
                            Vyplnená
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                        <span>{formatDateTime(contract.created_at)}</span>
                        {sent ? (
                          <span className="text-violet-300/90">
                            Poslané zákazníkovi{" "}
                            {formatDateTime(contract.sent_to_client_at!)}
                          </span>
                        ) : (
                          <span>
                            {pending
                              ? "Pripravené na odoslanie na vyplnenie"
                              : "Možno poslať do profilu zákazníka"}
                          </span>
                        )}
                        {filled && contract.filled_at ? (
                          <span className="text-fuchsia-300/80">
                            Vyplnené {formatDateTime(contract.filled_at)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => handleDownload(contract.id)}
                        className="gap-1.5 rounded-full"
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Download className="size-3.5" />
                        )}
                        Stiahnuť
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy || sent}
                        onClick={() => handleSendToClient(contract.id)}
                        className="gap-1.5 rounded-full"
                        title={
                          sent
                            ? "Už odoslané"
                            : pending
                              ? "Poslať zákazníkovi na vyplnenie"
                              : "Poslať do profilu zákazníka"
                        }
                      >
                        <Send className="size-3.5" />
                        {sent
                          ? "Poslané"
                          : pending
                            ? "Poslať na vyplnenie"
                            : "Poslať zákazníkovi"}
                      </Button>
                    </div>
                  </article>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </Reveal>
    </div>
  );
}

export default function GenerateContractPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl space-y-4 animate-pulse">
          <div className="h-8 w-48 rounded-xl bg-white/5" />
          <div className="h-4 w-72 rounded-lg bg-white/[0.04]" />
          <div className="mt-6 h-64 rounded-3xl bg-white/[0.03]" />
        </div>
      }
    >
      <GenerateContractForm />
    </Suspense>
  );
}
