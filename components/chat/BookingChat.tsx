"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Download,
  ImagePlus,
  Loader2,
  Send,
  X,
} from "lucide-react";
import {
  exportBookingMessages,
  listBookingMessages,
  markBookingMessagesRead,
  sendBookingMessage,
} from "@/app/actions/booking-messages";
import { createClient } from "@/utils/supabase/client";
import type { BookingMessage } from "@/lib/chat/types";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type BookingChatProps = {
  bookingId: string;
  className?: string;
  compact?: boolean;
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("sk-SK", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatDayLabel(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Dnes";
    if (d.toDateString() === yesterday.toDateString()) return "Včera";
    return d.toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function BookingChat({
  bookingId,
  className,
  compact = false,
}: BookingChatProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{
    file: File;
    url: string;
  } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const scrollToBottom = useCallback((smooth = true) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({
      top: list.scrollHeight,
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  const load = useCallback(async () => {
    const result = await listBookingMessages(bookingId);
    if (!result.ok) {
      showToast(result.error, "error");
      setLoading(false);
      return;
    }
    setMessages(result.messages);
    setUserId(result.userId);
    setLoading(false);
    void markBookingMessagesRead(bookingId);
  }, [bookingId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Fast client poll (no signed URL round-trip) + Realtime; full refresh only when needed
  useEffect(() => {
    const supabase = createClient();
    const MSG_COLS =
      "id, booking_id, sender_id, body, attachment_path, attachment_mime, created_at, read_at";

    const tick = async () => {
      const { data, error } = await supabase
        .from("booking_messages")
        .select(MSG_COLS)
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error || !data) return;

      const rows = data as BookingMessage[];
      let needsFullRefresh = false;

      setMessages((prev) => {
        const byId = new Map(prev.map((m) => [m.id, m]));
        for (const m of rows) {
          const existing = byId.get(m.id);
          if (existing) {
            byId.set(m.id, {
              ...existing,
              ...m,
              attachment_url: existing.attachment_url,
            });
          } else {
            byId.set(m.id, { ...m, attachment_url: null });
            if (m.attachment_path) needsFullRefresh = true;
          }
        }
        return Array.from(byId.values()).sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      if (needsFullRefresh) {
        const full = await listBookingMessages(bookingId);
        if (full.ok) {
          setMessages(full.messages);
          setUserId(full.userId);
        }
      }

      const last = rows[rows.length - 1];
      if (last && last.sender_id !== userIdRef.current) {
        void markBookingMessagesRead(bookingId);
      }
    };

    const id = window.setInterval(() => {
      void tick();
    }, 8000);
    const onFocus = () => void tick();
    window.addEventListener("focus", onFocus);

    const channel = supabase
      .channel(`booking-chat:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        () => {
          void tick();
        }
      )
      .subscribe();

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [bookingId]);

  useEffect(() => {
    if (!loading) scrollToBottom(false);
  }, [loading, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  const clearPreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onPickFile = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      showToast("Povolené sú len JPEG, PNG, WebP a GIF.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Fotka môže mať maximálne 2 MB.", "error");
      return;
    }
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview({ file, url: URL.createObjectURL(file) });
  };

  const handleSend = async () => {
    const body = text.trim();
    if ((!body && !preview) || sending) return;
    setSending(true);

    try {
      let attachmentPath: string | undefined;
      let attachmentMime: string | undefined;

      if (preview) {
        const fd = new FormData();
        fd.set("bookingId", bookingId);
        fd.set("file", preview.file);
        const res = await fetch("/api/upload-chat-image", {
          method: "POST",
          body: fd,
        });
        const json = (await res.json()) as {
          path?: string;
          mime?: string;
          error?: string;
        };
        if (!res.ok || !json.path) {
          showToast(json.error || "Upload fotky zlyhal.", "error");
          setSending(false);
          return;
        }
        attachmentPath = json.path;
        attachmentMime = json.mime;
      }

      const result = await sendBookingMessage({
        bookingId,
        body: body || undefined,
        attachmentPath,
        attachmentMime,
      });

      if (!result.ok) {
        showToast(result.error, "error");
        setSending(false);
        return;
      }

      setMessages((prev) =>
        prev.some((m) => m.id === result.message.id)
          ? prev
          : [...prev, result.message]
      );
      setText("");
      clearPreview();
    } finally {
      setSending(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    const result = await exportBookingMessages(bookingId);
    setExporting(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    const blob = new Blob([result.content], {
      type: result.mime,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Konverzácia stiahnutá.", "success");
  };

  let lastDay = "";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl",
        compact ? "h-[420px]" : "h-[min(72vh,680px)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2.5 sm:px-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Chat · správy sa mažú po 1 roku
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-full text-xs text-zinc-400 hover:text-white"
          onClick={() => void handleExport()}
          disabled={exporting || messages.length === 0}
        >
          {exporting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          Stiahnuť chat
        </Button>
      </div>
      <div
        ref={listRef}
        className="flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:px-4"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-zinc-500">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm font-medium text-zinc-300">Zatiaľ žiadne správy</p>
            <p className="text-xs text-zinc-500">
              Napíš prvú správu — komunikácia ostane pri tejto rezervácii.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const mine = msg.sender_id === userId;
            const day = dayKey(msg.created_at);
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <div key={msg.id}>
                {showDay ? (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                      {formatDayLabel(msg.created_at)}
                    </span>
                  </div>
                ) : null}
                <div
                  className={cn(
                    "mb-1.5 flex",
                    mine ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[78%] overflow-hidden rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                      mine
                        ? "rounded-br-md bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white"
                        : "rounded-bl-md border border-white/10 bg-white/[0.06] text-zinc-100"
                    )}
                  >
                    {msg.attachment_url ? (
                      <button
                        type="button"
                        className="mb-1.5 block overflow-hidden rounded-xl"
                        onClick={() => setLightbox(msg.attachment_url!)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={msg.attachment_url}
                          alt="Príloha"
                          className="max-h-56 w-auto max-w-full object-cover"
                        />
                      </button>
                    ) : null}
                    {msg.body ? <p className="whitespace-pre-wrap break-words">{msg.body}</p> : null}
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        mine ? "text-white/70" : "text-zinc-500"
                      )}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {preview ? (
        <div className="flex items-center gap-3 border-t border-white/5 bg-black/30 px-3 py-2">
          <div className="relative size-14 overflow-hidden rounded-xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.url} alt="Náhľad" className="size-full object-cover" />
          </div>
          <p className="flex-1 truncate text-xs text-zinc-400">{preview.file.name}</p>
          <button
            type="button"
            onClick={clearPreview}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
            aria-label="Odstrániť fotku"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="border-t border-white/5 bg-black/50 p-2.5 sm:p-3">
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full text-zinc-400 hover:bg-white/5 hover:text-violet-300"
            onClick={() => fileRef.current?.click()}
            disabled={sending}
            aria-label="Priložiť fotku"
          >
            <ImagePlus className="size-5" />
          </Button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
            placeholder="Napíš správu…"
            className="max-h-28 min-h-[42px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-500/40"
          />
          <Button
            type="button"
            size="icon"
            className="shrink-0 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            onClick={() => void handleSend()}
            disabled={sending || (!text.trim() && !preview)}
            aria-label="Odoslať"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-zinc-600">
          Enter odošle · Shift+Enter nový riadok · fotky max 2 MB
        </p>
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setLightbox(null)}
            aria-label="Zavrieť"
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Fotka"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
