/**
 * Transactional e-mail helpers for bookings, contracts and admin contact.
 * All paths go through `sendAppEmail` (Resend SDK) and never throw to callers.
 */

import { sendAppEmail, getAdminEmail, getSiteUrl } from "@/lib/email/send-app-email";
import {
  bookingRequestEmailHtml,
  bookingStatusEmailHtml,
  contactAdminEmailHtml,
  contractDocumentEmailHtml,
  contractFilledEmailHtml,
} from "@/lib/email/templates";

const EVENT_TYPE_LABELS: Record<string, string> = {
  svadba: "Svadba",
  rodinna_akcia: "Rodinná akcia",
  oslava: "Oslava",
  klub: "Klub",
  firemny_event: "Firemný event",
  ine: "Iné",
  blockout: "Nedostupnosť",
};

function formatEventType(eventType: string) {
  return EVENT_TYPE_LABELS[eventType] ?? eventType;
}

function formatEventDate(isoDate: string) {
  try {
    return new Date(isoDate).toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

export type BookingEmailExtras = {
  djName?: string | null;
  eventLocation?: string | null;
  clientName?: string | null;
  /** Reply-To for the DJ notification (client e-mail). */
  clientEmail?: string | null;
  /** Reply-To for the client status e-mail (DJ e-mail). */
  djEmail?: string | null;
};

/**
 * Notify a client that their booking request was accepted or rejected.
 * Reply-To is the DJ so the client can answer straight from their inbox.
 */
export async function sendBookingStatusEmail(
  clientEmail: string,
  status: "accepted" | "rejected",
  eventType: string,
  eventDate: string,
  extras: BookingEmailExtras & { rejectionReason?: string | null } = {}
): Promise<{ ok: boolean; mode: "stub" | "resend"; error?: string }> {
  const label = formatEventType(eventType);
  const prettyDate = formatEventDate(eventDate);
  const site = getSiteUrl();

  return sendAppEmail({
    to: clientEmail,
    subject:
      status === "accepted"
        ? `Rezervácia prijatá — ${label} · ${prettyDate}`
        : `Rezervácia zamietnutá — ${label} · ${prettyDate}`,
    replyTo: extras.djEmail,
    html: bookingStatusEmailHtml({
      status,
      clientName: extras.clientName,
      djName: extras.djName,
      eventTypeLabel: label,
      eventDateLabel: prettyDate,
      rejectionReason: extras.rejectionReason,
      dashboardUrl:
        status === "accepted"
          ? `${site}/client-dashboard`
          : `${site}/djs`,
    }),
  });
}

/**
 * Notify the DJ that a new booking request arrived.
 * Reply-To is the client so the DJ can answer straight from their inbox.
 */
export async function sendBookingNotificationEmail(
  djEmail: string,
  eventType: string,
  eventDate: string,
  extras: BookingEmailExtras = {}
): Promise<{ ok: boolean; mode: "stub" | "resend"; error?: string }> {
  const label = formatEventType(eventType);
  const prettyDate = formatEventDate(eventDate);
  const site = getSiteUrl();

  return sendAppEmail({
    to: djEmail,
    subject: `Nová žiadosť o rezerváciu: ${label} · ${prettyDate}`,
    replyTo: extras.clientEmail,
    html: bookingRequestEmailHtml({
      djName: extras.djName,
      clientName: extras.clientName,
      eventTypeLabel: label,
      eventDateLabel: prettyDate,
      eventLocation: extras.eventLocation,
      dashboardUrl: `${site}/dashboard/bookings`,
    }),
  });
}

/**
 * Notify a client that a DJ sent a contract/invoice PDF into their profile.
 */
export async function sendContractDocumentEmail(input: {
  clientEmail: string;
  clientName?: string | null;
  djName?: string | null;
  documentName?: string | null;
  documentsUrl?: string | null;
  djEmail?: string | null;
  needsClientFill?: boolean;
}): Promise<{ ok: boolean; mode: "stub" | "resend"; error?: string }> {
  const djName = input.djName?.trim() || "DJ";
  const docName = input.documentName?.trim() || "zmluvu / faktúru";
  const docsUrl =
    input.documentsUrl || `${getSiteUrl()}/client-dashboard/documents`;
  const needsFill = !!input.needsClientFill;

  return sendAppEmail({
    to: input.clientEmail,
    subject: needsFill
      ? `Doplň údaje v dokumente od ${djName}: ${docName}`
      : `Nový dokument od ${djName}: ${docName}`,
    replyTo: input.djEmail,
    html: contractDocumentEmailHtml({
      clientName: input.clientName,
      djName,
      documentName: docName,
      documentsUrl: docsUrl,
      needsClientFill: needsFill,
    }),
  });
}

/** Notify the DJ that a client finished filling a pending contract. */
export async function sendContractFilledEmail(input: {
  djEmail: string;
  djName?: string | null;
  clientName?: string | null;
  documentName?: string | null;
  dashboardUrl?: string | null;
  clientEmail?: string | null;
}): Promise<{ ok: boolean; mode: "stub" | "resend"; error?: string }> {
  const docName = input.documentName?.trim() || "zmluvu / faktúru";
  const dashUrl =
    input.dashboardUrl || `${getSiteUrl()}/dashboard/contracts/generate`;

  return sendAppEmail({
    to: input.djEmail,
    subject: `Zákazník vyplnil dokument: ${docName}`,
    replyTo: input.clientEmail,
    html: contractFilledEmailHtml({
      djName: input.djName,
      clientName: input.clientName,
      documentName: docName,
      dashboardUrl: dashUrl,
    }),
  });
}

/**
 * Forward a public contact-form message to the platform admin.
 * Reply-To is the visitor so admin can answer directly.
 */
export async function sendContactEmail(input: {
  name: string;
  email: string;
  message: string;
  subject?: string | null;
}): Promise<{ ok: boolean; mode: "stub" | "resend"; error?: string }> {
  const to = getAdminEmail();
  if (!to) {
    console.error(
      "[sendContactEmail] ADMIN_EMAIL / CONTACT_EMAIL is not configured"
    );
    console.log(
      `[EMAIL STUB → ADMIN] Kontakt od ${input.name} <${input.email}>`
    );
    return {
      ok: true,
      mode: "stub",
      error: "ADMIN_EMAIL nie je nastavený",
    };
  }

  const subjectLine = input.subject?.trim()
    ? `Kontakt: ${input.subject.trim()}`
    : `Kontakt: ${input.name}`;

  return sendAppEmail({
    to,
    subject: subjectLine,
    replyTo: input.email,
    html: contactAdminEmailHtml({
      name: input.name,
      email: input.email,
      subject: input.subject,
      message: input.message,
    }),
  });
}
