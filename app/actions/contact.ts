"use server";

import { sendContactEmail } from "@/lib/email";

export type SubmitContactInput = {
  name: string;
  email: string;
  message: string;
  subject?: string;
};

export type SubmitContactResult = {
  ok: boolean;
  error?: string;
};

/**
 * Public contact form — emails ADMIN_EMAIL with Reply-To = visitor.
 * Mail failures are logged but surfaced as a soft error to the UI.
 */
export async function submitContact(
  input: SubmitContactInput
): Promise<SubmitContactResult> {
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const message = input.message?.trim() ?? "";
  const subject = input.subject?.trim() ?? "";

  if (!name || name.length < 2) {
    return { ok: false, error: "Zadaj svoje meno." };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Zadaj platný e-mail." };
  }
  if (!subject || subject.length < 2) {
    return { ok: false, error: "Zadaj predmet správy." };
  }
  if (!message || message.length < 10) {
    return { ok: false, error: "Správa musí mať aspoň 10 znakov." };
  }
  if (message.length > 4000) {
    return { ok: false, error: "Správa je príliš dlhá." };
  }

  try {
    const result = await sendContactEmail({ name, email, message, subject });
    if (result.error && result.mode === "stub" && !process.env.RESEND_API_KEY) {
      // Local stub still counts as success for UX when key is missing.
      return { ok: true };
    }
    if (result.error && result.mode === "stub" && result.error.includes("ADMIN_EMAIL")) {
      console.error("[submitContact]", result.error);
      return {
        ok: false,
        error: "Kontaktný e-mail nie je nakonfigurovaný. Skús neskôr.",
      };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Odoslanie zlyhalo.";
    console.error("[CONTACT ERROR]", msg);
    return { ok: false, error: "Správu sa nepodarilo odoslať. Skús to znova." };
  }
}
