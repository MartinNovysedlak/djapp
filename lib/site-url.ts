import { BRAND } from "@/lib/brand";

/** True for localhost / LAN hosts that must never appear in public SEO or guest links. */
export function isNonPublicSiteUrl(url: string): boolean {
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
 * Canonical public site origin for metadata, sitemap, emails, QR, share links.
 * Ignores localhost / LAN values in NEXT_PUBLIC_SITE_URL (e.g. 192.168.x.x).
 * Always falls back to BRAND.url (bookthevibe.com) — never localhost.
 */
export function getPublicSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (raw && !isNonPublicSiteUrl(raw)) return raw;
  return BRAND.url.replace(/\/$/, "");
}

/** Absolute public DJ/band profile URL, e.g. https://bookthevibe.com/djs/dj-nova */
export function getPublicDjUrl(slug: string): string {
  const clean = slug.trim().replace(/^\/+|\/+$/g, "");
  return `${getPublicSiteUrl()}/djs/${clean}`;
}

/** Host + path for read-only UI, e.g. bookthevibe.com/djs/dj-nova */
export function getPublicDjDisplayPath(slug: string): string {
  const origin = getPublicSiteUrl().replace(/^https?:\/\//i, "");
  const clean = slug.trim().replace(/^\/+|\/+$/g, "");
  return `${origin}/djs/${clean}`;
}

/** @deprecated Prefer getPublicSiteUrl — kept as alias for existing imports. */
export const getSiteUrl = getPublicSiteUrl;
