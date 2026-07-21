"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import { sendBookingChatEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/email/send-app-email";
import type { BookingMessage } from "@/lib/chat/types";

const MSG_COLS =
  "id, booking_id, sender_id, body, attachment_path, attachment_mime, created_at, read_at";

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getChatBookingAccess(bookingId: string) {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { supabase, user: null as null, booking: null, role: null as null };
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, client_id, dj_id, event_type, event_date, client_name, client_email"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (
    !booking ||
    (booking.status !== "pending" && booking.status !== "accepted")
  ) {
    return { supabase, user: authData.user, booking: null, role: null as null };
  }

  const role =
    booking.client_id === authData.user.id
      ? ("client" as const)
      : booking.dj_id === authData.user.id
        ? ("dj" as const)
        : null;

  return { supabase, user: authData.user, booking, role };
}

async function signedUrlForPath(path: string | null) {
  if (!path) return null;
  const admin = adminClient();
  const { data } = await admin.storage
    .from("chat-attachments")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

async function withAttachmentUrls(
  rows: BookingMessage[]
): Promise<BookingMessage[]> {
  const withFiles = rows.filter((r) => r.attachment_path);
  if (withFiles.length === 0) return rows;

  const urlByPath = new Map<string, string | null>();
  await Promise.all(
    [...new Set(withFiles.map((r) => r.attachment_path!))].map(async (path) => {
      urlByPath.set(path, await signedUrlForPath(path));
    })
  );

  return rows.map((row) =>
    row.attachment_path
      ? { ...row, attachment_url: urlByPath.get(row.attachment_path) ?? null }
      : row
  );
}

export async function listBookingMessages(bookingId: string): Promise<
  | { ok: true; messages: BookingMessage[]; userId: string }
  | { ok: false; error: string }
> {
  if (!bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  const { supabase, user, booking, role } =
    await getChatBookingAccess(bookingId);
  if (!user) return { ok: false, error: "Musíš byť prihlásený." };
  if (!booking || !role) {
    return {
      ok: false,
      error: "Chat je dostupný len pre strany tejto rezervácie.",
    };
  }

  const { data, error } = await supabase
    .from("booking_messages")
    .select(MSG_COLS)
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) return { ok: false, error: error.message };

  const messages = await withAttachmentUrls(
    (data ?? []) as BookingMessage[]
  );
  return { ok: true, messages, userId: user.id };
}

export async function sendBookingMessage(input: {
  bookingId: string;
  body?: string;
  attachmentPath?: string;
  attachmentMime?: string;
}): Promise<
  { ok: true; message: BookingMessage } | { ok: false; error: string }
> {
  const bookingId = input.bookingId?.trim();
  const body = input.body?.trim() || null;
  const attachmentPath = input.attachmentPath?.trim() || null;
  const attachmentMime = input.attachmentMime?.trim() || null;

  if (!bookingId) return { ok: false, error: "Chýba ID rezervácie." };
  if (!body && !attachmentPath) {
    return { ok: false, error: "Napíš správu alebo prilož fotku." };
  }
  if (body && body.length > 4000) {
    return { ok: false, error: "Správa je príliš dlhá (max 4000 znakov)." };
  }

  const { supabase, user, booking, role } =
    await getChatBookingAccess(bookingId);
  if (!user) return { ok: false, error: "Musíš byť prihlásený." };
  if (!booking || !role) {
    return {
      ok: false,
      error: "Chat je dostupný len pre strany tejto rezervácie.",
    };
  }

  if (attachmentPath) {
    const expectedPrefix = `${bookingId}/${user.id}/`;
    if (!attachmentPath.startsWith(expectedPrefix)) {
      return { ok: false, error: "Neplatná príloha." };
    }
  }

  const { data, error } = await supabase
    .from("booking_messages")
    .insert({
      booking_id: bookingId,
      sender_id: user.id,
      body,
      attachment_path: attachmentPath,
      attachment_mime: attachmentMime,
    })
    .select(MSG_COLS)
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Správu sa nepodarilo odoslať." };
  }

  const message: BookingMessage = {
    ...(data as BookingMessage),
    attachment_url: await signedUrlForPath(attachmentPath),
  };

  // Always email DJ when client writes (full message). Client gets light debounce.
  void notifyRecipientIfNeeded({
    bookingId,
    senderId: user.id,
    role,
    booking,
    messageBody: body || (attachmentPath ? "📷 Fotka v prílohe" : "Nová správa"),
  });

  return { ok: true, message };
}

async function notifyRecipientIfNeeded(opts: {
  bookingId: string;
  senderId: string;
  role: "dj" | "client";
  booking: {
    dj_id: string;
    client_id: string | null;
    client_email: string | null;
    client_name: string | null;
    event_type: string;
    event_date: string;
  };
  messageBody: string;
}) {
  try {
    const admin = adminClient();
    const site = getSiteUrl();

    // Client → DJ: always forward full message to DJ e-mail
    if (opts.role === "client") {
      const { data: djAuth } = await admin.auth.admin.getUserById(
        opts.booking.dj_id
      );
      const { data: djProfile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", opts.booking.dj_id)
        .maybeSingle();
      const email = djAuth.user?.email;
      if (!email) return;
      await sendBookingChatEmail({
        to: email,
        recipientName: djProfile?.full_name,
        senderName: opts.booking.client_name || "Zákazník",
        preview: opts.messageBody,
        chatUrl: `${site}/dashboard/bookings/${opts.bookingId}/chat`,
        eventType: opts.booking.event_type,
        eventDate: opts.booking.event_date,
      });
      return;
    }

    // DJ → client: debounce 10 min to avoid spam
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("booking_messages")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", opts.bookingId)
      .eq("sender_id", opts.senderId)
      .gte("created_at", since);

    if ((count ?? 0) > 1) return;

    const email = opts.booking.client_email;
    if (!email) return;
    const { data: djProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", opts.booking.dj_id)
      .maybeSingle();
    await sendBookingChatEmail({
      to: email,
      recipientName: opts.booking.client_name,
      senderName: djProfile?.full_name || "Umelec",
      preview: opts.messageBody,
      chatUrl: `${site}/client-dashboard/bookings/${opts.bookingId}/chat`,
      eventType: opts.booking.event_type,
      eventDate: opts.booking.event_date,
    });
  } catch (err) {
    console.error("[booking-chat email]", err);
  }
}

export async function markBookingMessagesRead(
  bookingId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  const { supabase, user, booking, role } =
    await getChatBookingAccess(bookingId);
  if (!user) return { ok: false, error: "Musíš byť prihlásený." };
  if (!booking || !role) return { ok: false, error: "Nemáš prístup." };

  const { error } = await supabase
    .from("booking_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("booking_id", bookingId)
    .is("read_at", null)
    .neq("sender_id", user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function countUnreadBookingMessages(): Promise<
  { ok: true; count: number } | { ok: false; error: string }
> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: true, count: 0 };

  const userId = authData.user.id;

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id")
    .or(`dj_id.eq.${userId},client_id.eq.${userId}`)
    .in("status", ["pending", "accepted"]);

  const ids = (bookings ?? []).map((b) => b.id);
  if (ids.length === 0) return { ok: true, count: 0 };

  const { count, error } = await supabase
    .from("booking_messages")
    .select("id", { count: "exact", head: true })
    .in("booking_id", ids)
    .is("read_at", null)
    .neq("sender_id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, count: count ?? 0 };
}

export async function getBookingChatMeta(bookingId: string): Promise<
  | {
      ok: true;
      title: string;
      subtitle: string;
      status: string;
    }
  | { ok: false; error: string }
> {
  const { user, booking, role } = await getChatBookingAccess(bookingId);
  if (!user) return { ok: false, error: "Musíš byť prihlásený." };
  if (!booking || !role) return { ok: false, error: "Nemáš prístup k chatu." };

  const admin = adminClient();
  if (role === "dj") {
    return {
      ok: true,
      title: booking.client_name || "Zákazník",
      subtitle: `${booking.event_type} · ${booking.event_date}`,
      status: booking.status,
    };
  }

  const { data: dj } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", booking.dj_id)
    .maybeSingle();

  return {
    ok: true,
    title: dj?.full_name || "Umelec",
    subtitle: `${booking.event_type} · ${booking.event_date}`,
    status: booking.status,
  };
}

export async function exportBookingMessages(bookingId: string): Promise<
  | { ok: true; content: string; filename: string; mime: string }
  | { ok: false; error: string }
> {
  const listed = await listBookingMessages(bookingId);
  if (!listed.ok) return listed;

  const meta = await getBookingChatMeta(bookingId);
  const title = meta.ok ? meta.title : "Chat";
  const lines = [
    `BookTheVibe — export konverzácie`,
    `Partner: ${title}`,
    `Rezervácia: ${bookingId}`,
    `Export: ${new Date().toLocaleString("sk-SK")}`,
    `Poznámka: správy staršie ako 1 rok sa automaticky mažú.`,
    "",
    "----------------------------------------",
    "",
  ];

  for (const m of listed.messages) {
    const who = m.sender_id === listed.userId ? "Ja" : "Partner";
    const when = new Date(m.created_at).toLocaleString("sk-SK");
    lines.push(`[${when}] ${who}`);
    if (m.body) lines.push(m.body);
    if (m.attachment_path) {
      lines.push(`[Príloha: ${m.attachment_path}]`);
      if (m.attachment_url) lines.push(m.attachment_url);
    }
    lines.push("");
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return {
    ok: true,
    content: lines.join("\n"),
    filename: `bookthevibe-chat-${bookingId.slice(0, 8)}-${stamp}.txt`,
    mime: "text/plain;charset=utf-8",
  };
}

export type ChatThread = {
  bookingId: string;
  title: string;
  subtitle: string;
  lastMessage: string | null;
  lastAt: string | null;
  unread: number;
  status: string;
};

export async function listChatThreads(): Promise<
  { ok: true; threads: ChatThread[] } | { ok: false; error: string }
> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, error: "Musíš byť prihlásený." };

  const userId = authData.user.id;
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "id, status, event_type, event_date, client_name, client_id, dj_id"
    )
    .or(`dj_id.eq.${userId},client_id.eq.${userId}`)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) return { ok: false, error: error.message };
  if (!bookings?.length) return { ok: true, threads: [] };

  const ids = bookings.map((b) => b.id);
  const djIds = [
    ...new Set(
      bookings.filter((b) => b.client_id === userId).map((b) => b.dj_id)
    ),
  ];

  const [messagesRes, unreadRes, djProfilesRes] = await Promise.all([
    supabase
      .from("booking_messages")
      .select("booking_id, body, attachment_path, created_at")
      .in("booking_id", ids)
      .order("created_at", { ascending: false })
      .limit(Math.min(ids.length * 3, 120)),
    supabase
      .from("booking_messages")
      .select("booking_id")
      .in("booking_id", ids)
      .is("read_at", null)
      .neq("sender_id", userId)
      .limit(200),
    djIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", djIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const djMap = Object.fromEntries(
    (djProfilesRes.data ?? []).map((p) => [p.id, p.full_name])
  );

  const lastByBooking = new Map<
    string,
    { body: string | null; attachment_path: string | null; created_at: string }
  >();
  for (const m of messagesRes.data ?? []) {
    if (!lastByBooking.has(m.booking_id)) {
      lastByBooking.set(m.booking_id, m);
    }
  }

  const unreadByBooking = new Map<string, number>();
  for (const m of unreadRes.data ?? []) {
    unreadByBooking.set(
      m.booking_id,
      (unreadByBooking.get(m.booking_id) ?? 0) + 1
    );
  }

  const threads: ChatThread[] = bookings.map((b) => {
    const last = lastByBooking.get(b.id) ?? null;
    const isDj = b.dj_id === userId;
    return {
      bookingId: b.id,
      title: isDj
        ? b.client_name || "Zákazník"
        : djMap[b.dj_id] || "Umelec",
      subtitle: `${b.event_type} · ${b.event_date}`,
      lastMessage: last
        ? last.body || (last.attachment_path ? "📷 Fotka" : "Správa")
        : null,
      lastAt: last?.created_at ?? null,
      unread: unreadByBooking.get(b.id) ?? 0,
      status: b.status,
    };
  });

  threads.sort((a, b) => {
    const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
    const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
    return tb - ta;
  });

  return { ok: true, threads };
}
