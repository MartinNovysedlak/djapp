import type { Metadata } from "next";
import { getReviewInviteBySlug } from "@/app/actions/review-invite";
import { GuestReviewForm } from "@/components/reviews/GuestReviewForm";
import { BRAND } from "@/lib/brand";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getReviewInviteBySlug(slug);
  if (!result.ok) {
    return { title: `Hodnotenie | ${BRAND.name}` };
  }
  const name = result.invite.djName || "umelca";
  return {
    title: `Ohodnotiť ${name} | ${BRAND.name}`,
    description: `Zanechaj hodnotenie pre ${name} — bez registrácie.`,
    robots: { index: false, follow: false },
  };
}

export default async function GuestReviewPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getReviewInviteBySlug(slug);

  if (!result.ok) {
    return (
      <div className="relative flex min-h-svh items-center justify-center bg-[#0A0A0A] px-4 py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,oklch(0.55_0.24_295/0.22),transparent_60%)]"
        />
        <div className="relative z-10 max-w-md rounded-3xl border border-white/10 bg-card/70 px-6 py-10 text-center backdrop-blur-md">
          <h1 className="text-xl font-bold text-white">Odkaz nie je platný</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {result.error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-[#0A0A0A] px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,oklch(0.55_0.24_295/0.28),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/2 size-80 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl"
      />

      <div className="relative z-10 mx-auto w-full max-w-lg space-y-6">
        <header className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-300/80">
            {BRAND.name}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Hodnotenie po akcii
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Bez registrácie — stačí vyplniť a odoslať.
          </p>
        </header>

        <GuestReviewForm invite={result.invite} />
      </div>
    </div>
  );
}
