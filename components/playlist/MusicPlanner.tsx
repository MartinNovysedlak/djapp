"use client";

import {
  addBookingPlaylistRef,
  addBookingSong,
  deleteBookingPlaylistRef,
  deleteBookingSong,
  getBookingPlaylistRefs,
  getBookingSongs,
  providerLabel,
  toggleSongPlayed,
  type BookingPlaylistRef,
  type BookingSong,
  type SongCategory,
} from "@/app/actions/playlist";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Ban,
  Check,
  ChevronDown,
  ExternalLink,
  ListMusic,
  Loader2,
  Music,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

const CATEGORY_META: Record<
  SongCategory,
  {
    label: string;
    short: string;
    icon?: "ban";
    headerClass: string;
    emptyClass: string;
    itemClass: string;
  }
> = {
  must_play: {
    label: "Určite zahrať",
    short: "Must Play",
    headerClass: "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-200",
    emptyClass: "text-emerald-200/40",
    itemClass: "border-emerald-500/15 bg-emerald-500/[0.04]",
  },
  optional: {
    label: "Ak sa bude hodiť",
    short: "Optional",
    headerClass: "border-amber-500/20 bg-amber-500/[0.06] text-amber-200",
    emptyClass: "text-amber-200/40",
    itemClass: "border-white/8 bg-white/[0.03]",
  },
  do_not_play: {
    label: "Čierna listina",
    short: "Do NOT Play",
    icon: "ban",
    headerClass:
      "border-red-500/40 bg-gradient-to-r from-red-600/25 to-red-500/10 text-red-200 shadow-[0_0_24px_-8px_rgba(239,68,68,0.55)]",
    emptyClass: "text-red-300/35",
    itemClass:
      "border-red-500/30 bg-red-500/[0.1] text-red-100 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.12)]",
  },
};

const CATEGORY_ORDER: SongCategory[] = [
  "must_play",
  "optional",
  "do_not_play",
];

type MusicPlannerProps = {
  bookingId: string;
  mode: "client" | "dj";
  className?: string;
  defaultOpen?: boolean;
  /** Guest hub token — enables playlist without login */
  shareToken?: string;
  /** Always open, no accordion chrome (guest hub) */
  embedded?: boolean;
};

export function MusicPlanner({
  bookingId,
  mode,
  className,
  defaultOpen = false,
  shareToken,
  embedded = false,
}: MusicPlannerProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(defaultOpen || embedded);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [songs, setSongs] = useState<BookingSong[]>([]);
  const [playlists, setPlaylists] = useState<BookingPlaylistRef[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<SongCategory>("must_play");
  const [submitting, setSubmitting] = useState(false);

  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistNotes, setPlaylistNotes] = useState("");
  const [playlistSubmitting, setPlaylistSubmitting] = useState(false);

  const loadSongs = useCallback(async () => {
    setLoading(true);
    const [songsResult, playlistsResult] = await Promise.all([
      getBookingSongs(bookingId, shareToken),
      getBookingPlaylistRefs(bookingId, shareToken),
    ]);
    if (!songsResult.ok) {
      showToast(songsResult.error, "error");
      setLoading(false);
      return;
    }
    if (!playlistsResult.ok) {
      showToast(playlistsResult.error, "error");
      setLoading(false);
      return;
    }
    setSongs(songsResult.songs);
    setPlaylists(playlistsResult.playlists);
    setLoaded(true);
    setLoading(false);
  }, [bookingId, shareToken, showToast]);

  useEffect(() => {
    if (!open || loaded) return;
    void loadSongs();
  }, [open, loaded, loadSongs]);

  const grouped = useMemo(() => {
    const map: Record<SongCategory, BookingSong[]> = {
      must_play: [],
      optional: [],
      do_not_play: [],
    };
    for (const song of songs) {
      map[song.category]?.push(song);
    }
    return map;
  }, [songs]);

  const total = songs.length;
  const playlistCount = playlists.length;
  const blacklistCount = grouped.do_not_play.length;

  async function handleAddPlaylist(e: FormEvent) {
    e.preventDefault();
    if (playlistSubmitting) return;
    setPlaylistSubmitting(true);
    const result = await addBookingPlaylistRef({
      bookingId,
      url: playlistUrl,
      notes: playlistNotes,
      shareToken,
    });
    setPlaylistSubmitting(false);

    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }

    if (result.playlist) {
      setPlaylists((prev) => [...prev, result.playlist!]);
    }
    setPlaylistUrl("");
    setPlaylistNotes("");
    showToast("Playlist pridaný.", "success");
  }

  async function handleDeletePlaylist(playlistId: string) {
    setBusyId(playlistId);
    const result = await deleteBookingPlaylistRef(playlistId, shareToken);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    showToast("Playlist odstránený.", "success");
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const result = await addBookingSong({
      bookingId,
      title,
      artist,
      notes,
      url,
      category,
      shareToken,
    });
    setSubmitting(false);

    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }

    if (result.song) {
      setSongs((prev) => [...prev, result.song!]);
    }
    setTitle("");
    setArtist("");
    setNotes("");
    setUrl("");
    showToast("Skladba pridaná.", "success");
  }

  async function handleDelete(songId: string) {
    setBusyId(songId);
    const result = await deleteBookingSong(songId, shareToken);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setSongs((prev) => prev.filter((s) => s.id !== songId));
    showToast("Skladba odstránená.", "success");
  }

  async function handleTogglePlayed(song: BookingSong) {
    setBusyId(song.id);
    const next = !song.is_played;
    const result = await toggleSongPlayed(song.id, next);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setSongs((prev) =>
      prev.map((s) =>
        s.id === song.id
          ? { ...s, is_played: result.song?.is_played ?? next }
          : s
      )
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-black/25",
        className
      )}
    >
      {embedded ? null : (
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10">
          <Music className="size-3.5 text-violet-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Hudba</p>
          <p className="text-[11px] text-zinc-500">
            {mode === "client"
              ? "Hudobný plánovač pre umelca"
              : "Zoznam od klienta"}
            {loaded ? (
              <>
                {" · "}
                {playlistCount > 0 ? (
                  <span>
                    {playlistCount}{" "}
                    {playlistCount === 1 ? "playlist" : "playlisty"}
                    {total > 0 ? " · " : ""}
                  </span>
                ) : null}
                {total === 0 && playlistCount === 0
                  ? "zatiaľ prázdne"
                  : total > 0
                    ? `${total} ${total === 1 ? "skladba" : total < 5 ? "skladby" : "skladieb"}`
                    : null}
                {blacklistCount > 0 ? (
                  <span className="text-red-400">
                    {" "}
                    · {blacklistCount} na čiernej listine
                  </span>
                ) : null}
              </>
            ) : null}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-zinc-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      )}

      {open ? (
        <div
          className={cn(
            "space-y-4 px-4 py-4",
            !embedded && "border-t border-white/8"
          )}
        >
          {loading && !loaded ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-violet-400" />
            </div>
          ) : (
            <>
              <section className="space-y-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10">
                    <ListMusic className="size-3.5 text-violet-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      Referenčný playlist
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                      {mode === "client"
                        ? "Vlož Spotify alebo YouTube playlist — DJ uvidí štýl a žáner naraz, bez lúskania zoznamu."
                        : "Playlisty od klienta ako rýchly prehľad štýlu / žánru."}
                    </p>
                  </div>
                </div>

                {mode === "client" ? (
                  <form onSubmit={handleAddPlaylist} className="space-y-2.5">
                    <div className="space-y-1.5">
                      <Label htmlFor={`playlist-url-${bookingId}`}>
                        Spotify / YouTube playlist
                      </Label>
                      <Input
                        id={`playlist-url-${bookingId}`}
                        type="url"
                        value={playlistUrl}
                        onChange={(e) => setPlaylistUrl(e.target.value)}
                        placeholder="https://open.spotify.com/playlist/… alebo YouTube"
                        className="h-10 rounded-xl"
                        maxLength={500}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`playlist-notes-${bookingId}`}>
                        Poznámka{" "}
                        <span className="font-normal text-zinc-500">
                          (voliteľné)
                        </span>
                      </Label>
                      <Input
                        id={`playlist-notes-${bookingId}`}
                        value={playlistNotes}
                        onChange={(e) => setPlaylistNotes(e.target.value)}
                        placeholder="napr. vibe na večerný tanec, 80s/90s…"
                        className="h-10 rounded-xl"
                        maxLength={500}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={playlistSubmitting || !playlistUrl.trim()}
                      size="sm"
                      className="gap-1.5 rounded-full"
                    >
                      {playlistSubmitting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                      Pridať playlist
                    </Button>
                  </form>
                ) : null}

                {playlists.length === 0 ? (
                  <p className="px-0.5 text-xs text-zinc-600">
                    {mode === "client"
                      ? "Zatiaľ žiadny referenčný playlist."
                      : "Klient ešte nepridal playlist."}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {playlists.map((pl) => {
                      const busy = busyId === pl.id;
                      const label = providerLabel(pl.provider);
                      return (
                        <li
                          key={pl.id}
                          className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5"
                        >
                          <div
                            className={cn(
                              "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold uppercase tracking-wide",
                              pl.provider === "spotify"
                                ? "bg-[#1DB954]/15 text-[#1DB954]"
                                : pl.provider === "youtube"
                                  ? "bg-red-500/15 text-red-300"
                                  : "bg-white/10 text-zinc-300"
                            )}
                          >
                            {pl.provider === "spotify"
                              ? "Sp"
                              : pl.provider === "youtube"
                                ? "YT"
                                : "PL"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white">
                              {pl.title || `${label} playlist`}
                            </p>
                            <p className="text-[11px] text-zinc-500">{label}</p>
                            {pl.notes ? (
                              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                                {pl.notes}
                              </p>
                            ) : null}
                            <a
                              href={pl.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-violet-300/90 hover:text-violet-200"
                            >
                              Otvoriť playlist
                              <ExternalLink className="size-3" />
                            </a>
                          </div>
                          {mode === "client" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDeletePlaylist(pl.id)}
                              className="mt-0.5 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-red-300"
                              title="Odstrániť"
                            >
                              {busy ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {mode === "client" ? (
                <form onSubmit={handleAdd} className="space-y-3">
                  <p className="text-xs font-medium text-zinc-400">
                    Alebo konkrétne skladby
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`song-title-${bookingId}`}>
                        Názov piesne
                      </Label>
                      <Input
                        id={`song-title-${bookingId}`}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="napr. Blinding Lights"
                        className="h-10 rounded-xl"
                        maxLength={160}
                        required={!url.trim()}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`song-artist-${bookingId}`}>
                        Interpret
                      </Label>
                      <Input
                        id={`song-artist-${bookingId}`}
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        placeholder="napr. The Weeknd"
                        className="h-10 rounded-xl"
                        maxLength={160}
                        required={!url.trim()}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`song-url-${bookingId}`}>
                      YouTube / Spotify link na skladbu
                    </Label>
                    <Input
                      id={`song-url-${bookingId}`}
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://… — namiesto názvu, alebo navyše"
                      className="h-10 rounded-xl"
                      maxLength={500}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Kategória</Label>
                    <Select
                      value={category}
                      onValueChange={(v) => {
                        if (v) setCategory(v as SongCategory);
                      }}
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl">
                        <SelectValue>
                          {(v) =>
                            CATEGORY_META[(v as SongCategory) || category]
                              ?.label ?? "Vyber kategóriu"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_ORDER.map((key) => (
                          <SelectItem
                            key={key}
                            value={key}
                            label={CATEGORY_META[key].label}
                          >
                            <span
                              className={cn(
                                key === "do_not_play" && "font-medium text-red-300"
                              )}
                            >
                              {CATEGORY_META[key].label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`song-notes-${bookingId}`}>
                      Poznámka{" "}
                      <span className="font-normal text-zinc-500">
                        (voliteľné)
                      </span>
                    </Label>
                    <Textarea
                      id={`song-notes-${bookingId}`}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="napr. na prvý tanec, okolo polnoci…"
                      className="min-h-[72px] rounded-xl"
                      maxLength={500}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="gap-1.5 rounded-full"
                  >
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Pridať skladbu
                  </Button>
                </form>
              ) : (
                <p className="text-xs leading-relaxed text-zinc-500">
                  Zoznam od klienta je len na čítanie. Pri must-play a optional
                  skladbách môžeš odškrtnúť, že si ich zaradil do setu.
                </p>
              )}

              <div className="space-y-3">
                {CATEGORY_ORDER.map((key) => {
                  const meta = CATEGORY_META[key];
                  const list = grouped[key];
                  return (
                    <section key={key} className="space-y-2">
                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide",
                          meta.headerClass
                        )}
                      >
                        {meta.icon === "ban" ? (
                          <Ban className="size-3.5 shrink-0" />
                        ) : null}
                        <span className="flex-1">{meta.label}</span>
                        <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal opacity-80">
                          {list.length}
                        </span>
                      </div>

                      {list.length === 0 ? (
                        <p
                          className={cn(
                            "px-1 py-2 text-xs",
                            meta.emptyClass
                          )}
                        >
                          Žiadne skladby
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {list.map((song) => {
                            const busy = busyId === song.id;
                            const canCheck =
                              mode === "dj" && key !== "do_not_play";
                            return (
                              <li
                                key={song.id}
                                className={cn(
                                  "flex items-start gap-2.5 rounded-xl border px-3 py-2.5",
                                  meta.itemClass,
                                  song.is_played &&
                                    key !== "do_not_play" &&
                                    "opacity-55"
                                )}
                              >
                                {canCheck ? (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => handleTogglePlayed(song)}
                                    className={cn(
                                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                                      song.is_played
                                        ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                                        : "border-white/15 bg-black/20 text-transparent hover:border-violet-400/40"
                                    )}
                                    title={
                                      song.is_played
                                        ? "Označené ako zaradené"
                                        : "Označiť ako zaradené do setu"
                                    }
                                  >
                                    {busy ? (
                                      <Loader2 className="size-3 animate-spin text-zinc-400" />
                                    ) : (
                                      <Check className="size-3" />
                                    )}
                                  </button>
                                ) : null}

                                <div className="min-w-0 flex-1">
                                  <p
                                    className={cn(
                                      "text-sm font-medium text-white",
                                      song.is_played &&
                                        key !== "do_not_play" &&
                                        "line-through decoration-white/40",
                                      key === "do_not_play" && "text-red-100"
                                    )}
                                  >
                                    {song.title}
                                  </p>
                                  <p
                                    className={cn(
                                      "text-xs text-zinc-400",
                                      key === "do_not_play" && "text-red-300/70"
                                    )}
                                  >
                                    {song.artist}
                                  </p>
                                  {song.notes ? (
                                    <p
                                      className={cn(
                                        "mt-1 text-[11px] leading-relaxed text-zinc-500",
                                        key === "do_not_play" &&
                                          "text-red-300/55"
                                      )}
                                    >
                                      {song.notes}
                                    </p>
                                  ) : null}
                                  {song.source_url ? (
                                    <a
                                      href={song.source_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-1 inline-block text-[11px] text-violet-300/80 hover:text-violet-200"
                                    >
                                      Otvoriť odkaz
                                    </a>
                                  ) : null}
                                </div>

                                {mode === "client" ? (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => handleDelete(song.id)}
                                    className={cn(
                                      "mt-0.5 rounded-lg p-1.5 transition-colors",
                                      key === "do_not_play"
                                        ? "text-red-300/70 hover:bg-red-500/15 hover:text-red-200"
                                        : "text-zinc-500 hover:bg-white/5 hover:text-red-300"
                                    )}
                                    title="Odstrániť"
                                  >
                                    {busy ? (
                                      <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="size-3.5" />
                                    )}
                                  </button>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
