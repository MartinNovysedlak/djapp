/** Extracts a YouTube video ID from common URL shapes (watch/short/embed/youtu.be). */
export function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace("www.", "");

    if (host === "youtu.be") {
      return u.pathname.slice(1) || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] ?? null;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Returns an embeddable iframe src for known providers, or null if unsupported. */
export function getVideoEmbedUrl(url: string): string | null {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}`;

  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace("www.", "");
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** True for uploaded MP4/WebM/MOV files (Supabase Storage or direct file URL). */
export function isDirectVideoFile(url: string): boolean {
  try {
    const u = new URL(url.trim());
    if (/\/videos\//i.test(u.pathname)) return true;
    return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u.pathname);
  } catch {
    return false;
  }
}

