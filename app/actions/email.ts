"use server";

import {
  sendAppEmail as sendAppEmailCore,
  type SendAppEmailInput,
  type SendAppEmailResult,
} from "@/lib/email/send-app-email";

/**
 * Server Action wrapper around the universal Resend sender.
 * Safe to call from other server actions / route handlers.
 */
export async function sendAppEmail(
  input: SendAppEmailInput
): Promise<SendAppEmailResult> {
  return sendAppEmailCore(input);
}
