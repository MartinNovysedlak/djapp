import { parse } from "node-html-parser";

const DIACRITICS_MAP: Record<string, string> = {
  á: "a",
  ä: "a",
  č: "c",
  ď: "d",
  é: "e",
  í: "i",
  ĺ: "l",
  ľ: "l",
  ň: "n",
  ó: "o",
  ô: "o",
  ŕ: "r",
  š: "s",
  ť: "t",
  ú: "u",
  ý: "y",
  ž: "z",
  Á: "a",
  Ä: "a",
  Č: "c",
  Ď: "d",
  É: "e",
  Í: "i",
  Ĺ: "l",
  Ľ: "l",
  Ň: "n",
  Ó: "o",
  Ô: "o",
  Ŕ: "r",
  Š: "s",
  Ť: "t",
  Ú: "u",
  Ý: "y",
  Ž: "z",
};

export type NormalizedSongInput = {
  title: string;
  artist: string;
  sourceUrl: string | null;
  normalizedTitle: string;
};

type ResolvedMeta = {
  title: string;
  artist: string;
};

function stripDiacritics(value: string) {
  return value
    .split("")
    .map((ch) => DIACRITICS_MAP[ch] ?? ch)
    .join("")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Fuzzy key = song TITLE only (not artist).
 * So "Ty a ja / Kali" and "Ty a ja / Alan Murin x Kali" group together.
 */
export function buildNormalizedTitle(title: string, _artist?: string) {
  void _artist;
  return stripDiacritics(title)
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\[.*?\]/g, " ")
    .replace(/\b(official|video|lyrics|audio|hd|4k|mv|feat|ft)\b/gi, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function cleanFetchedTitle(raw: string) {
  return raw
    .replace(/\s*[-–|]\s*YouTube\s*$/i, "")
    .replace(/\s*[-–|]\s*Spotify\s*$/i, "")
    .replace(/\s*\|\s*Official.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function splitArtistTitle(combined: string): ResolvedMeta {
  const parts = combined.split(/\s[-–—]\s/);
  if (parts.length >= 2) {
    const left = parts[0].trim();
    const right = parts.slice(1).join(" - ").trim();
    if (left.length > 0 && right.length > 0) {
      // Prefer shorter side as title when "Artist - Song"
      if (right.length <= left.length + 10) {
        return { artist: left.slice(0, 160), title: right.slice(0, 160) };
      }
      return { artist: left.slice(0, 160), title: right.slice(0, 160) };
    }
  }
  return { title: combined.slice(0, 160), artist: "" };
}

function parseSpotifyDescription(desc: string, fallbackTitle: string): ResolvedMeta {
  // "Carly Rae Jepsen · Cut To The Feeling · Song · 2017"
  const parts = desc
    .split("·")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const maybeArtist = parts[0];
    const maybeTitle = parts[1];
    if (maybeArtist && maybeTitle) {
      return {
        artist: maybeArtist.slice(0, 160),
        title: maybeTitle.slice(0, 160),
      };
    }
  }
  return { title: fallbackTitle, artist: "" };
}

function parseSpotifyPageTitle(pageTitle: string): ResolvedMeta | null {
  // "Cut To The Feeling - song and lyrics by Carly Rae Jepsen | Spotify"
  const m = pageTitle.match(
    /^(.+?)\s*-\s*song and lyrics by\s+(.+?)\s*\|\s*Spotify$/i
  );
  if (m) {
    return {
      title: cleanFetchedTitle(m[1]).slice(0, 160),
      artist: m[2].trim().slice(0, 160),
    };
  }
  return null;
}

async function resolveSpotify(pageUrl: string): Promise<ResolvedMeta | null> {
  try {
    const res = await fetch(pageUrl, {
      signal: AbortSignal.timeout(5500),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DJAppSongBot/1.0; +https://dj-app.local)",
        Accept: "text/html",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const root = parse(html);

    const ogTitle =
      root.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
      "";
    const ogDesc =
      root
        .querySelector('meta[property="og:description"]')
        ?.getAttribute("content") || "";
    const pageTitle = root.querySelector("title")?.text || "";

    const fromPageTitle = parseSpotifyPageTitle(pageTitle);
    if (fromPageTitle?.title && fromPageTitle.artist) {
      return fromPageTitle;
    }

    if (ogDesc && ogTitle) {
      const parsed = parseSpotifyDescription(ogDesc, cleanFetchedTitle(ogTitle));
      if (parsed.title && parsed.artist) return parsed;
    }

    if (ogTitle) {
      return { title: cleanFetchedTitle(ogTitle), artist: "" };
    }
  } catch {
    /* fall through */
  }

  // oEmbed has title only — still better than nothing
  try {
    const res = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(pageUrl)}`,
      { signal: AbortSignal.timeout(4000), next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { title?: string };
    if (json.title?.trim()) {
      return { title: cleanFetchedTitle(json.title), artist: "" };
    }
  } catch {
    /* ignore */
  }

  return null;
}

async function resolveYouTube(pageUrl: string): Promise<ResolvedMeta | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(pageUrl)}&format=json`,
      { signal: AbortSignal.timeout(4500), next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { title?: string; author_name?: string };
    if (!json.title?.trim()) return null;
    const cleaned = cleanFetchedTitle(json.title);
    const split = splitArtistTitle(cleaned);
    return {
      title: split.title || cleaned,
      artist: split.artist || (json.author_name || "").slice(0, 160),
    };
  } catch {
    return null;
  }
}

async function resolveGenericHtml(pageUrl: string): Promise<ResolvedMeta | null> {
  try {
    const res = await fetch(pageUrl, {
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "DJAppSongBot/1.0",
        Accept: "text/html",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const root = parse(html);
    const og =
      root.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
      root.querySelector('meta[name="title"]')?.getAttribute("content");
    const titleTag = root.querySelector("title")?.text;
    const raw = (og || titleTag || "").trim();
    if (!raw) return null;
    const cleaned = cleanFetchedTitle(raw);
    return splitArtistTitle(cleaned);
  } catch {
    return null;
  }
}

async function resolveFromUrl(pageUrl: string): Promise<ResolvedMeta | null> {
  if (/spotify\.com/i.test(pageUrl)) return resolveSpotify(pageUrl);
  if (/youtu\.?be|youtube\.com/i.test(pageUrl)) return resolveYouTube(pageUrl);
  return resolveGenericHtml(pageUrl);
}

/**
 * SongNormalizationEngine — runs before persisting planner / live songs.
 */
export async function normalizeSongInput(input: {
  title?: string | null;
  artist?: string | null;
  url?: string | null;
}): Promise<
  | { ok: true; song: NormalizedSongInput }
  | { ok: false; error: string }
> {
  let title = (input.title ?? "").trim().slice(0, 160);
  let artist = (input.artist ?? "").trim().slice(0, 160);
  const rawUrl = (input.url ?? "").trim().slice(0, 500);
  const sourceUrl = rawUrl && isHttpUrl(rawUrl) ? rawUrl : null;

  if (rawUrl && !sourceUrl) {
    return { ok: false, error: "URL odkaz nie je platný." };
  }

  if ((!title || !artist) && sourceUrl) {
    const resolved = await resolveFromUrl(sourceUrl);
    if (resolved) {
      if (!title && resolved.title) title = resolved.title;
      if (!artist && resolved.artist) artist = resolved.artist;
    }
  }

  if (!title && sourceUrl) {
    return {
      ok: false,
      error: "Z odkazu sa nepodarilo zistiť názov — doplň názov ručne.",
    };
  }
  if (!title) return { ok: false, error: "Zadaj názov piesne alebo URL odkaz." };
  if (!artist) artist = "Neznámy interpret";

  const normalizedTitle = buildNormalizedTitle(title);
  if (!normalizedTitle) {
    return { ok: false, error: "Názov piesne je neplatný." };
  }

  return {
    ok: true,
    song: {
      title,
      artist,
      sourceUrl,
      normalizedTitle,
    },
  };
}
