/** Shared dark premium HTML shell for transactional emails. */

import { BRAND } from "@/lib/brand";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(opts: {
  title: string;
  titleColor?: string;
  bodyHtml: string;
  cta?: { href: string; label: string; large?: boolean } | null;
  footer?: string;
}): string {
  const titleColor = opts.titleColor ?? "#f4f4f5";
  const cta = opts.cta
    ? `<a href="${escapeHtml(opts.cta.href)}"
         style="display:inline-block;margin-top:${opts.cta.large ? "16px" : "8px"};padding:${opts.cta.large ? "16px 32px" : "12px 20px"};border-radius:${opts.cta.large ? "14px" : "999px"};background:linear-gradient(90deg,#7c3aed,#c026d3);color:#fff;text-decoration:none;font-size:${opts.cta.large ? "16px" : "14px"};font-weight:600;box-shadow:0 8px 24px rgba(124,58,237,0.35);">
        ${escapeHtml(opts.cta.label)}
      </a>`
    : "";
  const footer =
    opts.footer ||
    `${BRAND.name} — tento e-mail bol odoslaný automaticky.`;
  const logoSrc = `${BRAND.url}${BRAND.logoPngPath}`;

  return `<!DOCTYPE html>
<html lang="sk">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#050505;">
  <div style="font-family:Outfit,Segoe UI,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:28px 16px;">
    <div style="background:#0A0A0A;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px 24px;color:#f4f4f5;">
      <div style="margin-bottom:16px;">
        <img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(BRAND.name)}" width="200" height="116" style="display:block;border:0;outline:none;height:auto;max-width:200px;" />
      </div>
      <h1 style="font-size:22px;line-height:1.25;margin:0 0 12px;color:${titleColor};">${opts.title}</h1>
      ${opts.bodyHtml}
      ${cta}
      <p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#71717a;">${escapeHtml(footer)}</p>
    </div>
  </div>
</body>
</html>`;
}

function detailRows(
  rows: { label: string; value: string | null | undefined }[]
): string {
  const cells = rows
    .filter((r) => r.value)
    .map(
      (r) => `<tr>
      <td style="padding:8px 0;color:#71717a;font-size:14px;">${escapeHtml(r.label)}</td>
      <td style="padding:8px 0;text-align:right;font-weight:600;font-size:14px;color:#f4f4f5;">${escapeHtml(r.value!)}</td>
    </tr>`
    )
    .join("");
  if (!cells) return "";
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0 8px;">${cells}</table>`;
}

export function bookingRequestEmailHtml(input: {
  djName?: string | null;
  clientName?: string | null;
  eventTypeLabel: string;
  eventDateLabel: string;
  eventLocation?: string | null;
  dashboardUrl: string;
}): string {
  const greeting = input.djName
    ? `Ahoj ${escapeHtml(input.djName)},`
    : "Ahoj,";
  return shell({
    title: "Máte novú žiadosť o rezerváciu",
    titleColor: "#c4b5fd",
    bodyHtml: `
      <p style="color:#a1a1aa;margin:0 0 8px;font-size:15px;line-height:1.55;">${greeting}</p>
      <p style="color:#d4d4d8;margin:0 0 8px;font-size:15px;line-height:1.55;">
        Klient ti poslal nezáväzný dopyt. Odpovedz priamo na tento e-mail — správa pôjde zákazníkovi.
      </p>
      ${detailRows([
        { label: "Klient", value: input.clientName },
        { label: "Typ akcie", value: input.eventTypeLabel },
        { label: "Dátum", value: input.eventDateLabel },
        { label: "Miesto", value: input.eventLocation },
      ])}
    `,
    cta: { href: input.dashboardUrl, label: "Otvoriť rezervácie" },
  });
}

export function bookingStatusEmailHtml(input: {
  status: "accepted" | "rejected";
  clientName?: string | null;
  djName?: string | null;
  eventTypeLabel: string;
  eventDateLabel: string;
  rejectionReason?: string | null;
  dashboardUrl: string;
}): string {
  const accepted = input.status === "accepted";
  const greeting = input.clientName
    ? `Ahoj ${escapeHtml(input.clientName)},`
    : "Ahoj,";
  const dj = escapeHtml(input.djName || "Umelec");

  return shell({
    title: accepted
      ? "Tvoja rezervácia bola prijatá"
      : "Tvoja rezervácia bola zamietnutá",
    titleColor: accepted ? "#34d399" : "#f87171",
    bodyHtml: `
      <p style="color:#a1a1aa;margin:0 0 8px;font-size:15px;line-height:1.55;">${greeting}</p>
      <p style="color:#d4d4d8;margin:0 0 8px;font-size:15px;line-height:1.55;">
        ${
          accepted
            ? `<strong style="color:#fff;">${dj}</strong> potvrdil/a tvoju rezerváciu.`
            : `<strong style="color:#fff;">${dj}</strong> bohužiaľ nemôže prijať tvoju rezerváciu.`
        }
        ${
          accepted
            ? " Ak potrebuješ niečo doriešiť, odpovedz priamo na tento e-mail."
            : ""
        }
      </p>
      ${detailRows([
        { label: "Typ akcie", value: input.eventTypeLabel },
        { label: "Dátum", value: input.eventDateLabel },
      ])}
      ${
        !accepted && input.rejectionReason
          ? `<p style="margin:12px 0 0;padding:14px 16px;background:#18181b;border-radius:12px;font-size:14px;line-height:1.5;color:#e4e4e7;">„${escapeHtml(input.rejectionReason)}“</p>`
          : ""
      }
    `,
    cta: {
      href: input.dashboardUrl,
      label: accepted ? "Otvoriť moje dopyty" : "Nájsť iného umelca",
    },
  });
}

export function contractDocumentEmailHtml(input: {
  clientName?: string | null;
  djName?: string | null;
  documentName?: string | null;
  documentsUrl: string;
  needsClientFill?: boolean;
}): string {
  const greeting = input.clientName
    ? `Ahoj ${escapeHtml(input.clientName)},`
    : "Ahoj,";
  const dj = escapeHtml(input.djName || "Umelec");
  const doc = escapeHtml(input.documentName || "zmluvu / faktúru");
  const needsFill = !!input.needsClientFill;

  return shell({
    title: needsFill ? "Doplň údaje v dokumente" : "Máš nový dokument",
    titleColor: "#c4b5fd",
    bodyHtml: `
      <p style="color:#a1a1aa;margin:0 0 8px;font-size:15px;line-height:1.55;">${greeting}</p>
      <p style="color:#d4d4d8;margin:0 0 8px;font-size:15px;line-height:1.55;">
        <strong style="color:#fff;">${dj}</strong> ti poslal dokument
        <strong style="color:#fff;">${doc}</strong> do tvojho profilu.
        ${
          needsFill
            ? "Doplň svoje údaje, ulož dokument a potom si ho môžeš stiahnuť ako PDF."
            : ""
        }
      </p>
    `,
    cta: {
      href: input.documentsUrl,
      label: needsFill ? "Doplniť údaje" : "Otvoriť dokumenty",
    },
  });
}

export function contractFilledEmailHtml(input: {
  djName?: string | null;
  clientName?: string | null;
  documentName?: string | null;
  dashboardUrl: string;
}): string {
  const greeting = input.djName
    ? `Ahoj ${escapeHtml(input.djName)},`
    : "Ahoj,";
  const client = escapeHtml(input.clientName || "Zákazník");
  const doc = escapeHtml(input.documentName || "zmluvu / faktúru");

  return shell({
    title: "Zákazník vyplnil dokument",
    titleColor: "#6ee7b7",
    bodyHtml: `
      <p style="color:#a1a1aa;margin:0 0 8px;font-size:15px;line-height:1.55;">${greeting}</p>
      <p style="color:#d4d4d8;margin:0 0 8px;font-size:15px;line-height:1.55;">
        <strong style="color:#fff;">${client}</strong> doplnil údaje v dokumente
        <strong style="color:#fff;">${doc}</strong>. Stav je teraz
        <strong style="color:#6ee7b7;">vyplnená</strong>.
      </p>
    `,
    cta: { href: input.dashboardUrl, label: "Otvoriť PDF zmluvy" },
  });
}

export function contactAdminEmailHtml(input: {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
}): string {
  return shell({
    title: "Nová správa z kontaktného formulára",
    titleColor: "#c4b5fd",
    bodyHtml: `
      <p style="color:#a1a1aa;margin:0 0 8px;font-size:15px;line-height:1.55;">
        Niekto ťa kontaktoval cez BookTheVibe. Odpovedz priamo na tento e-mail.
      </p>
      ${detailRows([
        { label: "Meno", value: input.name },
        { label: "E-mail", value: input.email },
        { label: "Predmet", value: input.subject },
      ])}
      <p style="margin:16px 0 0;padding:14px 16px;background:#18181b;border-radius:12px;font-size:14px;line-height:1.55;color:#e4e4e7;white-space:pre-wrap;">${escapeHtml(input.message)}</p>
    `,
  });
}

/** Thank-you + Google review request sent 1–2 days after a successful event. */
export function googleReviewRequestEmailHtml(input: {
  clientName?: string | null;
  djName?: string | null;
  eventTypeLabel: string;
  eventDateLabel: string;
  reviewUrl: string;
}): string {
  const greeting = input.clientName
    ? `Dobrý deň ${escapeHtml(input.clientName)},`
    : "Dobrý deň,";
  const dj = escapeHtml(input.djName || "Umelec");

  return shell({
    title: "Ďakujem za úžasnú akciu",
    titleColor: "#f0abfc",
    bodyHtml: `
      <p style="color:#a1a1aa;margin:0 0 8px;font-size:15px;line-height:1.55;">${greeting}</p>
      <p style="color:#d4d4d8;margin:0 0 8px;font-size:15px;line-height:1.55;">
        Bola to úžasná akcia! Ďakujem, že som mohol byť súčasťou vášho dňa.
      </p>
      <p style="color:#d4d4d8;margin:0 0 8px;font-size:15px;line-height:1.55;">
        Veľmi mi pomôže, ak moju prácu ohodnotíte krátkou recenziou na Google —
        zaberie to len chvíľku a znamená to pre mňa veľa.
      </p>
      ${detailRows([
        { label: "Umelec", value: input.djName },
        { label: "Typ akcie", value: input.eventTypeLabel },
        { label: "Dátum", value: input.eventDateLabel },
      ])}
      <p style="color:#71717a;margin:12px 0 0;font-size:13px;line-height:1.5;">
        S pozdravom,<br/>
        <strong style="color:#e4e4e7;">${dj}</strong>
      </p>
    `,
    cta: {
      href: input.reviewUrl,
      label: "Ohodnotiť umelca",
      large: true,
    },
    footer:
      "BookTheVibe — tento e-mail bol odoslaný automaticky po ukončení akcie.",
  });
}

export function bookingChatEmailHtml(input: {
  recipientName?: string | null;
  senderName: string;
  preview: string;
  chatUrl: string;
  eventTypeLabel: string;
  eventDateLabel: string;
}): string {
  const greeting = input.recipientName
    ? `Ahoj ${escapeHtml(input.recipientName)},`
    : "Ahoj,";
  const fullMessage = escapeHtml(input.preview).replace(/\n/g, "<br/>");
  return shell({
    title: "Nová správa v chate",
    titleColor: "#c4b5fd",
    bodyHtml: `
      <p style="color:#a1a1aa;margin:0 0 8px;font-size:15px;line-height:1.55;">${greeting}</p>
      <p style="color:#d4d4d8;margin:0 0 8px;font-size:15px;line-height:1.55;">
        <strong style="color:#f4f4f5;">${escapeHtml(input.senderName)}</strong> ti napísal(a) v BookTheVibe:
      </p>
      <div style="color:#e4e4e7;margin:12px 0;padding:14px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;font-size:15px;line-height:1.55;white-space:pre-wrap;">
        ${fullMessage}
      </div>
      ${detailRows([
        { label: "Typ akcie", value: input.eventTypeLabel },
        { label: "Dátum", value: input.eventDateLabel },
      ])}
      <p style="color:#71717a;margin:12px 0 0;font-size:13px;line-height:1.5;">
        Toto je upozornenie aj kópia správy. Odpovedať môžeš priamo v chate v appke.
      </p>
    `,
    cta: { href: input.chatUrl, label: "Otvoriť chat a odpovedať", large: true },
  });
}
