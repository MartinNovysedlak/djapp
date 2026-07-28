import type { Metadata } from "next";
import Link from "next/link";
import {
  Disc3,
  ArrowRight,
  Sparkles,
  Check,
  Users,
  MessageSquare,
  Radio,
} from "lucide-react";

import { Reveal, Equalizer, Aurora } from "@/components/motion";
import { BRAND } from "@/lib/brand";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandLogo } from "@/components/BrandLogo";
import { HomeBelowFoldLoader } from "@/components/home/HomeBelowFoldLoader";
import { buildPageMetadata, getHomeJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata("home");
export const revalidate = 3600;

export default function Home() {
  const jsonLd = getHomeJsonLd();

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Aurora />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6">
        {/* HERO — brand first (SSR for SEO + fast soft-nav) */}
        <section className="flex flex-col items-center pt-16 text-center md:pt-24">
          <Reveal>
            <BrandLogo size="hero" className="mx-auto" />
          </Reveal>

          <Reveal delay={60}>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)] backdrop-blur-md">
              <Equalizer className="h-4" />
              Platforma pre umelcov a klientov
              <Sparkles className="size-3.5 text-violet-300" />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <h1 className="mt-7 max-w-4xl text-balance text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl">
              Rezervuj vibe.
              <br />
              <span className="text-gradient">Spravuj biznis.</span>
            </h1>
          </Reveal>

          <Reveal delay={240}>
            <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-zinc-400 md:text-lg">
              Katalóg so smart filtrami, hromadný dopyt, page builder, kalendár a
              dokumenty. Klient nájde správneho umelca. Ty držíš celý event pod
              kontrolou.
            </p>
          </Reveal>

          <Reveal delay={360}>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href="/register?role=dj"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 text-sm font-semibold text-white shadow-[0_16px_40px_-12px_oklch(0.6_0.26_295/0.8)] transition-all duration-300 hover:shadow-[0_16px_55px_-8px_oklch(0.6_0.26_295/1)] hover:brightness-110 active:scale-[0.98]"
              >
                Som umelec — pridať profil
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/djs"
                prefetch
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 text-sm font-medium text-zinc-200 backdrop-blur-md transition-all duration-300 hover:border-white/25 hover:bg-white/10 active:scale-[0.98]"
              >
                <Users className="size-4" />
                Hľadám umelca
              </Link>
            </div>
          </Reveal>

          <Reveal delay={480}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500">
              {["Webová appka", "14 dní Premium zadarmo", "Free profil"].map(
                (item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-400" />
                    {item}
                  </span>
                )
              )}
            </div>
          </Reveal>

          <Reveal delay={550} className="relative mt-16 w-full md:mt-20">
            <div className="relative mx-auto max-w-4xl">
              <div
                aria-hidden
                className="absolute -inset-x-8 top-8 -bottom-8 rounded-[3rem] bg-[radial-gradient(ellipse_60%_60%_at_50%_40%,oklch(0.55_0.26_295/0.28),transparent_70%)] blur-2xl animate-glow-pulse"
              />

              <div className="glass relative overflow-hidden rounded-3xl p-1.5 shadow-[0_40px_100px_-30px_oklch(0_0_0/0.8)]">
                <div className="rounded-[1.25rem] border border-white/5 bg-background/80 p-5 md:p-7">
                  <div className="mb-5 flex items-center gap-2 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-full bg-rose-500/80" />
                      <div className="size-2.5 rounded-full bg-amber-500/80" />
                      <div className="size-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="mx-auto flex h-6 w-56 items-center justify-center rounded-full border border-white/5 bg-white/[0.03] text-[10px] font-medium tracking-wide text-zinc-500">
                      {BRAND.name}
                    </div>
                    <Equalizer className="ml-auto h-5" />
                  </div>

                  <div className="flex gap-5">
                    <div className="hidden w-36 space-y-1.5 md:block">
                      {[
                        { label: "Profil", active: false },
                        { label: "Page builder", active: false },
                        { label: "Rezervácie", active: true },
                        { label: "Kalendár", active: false },
                        { label: "Zmluvy", active: false },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className={`rounded-lg px-3 py-2 text-left text-[11px] font-medium ${
                            item.active
                              ? "bg-violet-500/15 text-violet-300"
                              : "text-zinc-600"
                          }`}
                        >
                          {item.label}
                        </div>
                      ))}
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500" />
                        <div className="space-y-1.5 text-left">
                          <p className="text-xs font-semibold text-white">
                            Dnešný prehľad
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            Rezervácie · Kalendár · Dokumenty
                          </p>
                        </div>
                        <span className="ml-auto rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-semibold text-emerald-400">
                          3 nové dopyty
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          {
                            label: "Prijaté",
                            tone: "from-violet-500/20 to-violet-500/5",
                          },
                          {
                            label: "Kalendár",
                            tone: "from-fuchsia-500/15 to-fuchsia-500/5",
                          },
                          {
                            label: "Live QR",
                            tone: "from-cyan-500/15 to-cyan-500/5",
                          },
                        ].map((card) => (
                          <div
                            key={card.label}
                            className={`h-20 rounded-xl border border-white/5 bg-gradient-to-br ${card.tone} p-3 text-left`}
                          >
                            <p className="text-[10px] font-medium text-zinc-300">
                              {card.label}
                            </p>
                            <div className="mt-3 h-1.5 w-9 rounded-full bg-white/[0.08]" />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        {[
                          { title: "Svadba · Bratislava", status: "Čaká" },
                          { title: "Firemný event · Košice", status: "OK" },
                          { title: "Oslava · Žilina", status: "Čaká" },
                        ].map((row) => (
                          <div
                            key={row.title}
                            className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-left"
                          >
                            <div className="size-6 rounded-full bg-white/10" />
                            <span className="truncate text-[11px] text-zinc-300">
                              {row.title}
                            </span>
                            <span className="ml-auto rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-medium text-violet-300">
                              {row.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass absolute -left-4 top-16 hidden w-52 rounded-2xl p-4 shadow-[0_24px_60px_-20px_oklch(0_0_0/0.8)] animate-float md:block lg:-left-16">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/25 to-emerald-500/10">
                    <MessageSquare className="size-4 text-emerald-300" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">
                      Nový dopyt
                    </p>
                    <p className="text-[10px] text-zinc-500">Svadba · Trnava</p>
                  </div>
                </div>
              </div>

              <div className="glass absolute -right-4 bottom-12 hidden w-48 rounded-2xl p-4 shadow-[0_24px_60px_-20px_oklch(0_0_0/0.8)] animate-float-delayed md:block lg:-right-14">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400/25 to-fuchsia-500/10">
                    <Radio className="size-4 text-violet-300" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">Live booth</p>
                    <p className="text-[10px] text-zinc-500">
                      Hostia posielajú songy
                    </p>
                  </div>
                </div>
              </div>

              <div
                aria-hidden
                className="absolute -top-10 right-8 hidden size-20 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] shadow-[0_20px_50px_-16px_oklch(0.6_0.26_295/0.6)] backdrop-blur-md animate-spin-slow lg:flex"
              >
                <Disc3 className="size-10 text-violet-300/80" strokeWidth={1} />
              </div>
            </div>
          </Reveal>
        </section>

        <HomeBelowFoldLoader />
      </main>

      <SiteFooter />
    </div>
  );
}
