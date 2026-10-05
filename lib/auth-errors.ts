const MESSAGES = {
  google_failed: "Prihlásenie cez Google sa nepodarilo. Skús to znova.",
  missing_code: "Prihlásenie cez Google sa nepodarilo. Skús to znova.",
  auth_callback_failed: "Prihlásenie cez Google sa nepodarilo. Skús to znova.",
  email_exists: "Účet s týmto e-mailom už existuje. Prihlás sa heslom alebo cez Google.",
  email_unconfirmed: "E-mail ešte nie je overený. Skontroluj schránku.",
  weak_password: "Heslo je príliš slabé. Použi aspoň 6 znakov.",
  invalid_credentials: "Nesprávny e-mail alebo heslo.",
  rate_limit: "Príliš veľa pokusov. Počkaj chvíľu a skús znova.",
  database: "Účet sa nepodarilo vytvoriť. Skús to znova o chvíľu.",
} as const;

export type AuthErrorCode = keyof typeof MESSAGES;

export function authErrorCode(raw: string | null | undefined): AuthErrorCode {
  const msg = (raw || "").toLowerCase();
  if (!msg) return "google_failed";
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
    return "invalid_credentials";
  }
  if (
    msg.includes("already registered") ||
    msg.includes("already been registered") ||
    msg.includes("user already") ||
    msg.includes("email_exists") ||
    msg.includes("identity")
  ) {
    return "email_exists";
  }
  if (
    msg.includes("password") &&
    (msg.includes("least") ||
      msg.includes("short") ||
      msg.includes("weak") ||
      msg.includes("6"))
  ) {
    return "weak_password";
  }
  if (msg.includes("not confirmed")) return "email_unconfirmed";
  if (msg.includes("database error") || msg.includes("saving new user")) {
    return "database";
  }
  if (msg.includes("rate") || msg.includes("too many")) return "rate_limit";
  if (msg.includes("missing_code") || msg.includes("no code")) return "missing_code";
  return "google_failed";
}

export function loginErrorFromCode(code: string | null | undefined): string {
  if (code && code in MESSAGES) return MESSAGES[code as AuthErrorCode];
  return MESSAGES.google_failed;
}

export function authErrorMessage(raw: string | null | undefined): string {
  return loginErrorFromCode(authErrorCode(raw));
}
