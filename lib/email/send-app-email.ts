import { Resend } from "resend";
import { BRAND } from "@/lib/brand";

export type SendAppEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string | null;
};

export type SendAppEmailResult = {
  ok: boolean;
  mode: "resend" | "stub";
  id?: string;
  error?: string;
};

function resolveFromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "BookTheVibe <onboarding@resend.dev>"
  );
}

/**
 * Universal Resend sender. Never throws — callers must not block DB writes on
 * mail failures. Without RESEND_API_KEY falls back to a console stub.
 */
export async function sendAppEmail(
  input: SendAppEmailInput
): Promise<SendAppEmailResult> {
  const to = (Array.isArray(input.to) ? input.to : [input.to])
    .map((e) => e.trim())
    .filter(Boolean);
  const subject = input.subject.trim();
  const html = input.html;
  const replyTo = input.replyTo?.trim() || undefined;

  if (to.length === 0 || !subject || !html) {
    console.error("[sendAppEmail] missing to/subject/html");
    return { ok: false, mode: "stub", error: "Neplatné e-mailové údaje." };
  }

  const stubLine = `[EMAIL STUB] → ${to.join(", ")} | ${subject}${
    replyTo ? ` | reply-to: ${replyTo}` : ""
  }`;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.log(stubLine);
    return { ok: true, mode: "stub" };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: resolveFromAddress(),
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });

    if (error) {
      console.error("[sendAppEmail] Resend error:", error);
      console.log(stubLine);
      return {
        ok: true,
        mode: "stub",
        error: error.message || "Resend error",
      };
    }

    console.log(
      `[EMAIL SENT via Resend] id=${data?.id ?? "?"} → ${to.join(", ")} | ${subject}`
    );
    return { ok: true, mode: "resend", id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resend request failed";
    console.error("[sendAppEmail] exception:", message);
    console.log(stubLine);
    return { ok: true, mode: "stub", error: message };
  }
}

export function getAdminEmail(): string | null {
  return (
    process.env.ADMIN_EMAIL?.trim() ||
    process.env.CONTACT_EMAIL?.trim() ||
    null
  );
}

/** True for localhost / LAN hosts that must never appear in guest-facing links. */
function isNonPublicSiteUrl(url: string): boolean {
  try {
    const host = new URL(
      /^https?:\/\//i.test(url) ? url : `https://${url}`
    ).hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return true;
    }
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    return false;
  } catch {
    return true;
  }
}

/**
 * Canonical public site URL for QR links, emails, etc.
 * Ignores localhost / LAN values in NEXT_PUBLIC_SITE_URL (e.g. 192.168.x.x).
 */
export function getSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (raw && !isNonPublicSiteUrl(raw)) return raw;
  return BRAND.url.replace(/\/$/, "");
}
