/**
 * Admin access must NEVER come from client-editable user_metadata.
 * Primary gate: profiles.role === 'admin' (set only via SQL / service role).
 * Optional harden: ADMIN_EMAIL allowlist (comma-separated).
 */

export function getAdminEmailAllowlist(): string[] {
  const raw = (process.env.ADMIN_EMAIL || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** True only when profile role is admin AND (if configured) email is allowlisted. */
export function isAuthorizedAdmin(input: {
  role?: string | null;
  email?: string | null;
}): boolean {
  if (input.role !== "admin") return false;
  const allowlist = getAdminEmailAllowlist();
  if (allowlist.length === 0) return true;
  const email = input.email?.trim().toLowerCase();
  if (!email) return false;
  return allowlist.includes(email);
}
