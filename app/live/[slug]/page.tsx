import { getLiveBookingBySlug } from "@/app/actions/live-requests";
import { LiveGuestForm } from "@/components/live/LiveGuestForm";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const result = await getLiveBookingBySlug(slug);
  if (!result.ok) {
    return { title: "Live želania" };
  }
  return {
    title: `Pesnička na želanie${result.booking.djName ? ` · ${result.booking.djName}` : ""}`,
    description: "Pošli DJ-ovi skladbu na želanie priamo z mobilu.",
  };
}

export default async function LiveGuestPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getLiveBookingBySlug(slug);

  if (!result.ok) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#0A0A0A] px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-white">Odkaz neplatí</h1>
          <p className="mt-2 text-sm text-zinc-500">{result.error}</p>
        </div>
      </div>
    );
  }

  return <LiveGuestForm booking={result.booking} />;
}
