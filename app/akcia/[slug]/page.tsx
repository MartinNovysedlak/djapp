import { getGuestShareBySlug } from "@/app/actions/guest-share";
import { GuestShareHub } from "@/components/share/GuestShareHub";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const result = await getGuestShareBySlug(slug);
  if (!result.ok) {
    return { title: "Príprava akcie", robots: { index: false, follow: false } };
  }
  return {
    title: `Príprava akcie${result.share.djName ? ` · ${result.share.djName}` : ""}`,
    description:
      "Uprav harmonogram a playlist pre svoju akciu — bez registrácie.",
    robots: { index: false, follow: false },
  };
}

export default async function GuestSharePage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getGuestShareBySlug(slug);

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

  return <GuestShareHub share={result.share} />;
}
