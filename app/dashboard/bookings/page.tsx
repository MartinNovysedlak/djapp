"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Download,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  FileText,
  Pencil,
  Receipt,
  Share2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/lib/toast-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { MusicPlanner } from "@/components/playlist/MusicPlanner";
import { EventTimeline } from "@/components/timeline/EventTimeline";
import { BookingExtras } from "@/components/extras/BookingExtras";
import { LiveRequestQr } from "@/components/live/LiveRequestQr";
import {
  rejectBooking,
  updateBookingDetails,
  updateBookingPdfDeliveryStatus,
  updateBookingInvoiceDeliveryStatus,
  type PdfDeliveryStatus,
} from "@/app/actions/booking-status";
import {
  getBookingContractSummaries,
  getGeneratedContractDownloadUrl,
  updateBookingContractWorkflowStatus,
  type BookingContractSummary,
  type ContractWorkflowStatus,
} from "@/app/actions/contracts";
import {
  getBookingInvoiceSummaries,
  getGeneratedInvoiceDownloadUrl,
  updateBookingInvoiceWorkflowStatus,
  type BookingInvoiceSummary,
  type InvoiceWorkflowStatus,
} from "@/app/actions/invoices";
import { EVENT_TYPES, formatEventTypeLabel } from "@/lib/event-types";
import { useDjBookings, type CachedBooking } from "@/hooks/useDjBookings";
import { DjOfferForm } from "@/components/bulk/BulkOfferForm";
import { BookingChat } from "@/components/chat/BookingChat";

type BookingStatus = "pending" | "accepted" | "rejected";

type Booking = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  event_type: string;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  event_location: string | null;
  message: string | null;
  created_at: string;
  status: BookingStatus;
  rejection_reason: string | null;
  pdf_delivery_status: PdfDeliveryStatus | null;
  invoice_delivery_status: PdfDeliveryStatus | null;
  price: number | null;
  base_price: number | null;
  bulk_inquiry_id: string | null;
  client_budget: number | null;
  dj_offer_price: number | null;
  dj_offer_message: string | null;
};

function toBooking(row: CachedBooking): Booking {
  return {
    id: row.id,
    client_name: row.client_name ?? "Zákazník",
    client_email: row.client_email ?? "",
    client_phone: row.client_phone,
    event_type: row.event_type,
    event_date: row.event_date,
    end_date: row.end_date,
    start_time: row.start_time,
    end_time: row.end_time,
    event_location: row.event_location,
    message: row.message,
    created_at: row.created_at,
    status: row.status,
    rejection_reason: row.rejection_reason,
    pdf_delivery_status: row.pdf_delivery_status ?? null,
    invoice_delivery_status: row.invoice_delivery_status ?? null,
    price: row.price == null ? null : Number(row.price),
    base_price: row.base_price == null ? null : Number(row.base_price),
    bulk_inquiry_id: row.bulk_inquiry_id ?? null,
    client_budget:
      row.client_budget == null ? null : Number(row.client_budget),
    dj_offer_price:
      row.dj_offer_price == null ? null : Number(row.dj_offer_price),
    dj_offer_message: row.dj_offer_message ?? null,
  };
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateRange(start: string, end: string | null) {
  if (!end || end === start) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
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

function isPastEvent(b: Booking) {
  const endIso = b.end_date ?? b.event_date;
  const [y, m, d] = endIso.split("-").map(Number);
  const end = new Date(y, (m ?? 1) - 1, d ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end < today;
}

function timeInputValue(value: string | null) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

type ContractUiState =
  | { kind: "none"; label: string; hint: string }
  | { kind: "draft"; label: string; hint: string }
  | { kind: "waiting"; label: string; hint: string }
  | { kind: "done"; label: string; hint: string }
  | { kind: "sent"; label: string; hint: string };

type InvoiceUiState =
  | { kind: "none"; label: string; hint: string }
  | { kind: "draft"; label: string; hint: string }
  | { kind: "waiting"; label: string; hint: string }
  | { kind: "done"; label: string; hint: string }
  | { kind: "sent"; label: string; hint: string };

const WORKFLOW_OPTIONS: {
  value: ContractWorkflowStatus;
  label: string;
}[] = [
  { value: "generated", label: "Vygenerovaná" },
  { value: "awaiting_fill", label: "Čaká na vyplnenie" },
  { value: "sent", label: "Odoslaná" },
  { value: "filled", label: "Vyplnená" },
];

const MANUAL_DELIVERY_OPTIONS: {
  value: PdfDeliveryStatus;
  label: string;
  hint: string;
}[] = [
  {
    value: "none",
    label: "Bez zmluvy",
    hint: "Zatiaľ nie je vygenerované ani manuálne odoslané PDF.",
  },
  {
    value: "manual_sent",
    label: "Manuálne odoslaná",
    hint: "Zmluva bola odoslaná mimo aplikácie.",
  },
  {
    value: "email_sent",
    label: "Odoslaná e-mailom",
    hint: "Zmluva bola poslaná klientovi e-mailom.",
  },
  {
    value: "confirmed_in_person",
    label: "Potvrdená osobne",
    hint: "Zmluva bola potvrdená / podpísaná osobne.",
  },
  {
    value: "printed_handed",
    label: "Vytlačená / odovzdaná",
    hint: "Papierová zmluva bola odovzdaná klientovi.",
  },
  {
    value: "other",
    label: "Iný spôsob",
    hint: "Zmluva vybavená iným spôsobom.",
  },
];

const MANUAL_INVOICE_OPTIONS: {
  value: PdfDeliveryStatus;
  label: string;
  hint: string;
}[] = [
  {
    value: "none",
    label: "Bez faktúry",
    hint: "Zatiaľ nie je vystavená ani manuálne evidovaná faktúra.",
  },
  {
    value: "manual_sent",
    label: "Manuálne odoslaná",
    hint: "Faktúra bola odoslaná mimo aplikácie.",
  },
  {
    value: "email_sent",
    label: "Odoslaná e-mailom",
    hint: "Faktúra bola poslaná klientovi e-mailom.",
  },
  {
    value: "confirmed_in_person",
    label: "Potvrdená osobne",
    hint: "Faktúra bola odovzdaná / potvrdená osobne.",
  },
  {
    value: "printed_handed",
    label: "Vytlačená / odovzdaná",
    hint: "Papierová faktúra bola odovzdaná klientovi.",
  },
  {
    value: "other",
    label: "Iný spôsob",
    hint: "Faktúra vybavená iným spôsobom.",
  },
];

function resolveManualDeliveryUi(
  status: PdfDeliveryStatus | null | undefined
): ContractUiState {
  const key = status && status !== "none" ? status : "none";
  const opt = MANUAL_DELIVERY_OPTIONS.find((o) => o.value === key);
  return {
    kind: key === "none" ? "none" : "sent",
    label: opt?.label ?? "Bez zmluvy",
    hint: opt?.hint ?? "Zatiaľ nie je vygenerované PDF.",
  };
}

function resolveManualInvoiceUi(
  status: PdfDeliveryStatus | null | undefined
): InvoiceUiState {
  const key = status && status !== "none" ? status : "none";
  const opt = MANUAL_INVOICE_OPTIONS.find((o) => o.value === key);
  return {
    kind: key === "none" ? "none" : "sent",
    label: opt?.label ?? "Bez faktúry",
    hint: opt?.hint ?? "Zatiaľ nie je vystavená faktúra.",
  };
}

function resolveContractUi(
  summary: BookingContractSummary | undefined,
  deliveryStatus?: PdfDeliveryStatus | null
): ContractUiState {
  if (!summary) {
    return resolveManualDeliveryUi(deliveryStatus);
  }
  if (summary.status === "filled") {
    return {
      kind: "done",
      label: "Vyplnená",
      hint: summary.filledAt
        ? `Zákazník doplnil údaje ${formatDateTime(summary.filledAt)}`
        : "Zákazník doplnil údaje — PDF je hotové.",
    };
  }
  if (summary.status === "pending_fill") {
    return {
      kind: "waiting",
      label: "Čaká na vyplnenie",
      hint: summary.sentToClientAt
        ? `Odoslané ${formatDateTime(summary.sentToClientAt)}`
        : "Čaká na doplnenie údajov zákazníkom.",
    };
  }
  if (summary.sentToClientAt) {
    return {
      kind: "sent",
      label: "Odoslaná",
      hint: `Poslané zákazníkovi ${formatDateTime(summary.sentToClientAt)}`,
    };
  }
  return {
    kind: "draft",
    label: "Vygenerovaná",
    hint: "PDF je uložené.",
  };
}

function pdfAvailable(summary: BookingContractSummary | undefined) {
  return !!summary && summary.status !== "pending_fill";
}

function invoiceWorkflowFromSummary(
  summary: BookingInvoiceSummary | undefined
): InvoiceWorkflowStatus | null {
  if (!summary) return null;
  if (summary.status === "filled") return "filled";
  if (summary.status === "pending_fill") return "awaiting_fill";
  if (summary.sentToClientAt) return "sent";
  return "generated";
}

function workflowFromSummary(
  summary: BookingContractSummary | undefined
): ContractWorkflowStatus | null {
  if (!summary) return null;
  if (summary.status === "filled") return "filled";
  if (summary.status === "pending_fill") return "awaiting_fill";
  if (summary.sentToClientAt) return "sent";
  return "generated";
}

function resolveInvoiceUi(
  summary: BookingInvoiceSummary | undefined,
  deliveryStatus?: PdfDeliveryStatus | null
): InvoiceUiState {
  if (!summary) {
    return resolveManualInvoiceUi(deliveryStatus);
  }
  if (summary.status === "filled") {
    return {
      kind: "done",
      label: "Vyplnená",
      hint: summary.filledAt
        ? `Zákazník doplnil údaje ${formatDateTime(summary.filledAt)}`
        : "Zákazník doplnil údaje — PDF je hotové.",
    };
  }
  if (summary.status === "pending_fill") {
    return {
      kind: "waiting",
      label: "Čaká na vyplnenie",
      hint: summary.sentToClientAt
        ? `Odoslané ${formatDateTime(summary.sentToClientAt)}`
        : "Čaká na doplnenie údajov zákazníkom.",
    };
  }
  if (summary.sentToClientAt) {
    return {
      kind: "sent",
      label: "Odoslaná",
      hint: `Poslané zákazníkovi ${formatDateTime(summary.sentToClientAt)}`,
    };
  }
  return {
    kind: "draft",
    label: "Vygenerovaná",
    hint: `${summary.invoiceNumber} — PDF je uložené.`,
  };
}

function invoicePdfAvailable(summary: BookingInvoiceSummary | undefined) {
  return !!summary && summary.status !== "pending_fill";
}

export default function BookingsPage() {
  const { showToast } = useToast();
  const { user, profile, loading: userLoading } = useDashboardUser();
  const {
    bookings: allBookings,
    setBookings: setAllBookings,
    loading: bookingsLoading,
    refresh: refreshBookings,
  } = useDjBookings(user?.id);
  const [rejectTarget, setRejectTarget] = useState<Booking | null>(null);
  const [editTarget, setEditTarget] = useState<Booking | null>(null);
  const [tab, setTab] = useState("new");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contractByBooking, setContractByBooking] = useState<
    Record<string, BookingContractSummary>
  >({});
  const [invoiceByBooking, setInvoiceByBooking] = useState<
    Record<string, BookingInvoiceSummary>
  >({});
  const [statusBusyBookingId, setStatusBusyBookingId] = useState<string | null>(
    null
  );
  const [downloadingBookingId, setDownloadingBookingId] = useState<string | null>(
    null
  );
  const [downloadingInvoiceBookingId, setDownloadingInvoiceBookingId] =
    useState<string | null>(null);

  const publicSlug = profile?.public_slug ?? null;

  const bookings = useMemo(
    () =>
      allBookings
        .filter((b) => b.type !== "blockout")
        .map(toBooking)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
    [allBookings]
  );

  const refreshContracts = useCallback(async () => {
    const ids = bookings.map((b) => b.id);
    if (ids.length === 0) {
      setContractByBooking({});
      setInvoiceByBooking({});
      return;
    }
    const [contracts, invoices] = await Promise.all([
      getBookingContractSummaries(ids),
      getBookingInvoiceSummaries(ids),
    ]);
    if (contracts.ok) setContractByBooking(contracts.byBookingId);
    if (invoices.ok) setInvoiceByBooking(invoices.byBookingId);
  }, [bookings]);

  useEffect(() => {
    void refreshContracts();
  }, [refreshContracts]);

  const setBookings = (
    updater: Booking[] | ((prev: Booking[]) => Booking[])
  ) => {
    setAllBookings((prev) => {
      const clientOnly = prev
        .filter((b) => b.type !== "blockout")
        .map(toBooking);
      const next =
        typeof updater === "function" ? updater(clientOnly) : updater;
      const byId = new Map(next.map((b) => [b.id, b]));
      return prev.map((row) => {
        if (row.type === "blockout") return row;
        const updated = byId.get(row.id);
        if (!updated) return row;
        return {
          ...row,
          client_name: updated.client_name,
          client_phone: updated.client_phone,
          event_type: updated.event_type,
          event_date: updated.event_date,
          end_date: updated.end_date,
          start_time: updated.start_time,
          end_time: updated.end_time,
          event_location: updated.event_location,
          message: updated.message,
          status: updated.status,
          rejection_reason: updated.rejection_reason,
        };
      });
    });
  };

  const pending = useMemo(
    () => bookings.filter((b) => b.status === "pending"),
    [bookings]
  );
  const confirmed = useMemo(
    () => bookings.filter((b) => b.status === "accepted" && !isPastEvent(b)),
    [bookings]
  );
  const history = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.status === "rejected" ||
          (b.status === "accepted" && isPastEvent(b))
      ),
    [bookings]
  );

  const handleShareProfile = async () => {
    const path = publicSlug ? `/djs/${publicSlug}` : "/djs";
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Odkaz na profil skopírovaný", "success");
    } catch {
      showToast(url, "info");
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectTarget) return;
    const booking = rejectTarget;
    setBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id
          ? { ...b, status: "rejected", rejection_reason: reason }
          : b
      )
    );
    setRejectTarget(null);

    const result = await rejectBooking(booking.id, reason);
    if (!result.ok) {
      showToast(result.error ?? "Nepodarilo sa zamietnuť rezerváciu.", "error");
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? { ...b, status: "pending", rejection_reason: null }
            : b
        )
      );
      return;
    }
    showToast("Rezervácia odmietnutá.", "success");
    setTab("history");
  };

  const handleChangeContractStatus = async (
    booking: Booking,
    workflow: ContractWorkflowStatus
  ) => {
    const summary = contractByBooking[booking.id];
    if (!summary) return;
    setStatusBusyBookingId(booking.id);
    try {
      const result = await updateBookingContractWorkflowStatus(
        summary.contractId,
        workflow
      );
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setContractByBooking((prev) => ({
        ...prev,
        [booking.id]: result.summary,
      }));
      showToast("Stav PDF zmluvy bol zmenený.", "success");
    } finally {
      setStatusBusyBookingId(null);
    }
  };

  const handleChangeInvoiceStatus = async (
    booking: Booking,
    workflow: InvoiceWorkflowStatus
  ) => {
    const summary = invoiceByBooking[booking.id];
    if (!summary) return;
    setStatusBusyBookingId(booking.id);
    try {
      const result = await updateBookingInvoiceWorkflowStatus(
        summary.invoiceId,
        workflow
      );
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setInvoiceByBooking((prev) => ({
        ...prev,
        [booking.id]: result.summary,
      }));
      showToast("Stav faktúry bol zmenený.", "success");
    } finally {
      setStatusBusyBookingId(null);
    }
  };

  const handleChangePdfDeliveryStatus = async (
    booking: Booking,
    status: PdfDeliveryStatus
  ) => {
    setStatusBusyBookingId(booking.id);
    try {
      const result = await updateBookingPdfDeliveryStatus(booking.id, status);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      const nextStatus = result.status;
      setAllBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? { ...b, pdf_delivery_status: nextStatus }
            : b
        )
      );
      showToast("Stav zmluvy bol uložený.", "success");
    } finally {
      setStatusBusyBookingId(null);
    }
  };

  const handleChangeInvoiceDeliveryStatus = async (
    booking: Booking,
    status: PdfDeliveryStatus
  ) => {
    setStatusBusyBookingId(booking.id);
    try {
      const result = await updateBookingInvoiceDeliveryStatus(
        booking.id,
        status
      );
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      const nextStatus = result.status;
      setAllBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? { ...b, invoice_delivery_status: nextStatus }
            : b
        )
      );
      showToast("Stav faktúry bol uložený.", "success");
    } finally {
      setStatusBusyBookingId(null);
    }
  };

  const handleOpenPdf = async (booking: Booking) => {
    const summary = contractByBooking[booking.id];
    if (!summary || !pdfAvailable(summary)) {
      showToast("PDF zmluva ešte nie je k dispozícii.", "error");
      return;
    }

    setDownloadingBookingId(booking.id);
    try {
      const result = await getGeneratedContractDownloadUrl(summary.contractId);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingBookingId(null);
    }
  };

  const handleOpenInvoicePdf = async (booking: Booking) => {
    const summary = invoiceByBooking[booking.id];
    if (!summary || !invoicePdfAvailable(summary)) {
      showToast("PDF faktúra ešte nie je k dispozícii.", "error");
      return;
    }

    setDownloadingInvoiceBookingId(booking.id);
    try {
      const result = await getGeneratedInvoiceDownloadUrl(summary.invoiceId);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingInvoiceBookingId(null);
    }
  };

  const handleSaveEdit = async (values: EditBookingValues) => {
    if (!editTarget) return { ok: false as const, error: "Chýba rezervácia." };
    const result = await updateBookingDetails({
      bookingId: editTarget.id,
      ...values,
    });
    if (!result.ok) {
      showToast(result.error, "error");
      return result;
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === editTarget.id
          ? {
              ...b,
              client_name: result.booking.client_name ?? b.client_name,
              client_phone: result.booking.client_phone,
              event_type: result.booking.event_type,
              event_date: result.booking.event_date,
              end_date: result.booking.end_date,
              start_time: result.booking.start_time,
              end_time: result.booking.end_time,
              event_location: result.booking.event_location,
              message: result.booking.message,
            }
          : b
      )
    );
    setEditTarget(null);
    showToast("Rezervácia upravená.", "success");
    void refreshBookings();
    return result;
  };

  if (userLoading || (bookingsLoading && bookings.length === 0)) {
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
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Rezervácie
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              Nové dopyty, potvrdené akcie a história na jednom mieste.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShareProfile}
            className="gap-1.5 self-start rounded-full"
          >
            <Share2 className="size-3.5" />
            Zdieľať profil
          </Button>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v ?? "new");
            setExpandedId(null);
          }}
        >
          <TabsList className="mb-6 h-auto w-full flex-wrap gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 sm:w-auto">
            <TabsTrigger
              value="new"
              className="rounded-xl px-4 py-2.5 data-active:bg-violet-500/15 data-active:text-violet-200"
            >
              Nové dopyty
              {pending.length > 0 && (
                <span className="ml-1.5 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="confirmed"
              className="rounded-xl px-4 py-2.5 data-active:bg-fuchsia-500/15 data-active:text-fuchsia-200"
            >
              Potvrdené akcie
              {confirmed.length > 0 && (
                <span className="ml-1.5 rounded-full bg-fuchsia-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-300">
                  {confirmed.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-xl px-4 py-2.5 data-active:bg-white/10 data-active:text-white"
            >
              História
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="outline-none">
            {pending.length === 0 ? (
              <EmptyState
                title="Žiadne nové dopyty"
                text="Keď ti klient pošle rezerváciu, objaví sa tu."
              />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-card/60 backdrop-blur-md">
                {pending.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    expanded={expandedId === b.id}
                    onToggle={() =>
                      setExpandedId((id) => (id === b.id ? null : b.id))
                    }
                    contract={contractByBooking[b.id]}
                    invoice={invoiceByBooking[b.id]}
                    statusBusy={statusBusyBookingId === b.id}
                    downloading={downloadingBookingId === b.id}
                    downloadingInvoice={downloadingInvoiceBookingId === b.id}
                    onReject={() => setRejectTarget(b)}
                    onOfferDone={() => void refreshBookings()}
                    onEdit={() => setEditTarget(b)}
                    onOpenPdf={() => handleOpenPdf(b)}
                    onOpenInvoicePdf={() => handleOpenInvoicePdf(b)}
                    onChangeContractStatus={(workflow) =>
                      handleChangeContractStatus(b, workflow)
                    }
                    onChangeInvoiceStatus={(workflow) =>
                      handleChangeInvoiceStatus(b, workflow)
                    }
                    onChangePdfDeliveryStatus={(status) =>
                      handleChangePdfDeliveryStatus(b, status)
                    }
                    onChangeInvoiceDeliveryStatus={(status) =>
                      handleChangeInvoiceDeliveryStatus(b, status)
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="outline-none">
            {confirmed.length === 0 ? (
              <EmptyState
                title="Žiadne potvrdené akcie"
                text="Prijaté rezervácie s budúcim termínom uvidíš tu."
              />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-card/60 backdrop-blur-md">
                {confirmed.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    expanded={expandedId === b.id}
                    onToggle={() =>
                      setExpandedId((id) => (id === b.id ? null : b.id))
                    }
                    contract={contractByBooking[b.id]}
                    invoice={invoiceByBooking[b.id]}
                    statusBusy={statusBusyBookingId === b.id}
                    downloading={downloadingBookingId === b.id}
                    downloadingInvoice={downloadingInvoiceBookingId === b.id}
                    onEdit={() => setEditTarget(b)}
                    onOpenPdf={() => handleOpenPdf(b)}
                    onOpenInvoicePdf={() => handleOpenInvoicePdf(b)}
                    onChangeContractStatus={(workflow) =>
                      handleChangeContractStatus(b, workflow)
                    }
                    onChangeInvoiceStatus={(workflow) =>
                      handleChangeInvoiceStatus(b, workflow)
                    }
                    onChangePdfDeliveryStatus={(status) =>
                      handleChangePdfDeliveryStatus(b, status)
                    }
                    onChangeInvoiceDeliveryStatus={(status) =>
                      handleChangeInvoiceDeliveryStatus(b, status)
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="outline-none">
            {history.length === 0 ? (
              <EmptyState
                title="História je prázdna"
                text="Ukončené a odmietnuté rezervácie sa zobrazia tu."
              />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-card/60 backdrop-blur-md">
                {history.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    expanded={expandedId === b.id}
                    onToggle={() =>
                      setExpandedId((id) => (id === b.id ? null : b.id))
                    }
                    contract={contractByBooking[b.id]}
                    invoice={invoiceByBooking[b.id]}
                    statusBusy={statusBusyBookingId === b.id}
                    downloading={downloadingBookingId === b.id}
                    downloadingInvoice={downloadingInvoiceBookingId === b.id}
                    onEdit={() => setEditTarget(b)}
                    onOpenPdf={() => handleOpenPdf(b)}
                    onOpenInvoicePdf={() => handleOpenInvoicePdf(b)}
                    onChangeContractStatus={(workflow) =>
                      handleChangeContractStatus(b, workflow)
                    }
                    onChangeInvoiceStatus={(workflow) =>
                      handleChangeInvoiceStatus(b, workflow)
                    }
                    onChangePdfDeliveryStatus={(status) =>
                      handleChangePdfDeliveryStatus(b, status)
                    }
                    onChangeInvoiceDeliveryStatus={(status) =>
                      handleChangeInvoiceDeliveryStatus(b, status)
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Reveal>

      <RejectReasonDialog
        booking={rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        onConfirm={handleReject}
      />

      <EditBookingDialog
        booking={editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSave={handleSaveEdit}
      />
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-white/8 bg-card/40 px-6 py-14 text-center">
      <CalendarDays className="mx-auto size-8 text-zinc-600" />
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-zinc-500">{text}</p>
      <Link
        href="/dashboard/profile"
        className="mt-5 inline-flex text-sm text-violet-300 hover:text-violet-200"
      >
        Upraviť profil →
      </Link>
    </div>
  );
}

function StatusBadge({
  status,
  hasOffer,
}: {
  status: BookingStatus;
  hasOffer?: boolean;
}) {
  if (status === "accepted") {
    return (
      <Badge className="border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-200">
        <Check className="mr-1 size-3" />
        Potvrdené
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="border-red-500/30 bg-red-500/15 text-red-300">
        <Ban className="mr-1 size-3" />
        Odmietnuté
      </Badge>
    );
  }
  if (hasOffer) {
    return (
      <Badge className="border-violet-500/30 bg-violet-500/15 text-violet-200">
        <Clock className="mr-1 size-3" />
        Čaká na klienta
      </Badge>
    );
  }
  return (
    <Badge className="border-violet-500/30 bg-violet-500/15 text-violet-200">
      <Clock className="mr-1 size-3" />
      Nový dopyt
    </Badge>
  );
}

function BookingCard({
  booking,
  expanded,
  onToggle,
  contract,
  invoice,
  statusBusy,
  downloading,
  downloadingInvoice,
  onReject,
  onOfferDone,
  onEdit,
  onOpenPdf,
  onOpenInvoicePdf,
  onChangeContractStatus,
  onChangeInvoiceStatus,
  onChangePdfDeliveryStatus,
  onChangeInvoiceDeliveryStatus,
}: {
  booking: Booking;
  expanded: boolean;
  onToggle: () => void;
  contract?: BookingContractSummary;
  invoice?: BookingInvoiceSummary;
  statusBusy?: boolean;
  downloading?: boolean;
  downloadingInvoice?: boolean;
  onReject?: () => void;
  onOfferDone?: () => void;
  onEdit?: () => void;
  onOpenPdf?: () => void;
  onOpenInvoicePdf?: () => void;
  onChangeContractStatus?: (workflow: ContractWorkflowStatus) => void;
  onChangeInvoiceStatus?: (workflow: InvoiceWorkflowStatus) => void;
  onChangePdfDeliveryStatus?: (status: PdfDeliveryStatus) => void;
  onChangeInvoiceDeliveryStatus?: (status: PdfDeliveryStatus) => void;
}) {
  const contractUi = resolveContractUi(contract, booking.pdf_delivery_status);
  const invoiceUi = resolveInvoiceUi(invoice, booking.invoice_delivery_status);
  const currentWorkflow = workflowFromSummary(contract);
  const currentInvoiceWorkflow = invoiceWorkflowFromSummary(invoice);
  const currentDelivery =
    booking.pdf_delivery_status && booking.pdf_delivery_status !== "none"
      ? booking.pdf_delivery_status
      : "none";
  const currentInvoiceDelivery =
    booking.invoice_delivery_status &&
    booking.invoice_delivery_status !== "none"
      ? booking.invoice_delivery_status
      : "none";
  const canViewPdf = pdfAvailable(contract);
  const canViewInvoicePdf = invoicePdfAvailable(invoice);
  const [statusOpen, setStatusOpen] = useState(false);
  const [invoiceStatusOpen, setInvoiceStatusOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!statusOpen && !invoiceStatusOpen) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest(`[data-pdf-status="${booking.id}"]`)) return;
      if (target?.closest(`[data-invoice-status="${booking.id}"]`)) return;
      setStatusOpen(false);
      setInvoiceStatusOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [statusOpen, invoiceStatusOpen, booking.id]);

  return (
    <article
      className={cn(
        "relative overflow-visible border-b border-white/8 last:border-b-0",
        expanded && "bg-white/[0.025]",
        statusOpen || invoiceStatusOpen ? "z-40" : "z-0"
      )}
    >
      {/* Compact summary row */}
      <div className="flex items-center gap-2 px-3 py-3 md:gap-3 md:px-4 md:py-3.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/15 text-sm font-bold text-violet-100">
            {booking.client_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-white md:text-[0.95rem]">
                {booking.client_name}
              </p>
              <StatusBadge
                status={booking.status}
                hasOffer={
                  booking.status === "pending" && booking.dj_offer_price != null
                }
              />
              {booking.bulk_inquiry_id ? (
                <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                  Skupina
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-xs text-zinc-500">
              {formatEventTypeLabel(booking.event_type)}
              <span className="text-zinc-600"> · </span>
              {formatDateRange(booking.event_date, booking.end_date)}
              {booking.event_location ? (
                <>
                  <span className="text-zinc-600"> · </span>
                  {booking.event_location}
                </>
              ) : null}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-zinc-500 transition-transform duration-200",
              expanded && "rotate-180 text-violet-300"
            )}
          />
        </button>

        {booking.status === "pending" && onReject ? (
          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            {booking.dj_offer_price != null ? (
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-200">
                Ponuka {booking.dj_offer_price.toLocaleString("sk-SK")} €
              </span>
            ) : (
              <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium text-violet-200">
                Čaká na tvoju ponuku
              </span>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onReject}
              className="h-8 gap-1 rounded-full border-red-500/30 px-3 text-red-300 hover:bg-red-500/10"
            >
              <XCircle className="size-3.5" />
              Odmietnuť
            </Button>
          </div>
        ) : null}
      </div>

      {expanded ? (
        <div className="space-y-4 border-t border-white/8 px-4 pb-5 pt-4 md:px-5">
      {/* Meta chips */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
          {formatEventTypeLabel(booking.event_type)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-200">
          <CalendarDays className="size-3.5 text-violet-300" />
          {formatDateRange(booking.event_date, booking.end_date)}
        </span>
        {(booking.start_time || booking.end_time) && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-200">
            <Clock className="size-3.5 text-violet-300" />
            {booking.start_time ? timeInputValue(booking.start_time) : "—"}
            {" – "}
            {booking.end_time ? timeInputValue(booking.end_time) : "—"}
          </span>
        )}
        {booking.event_location ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
            <MapPin className="size-3.5 text-violet-400/70" />
            {booking.event_location}
          </span>
        ) : null}
      </div>

      {(booking.status === "pending" || booking.status === "accepted") && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors",
              chatOpen
                ? "border-violet-400/40 bg-violet-500/25 text-violet-100"
                : "border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
            )}
          >
            <MessageCircle className="size-3.5" />
            {chatOpen ? "Skryť chat" : "Chat"}
          </button>
          <p className="text-xs text-zinc-500">
            Prijaté {formatDateTime(booking.created_at)}
          </p>
        </div>
      )}

      {/* Contact */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-white/8 bg-white/[0.025] px-3.5 py-2.5 text-sm">
        <Mail className="size-3.5 shrink-0 text-zinc-500" />
        <a
          href={`mailto:${booking.client_email}`}
          className="truncate text-zinc-200 transition-colors hover:text-violet-300"
        >
          {booking.client_email}
        </a>
        {booking.client_phone ? (
          <a
            href={`tel:${booking.client_phone}`}
            className="text-zinc-400 transition-colors hover:text-violet-300"
          >
            {booking.client_phone}
          </a>
        ) : null}
      </div>

      {chatOpen &&
      (booking.status === "pending" || booking.status === "accepted") ? (
        <div>
          <BookingChat bookingId={booking.id} compact />
        </div>
      ) : null}

      {booking.message || booking.client_budget != null ? (
        <div className="rounded-2xl border border-white/8 bg-black/20 px-3.5 py-2.5">
          {booking.message ? (
            <>
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Predstava / popis od klienta
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {booking.message}
              </p>
            </>
          ) : null}
          {booking.client_budget != null ? (
            <div
              className={
                booking.message
                  ? "mt-2 flex items-baseline justify-between gap-4"
                  : "flex items-baseline justify-between gap-4"
              }
            >
              <span className="text-xs text-zinc-500">Rozpočet cca</span>
              <span className="text-sm font-semibold tabular-nums text-zinc-200">
                {booking.client_budget.toLocaleString("sk-SK")} €
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {booking.status === "rejected" && booking.rejection_reason && (
        <div className="rounded-xl border border-red-500/15 bg-red-500/[0.04] px-3 py-2.5 text-xs text-red-300/90">
          <span className="font-medium text-red-300">Dôvod: </span>
          {booking.rejection_reason}
        </div>
      )}

      {booking.status === "pending" ? (
        <DjOfferForm
          bookingId={booking.id}
          mode={booking.bulk_inquiry_id ? "bulk" : "single"}
          clientBudget={booking.client_budget}
          existingOfferPrice={booking.dj_offer_price}
          existingOfferMessage={booking.dj_offer_message}
          onDone={onOfferDone}
        />
      ) : null}

      {booking.status === "pending" && onReject && (
        <div className="flex flex-wrap gap-2 border-t border-white/8 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onReject}
            className="gap-1.5 rounded-full border-red-500/30 text-red-300 hover:bg-red-500/10"
          >
            <XCircle className="size-4" />
            Odmietnuť
          </Button>
          {onEdit ? (
            <Button
              type="button"
              variant="outline"
              onClick={onEdit}
              className="gap-1.5 rounded-full"
            >
              <Pencil className="size-3.5" />
              Upraviť
            </Button>
          ) : null}
        </div>
      )}

      {booking.status === "pending" &&
      booking.dj_offer_price != null &&
      !booking.bulk_inquiry_id ? (
        <p className="text-xs text-zinc-500">
          Ponuka {booking.dj_offer_price.toLocaleString("sk-SK")} € čaká na
          potvrdenie klienta.
        </p>
      ) : null}

      {booking.status === "accepted" && (
        <div className="mt-5 space-y-3 border-t border-white/8 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Dokumenty
            </p>
            {onEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="h-8 gap-1.5 rounded-full"
              >
                <Pencil className="size-3.5" />
                Upraviť
              </Button>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {/* Contract status cell */}
            <div
              className={cn(
                "relative flex cursor-pointer items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 transition-colors hover:bg-white/[0.05]",
                statusOpen && "z-50"
              )}
              data-pdf-status={booking.id}
              onClick={() => {
                if (statusBusy) return;
                setStatusOpen((v) => !v);
                setInvoiceStatusOpen(false);
              }}
            >
              <FileText className="size-3.5 shrink-0 text-zinc-500" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Zmluva
                </p>
                <p className="truncate text-sm text-zinc-200">
                  {contractUi.label}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {canViewPdf ? (
                  <button
                    type="button"
                    disabled={downloading}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPdf?.();
                    }}
                    className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                    title="Zobraziť PDF"
                  >
                    {downloading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                  </button>
                ) : null}
                <span
                  className="rounded-lg p-1.5 text-zinc-400"
                  title="Stav zmluvy"
                >
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      statusOpen && "rotate-180"
                    )}
                  />
                </span>
              </div>
              {statusOpen ? (
                <div
                  className="absolute bottom-full left-0 z-50 mb-2 min-w-[240px] rounded-2xl border border-white/10 bg-[#121212] p-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!contract ? (
                    <>
                      <Link
                        href={`/dashboard/contracts/generate?bookingId=${booking.id}`}
                        className="block rounded-xl px-3 py-2 text-sm text-violet-200 transition-colors hover:bg-violet-500/10"
                        onClick={() => setStatusOpen(false)}
                      >
                        Vygenerovať PDF zmluvu
                      </Link>
                      <div className="my-1 border-t border-white/10" />
                      <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        Manuálny stav
                      </p>
                      {MANUAL_DELIVERY_OPTIONS.map((opt) => {
                        const active = currentDelivery === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={statusBusy || active}
                            onClick={() => {
                              setStatusOpen(false);
                              onChangePdfDeliveryStatus?.(opt.value);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                              active
                                ? "bg-violet-500/15 text-violet-200"
                                : "text-zinc-200 hover:bg-white/5"
                            )}
                          >
                            {opt.label}
                            {active ? <Check className="size-3.5" /> : null}
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    WORKFLOW_OPTIONS.map((opt) => {
                      const active = currentWorkflow === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={statusBusy || active}
                          onClick={() => {
                            setStatusOpen(false);
                            onChangeContractStatus?.(opt.value);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                            active
                              ? "bg-violet-500/15 text-violet-200"
                              : "text-zinc-200 hover:bg-white/5"
                          )}
                        >
                          {opt.label}
                          {active ? <Check className="size-3.5" /> : null}
                        </button>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>

            {/* Invoice status cell */}
            <div
              className={cn(
                "relative flex cursor-pointer items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 transition-colors hover:bg-white/[0.05]",
                invoiceStatusOpen && "z-50"
              )}
              data-invoice-status={booking.id}
              onClick={() => {
                if (statusBusy) return;
                setInvoiceStatusOpen((v) => !v);
                setStatusOpen(false);
              }}
            >
              <Receipt className="size-3.5 shrink-0 text-zinc-500" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Faktúra
                </p>
                <p className="truncate text-sm text-zinc-200">
                  {invoiceUi.label}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {canViewInvoicePdf ? (
                  <button
                    type="button"
                    disabled={downloadingInvoice}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenInvoicePdf?.();
                    }}
                    className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                    title="Zobraziť PDF"
                  >
                    {downloadingInvoice ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                  </button>
                ) : null}
                <span
                  className="rounded-lg p-1.5 text-zinc-400"
                  title="Stav faktúry"
                >
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      invoiceStatusOpen && "rotate-180"
                    )}
                  />
                </span>
              </div>
              {invoiceStatusOpen ? (
                <div
                  className="absolute bottom-full left-0 z-50 mb-2 min-w-[240px] rounded-2xl border border-white/10 bg-[#121212] p-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!invoice ? (
                    <>
                      <Link
                        href={`/dashboard/invoices/generate?bookingId=${booking.id}`}
                        className="block rounded-xl px-3 py-2 text-sm text-violet-200 transition-colors hover:bg-violet-500/10"
                        onClick={() => setInvoiceStatusOpen(false)}
                      >
                        Vystaviť faktúru
                      </Link>
                      <div className="my-1 border-t border-white/10" />
                      <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        Manuálny stav
                      </p>
                      {MANUAL_INVOICE_OPTIONS.map((opt) => {
                        const active = currentInvoiceDelivery === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={statusBusy || active}
                            onClick={() => {
                              setInvoiceStatusOpen(false);
                              onChangeInvoiceDeliveryStatus?.(opt.value);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                              active
                                ? "bg-violet-500/15 text-violet-200"
                                : "text-zinc-200 hover:bg-white/5"
                            )}
                          >
                            {opt.label}
                            {active ? <Check className="size-3.5" /> : null}
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/dashboard/invoices/generate?bookingId=${booking.id}`}
                        className="block rounded-xl px-3 py-2 text-sm text-violet-200 transition-colors hover:bg-violet-500/10"
                        onClick={() => setInvoiceStatusOpen(false)}
                      >
                        Vystaviť novú faktúru
                      </Link>
                      <div className="my-1 border-t border-white/10" />
                      {WORKFLOW_OPTIONS.map((opt) => {
                        const active = currentInvoiceWorkflow === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={statusBusy || active}
                            onClick={() => {
                              setInvoiceStatusOpen(false);
                              onChangeInvoiceStatus?.(opt.value);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                              active
                                ? "bg-violet-500/15 text-violet-200"
                                : "text-zinc-200 hover:bg-white/5"
                            )}
                          >
                            {opt.label}
                            {active ? <Check className="size-3.5" /> : null}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {booking.status === "accepted" ? (
        <div className="mt-5 space-y-3 border-t border-white/8 pt-4">
          {(booking.price != null ||
            booking.dj_offer_price != null ||
            booking.base_price != null) && (
            <div className="flex items-baseline justify-between gap-6 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Dohodnutá cena
              </p>
              <p className="text-xl font-semibold tabular-nums text-white">
                {Number(
                  booking.price ?? booking.dj_offer_price ?? booking.base_price
                ).toLocaleString("sk-SK", { maximumFractionDigits: 2 })}{" "}
                €
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-end justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Príprava akcie
            </p>
          </div>
          <LiveRequestQr bookingId={booking.id} mode="dj" />
          <BookingExtras bookingId={booking.id} mode="dj" />
          <MusicPlanner bookingId={booking.id} mode="dj" />
          <EventTimeline bookingId={booking.id} mode="dj" />
        </div>
      ) : null}

      {booking.status === "rejected" && onEdit ? (
        <div className="flex flex-wrap gap-2 border-t border-white/8 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="gap-1.5 rounded-full"
          >
            <Pencil className="size-3.5" />
            Upraviť údaje
          </Button>
        </div>
      ) : null}
        </div>
      ) : null}
    </article>
  );
}

type EditBookingValues = {
  eventType: string;
  eventDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  eventLocation: string | null;
  message: string | null;
  clientPhone: string | null;
  clientName: string | null;
};

function EditBookingDialog({
  booking,
  onOpenChange,
  onSave,
}: {
  booking: Booking | null;
  onOpenChange: (open: boolean) => void;
  onSave: (
    values: EditBookingValues
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [eventType, setEventType] = useState("ine");
  const [eventDate, setEventDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!booking) return;
    setClientName(booking.client_name);
    setClientPhone(booking.client_phone ?? "");
    setEventType(booking.event_type || "ine");
    setEventDate(booking.event_date);
    setEndDate(booking.end_date ?? booking.event_date);
    setStartTime(timeInputValue(booking.start_time));
    setEndTime(timeInputValue(booking.end_time));
    setEventLocation(booking.event_location ?? "");
    setMessage(booking.message ?? "");
    setSubmitting(false);
  }, [booking]);

  const handleConfirm = async () => {
    if (!booking) return;
    setSubmitting(true);
    await onSave({
      clientName: clientName.trim() || null,
      clientPhone: clientPhone.trim() || null,
      eventType,
      eventDate,
      endDate: endDate || eventDate,
      startTime: startTime || null,
      endTime: endTime || null,
      eventLocation: eventLocation.trim() || null,
      message: message.trim() || null,
    });
    setSubmitting(false);
  };

  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upraviť rezerváciu</DialogTitle>
          <DialogDescription>
            Zmeň termín, typ akcie, časy alebo kontaktné údaje.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Meno zákazníka</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="h-10 rounded-xl bg-white/[0.03]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Telefón</Label>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="h-10 rounded-xl bg-white/[0.03]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Typ akcie</Label>
            <Select value={eventType} onValueChange={(v) => v && setEventType(v)}>
              <SelectTrigger className="h-10 w-full rounded-xl">
                <SelectValue>
                  {(value: string | null) =>
                    value ? formatEventTypeLabel(value) : null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {[
                  ...EVENT_TYPES,
                  ...(!EVENT_TYPES.some((t) => t.value === eventType)
                    ? [
                        {
                          value: eventType,
                          label: formatEventTypeLabel(eventType),
                        } as const,
                      ]
                    : []),
                ].map((t) => (
                  <SelectItem key={t.value} value={t.value} label={t.label}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Dátum začiatku</Label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="h-10 rounded-xl bg-white/[0.03]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Dátum konca</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 rounded-xl bg-white/[0.03]"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Začiatok</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-10 rounded-xl bg-white/[0.03]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Koniec</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-10 rounded-xl bg-white/[0.03]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Miesto</Label>
            <Input
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              className="h-10 rounded-xl bg-white/[0.03]"
              placeholder="Adresa / klub"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Poznámka</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Interná poznámka alebo správa od klienta…"
            />
          </div>
        </div>

        <DialogFooter>
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
            disabled={submitting || !eventDate || !eventType}
            onClick={handleConfirm}
            className="gap-2 rounded-full"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Uložiť zmeny
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectReasonDialog({
  booking,
  onOpenChange,
  onConfirm,
}: {
  booking: Booking | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (booking) {
      setReason("");
      setSubmitting(false);
    }
  }, [booking]);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    await onConfirm(reason.trim());
    setSubmitting(false);
  };

  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Odmietnuť rezerváciu</DialogTitle>
          <DialogDescription>
            Napíš klientovi dôvod — uvidí ho vo svojom dashboarde.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Napr. Už mám iný gig v tento termín…"
          rows={4}
        />
        <DialogFooter>
          <Button
            type="button"
            disabled={submitting || !reason.trim()}
            onClick={handleConfirm}
            className="gap-2 rounded-full bg-red-500/90 text-white hover:bg-red-500"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <XCircle className="size-4" />
            )}
            Potvrdiť odmietnutie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
