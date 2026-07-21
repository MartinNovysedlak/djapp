"use client";

import { ChatInbox } from "@/components/chat/ChatInbox";

export default function ClientMessagesPage() {
  return (
    <div className="mx-auto max-w-3xl py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        Správy
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Tvoje chaty s umelcami. Klikni na konverzáciu.
      </p>
      <div className="mt-6">
        <ChatInbox basePath="/client-dashboard/bookings" />
      </div>
    </div>
  );
}
