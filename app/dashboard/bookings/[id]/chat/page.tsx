import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { BookingChat } from "@/components/chat/BookingChat";
import { getBookingChatMeta } from "@/app/actions/booking-messages";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bookingsReturnHref } from "@/lib/bookings-nav";

export default async function DjBookingChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meta = await getBookingChatMeta(id);
  if (!meta.ok) {
    if (meta.error.includes("prihlásený")) redirect("/login");
    notFound();
  }

  const backTab =
    meta.status === "pending"
      ? "new"
      : meta.status === "accepted"
        ? "confirmed"
        : "history";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 md:px-6">
      <div className="flex items-start gap-3">
        <Link
          href={bookingsReturnHref({ bookingId: id, tab: backTab })}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "mt-0.5 shrink-0 rounded-full"
          )}
          aria-label="Späť"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-white">
            {meta.title}
          </h1>
          <p className="truncate text-sm text-zinc-500">{meta.subtitle}</p>
        </div>
      </div>
      <BookingChat bookingId={id} />
    </div>
  );
}
