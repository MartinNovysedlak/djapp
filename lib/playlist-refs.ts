export type PlaylistProvider = "spotify" | "youtube" | "other";

export type ResolvedPlaylistRef = {
  url: string;
  title: string;
  provider: PlaylistProvider;
};

function isHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Normalize Spotify / YouTube playlist share URLs to a canonical https form. */
export function normalizePlaylistUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  // spotify:playlist:ID
  const spotifyUri = trimmed.match(/^spotify:playlist:([a-zA-Z0-9]+)$/i);
  if (spotifyUri) {
    candidate = `https://open.spotify.com/playlist/${spotifyUri[1]}`;
  }

  if (!isHttpUrl(candidate)) return null;

  try {
    const u = new URL(candidate);
    // Drop tracking params but keep playlist id
    u.searchParams.delete("si");
    u.searchParams.delete("utm_source");
    u.searchParams.delete("utm_medium");
    u.searchParams.delete("utm_campaign");
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function detectPlaylistProvider(url: string): PlaylistProvider | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const path = u.pathname;

    if (
      (host === "open.spotify.com" || host === "spotify.com") &&
      /\/playlist\//i.test(path)
    ) {
      return "spotify";
    }

    if (
      (host === "youtube.com" ||
        host === "m.youtube.com" ||
        host === "music.youtube.com") &&
      (/\/playlist/i.test(path) || u.searchParams.has("list"))
    ) {
      return "youtube";
    }

    if (host === "youtu.be" && u.searchParams.has("list")) {
      return "youtube";
    }

    return null;
  } catch {
    return null;
  }
}

export function isPlaylistUrl(raw: string): boolean {
  const url = normalizePlaylistUrl(raw);
  if (!url) return false;
  return detectPlaylistProvider(url) !== null;
}

function cleanPlaylistTitle(raw: string) {
  return raw
    .replace(/\s*[-–|]\s*YouTube\s*$/i, "")
    .replace(/\s*[-–|]\s*Spotify\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

async function resolveSpotifyPlaylistTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(4500), next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { title?: string };
    if (json.title?.trim()) return cleanPlaylistTitle(json.title);
  } catch {
    /* ignore */
  }
  return null;
}

async function resolveYouTubePlaylistTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: AbortSignal.timeout(4500), next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { title?: string };
    if (json.title?.trim()) return cleanPlaylistTitle(json.title);
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Validate + resolve display metadata for a Spotify/YouTube playlist URL.
 */
export async function resolvePlaylistRef(
  rawUrl: string
): Promise<
  | { ok: true; playlist: ResolvedPlaylistRef }
  | { ok: false; error: string }
> {
  const url = normalizePlaylistUrl(rawUrl);
  if (!url) {
    return { ok: false, error: "Vlož platný odkaz na playlist." };
  }

  const provider = detectPlaylistProvider(url);
  if (!provider) {
    return {
      ok: false,
      error:
        "Podporované sú Spotify a YouTube playlisty (nie jednotlivé skladby).",
    };
  }

  let title: string | null = null;
  if (provider === "spotify") {
    title = await resolveSpotifyPlaylistTitle(url);
  } else if (provider === "youtube") {
    title = await resolveYouTubePlaylistTitle(url);
  }

  return {
    ok: true,
    playlist: {
      url,
      provider,
      title:
        title ||
        (provider === "spotify"
          ? "Spotify playlist"
          : provider === "youtube"
            ? "YouTube playlist"
            : "Playlist"),
    },
  };
}

export function providerLabel(provider: PlaylistProvider) {
  if (provider === "spotify") return "Spotify";
  if (provider === "youtube") return "YouTube";
  return "Playlist";
}
