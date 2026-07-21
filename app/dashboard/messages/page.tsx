import { ChatInbox } from "@/components/chat/ChatInbox";

export default function DjMessagesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        Správy
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Live chat so zákazníkmi pri rezerváciách. Správy sa automaticky mažú po
        1 roku — môžeš si ich stiahnuť v chate.
      </p>
      <div className="mt-6">
        <ChatInbox basePath="/dashboard/bookings" />
      </div>
    </div>
  );
}
