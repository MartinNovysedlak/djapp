import type { Metadata } from "next";
import Link from "next/link";
import {
  Disc3,
  ClipboardCheck,
  ArrowRight,
  Sparkles,
  Check,
  FileSignature,
  Calendar,
  Mic2,
  MapPin,
  Users,
  Zap,
  MessageSquare,
  Radio,
  Link2,
  Receipt,
  Star,
} from "lucide-react";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Reveal, Equalizer, Aurora } from "@/components/motion";
import { BRAND, SEO_DEFAULT } from "@/lib/brand";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandLogo } from "@/components/BrandLogo";
import {
  PREMIUM_PRICE_LABEL,
  TRIAL_DAYS,
} from "@/lib/plans";

export const metadata: Metadata = {
  title: { absolute: SEO_DEFAULT.title },
  description: SEO_DEFAULT.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: SEO_DEFAULT.title,
    description: SEO_DEFAULT.description,
    url: "/",
    siteName: BRAND.name,
    locale: BRAND.locale,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_DEFAULT.title,
    description: SEO_DEFAULT.description,
  },
};

const faqItems = [
  {
    q: `Čo je ${BRAND.name}?`,
    a: "Webová platforma, ktorá spája klientov s umelcami (DJ, kapela alebo DJ + Kapela). Klient nájde umelca v katalógu a pošle nezáväzný dopyt. Umelec spravuje rezervácie, kalendár, zmluvy, faktúry, playlist a live requesty na jednom mieste.",
  },
  {
    q: "Je BookTheVibe zadarmo?",
    a: `Áno — Free plán ti dá verejný profil a miesto v katalógu. Premium funkcie (kalendár, rezervácie, dokumenty a ďalšie) stoja ${PREMIUM_PRICE_LABEL} / mesiac. Pri registrácii máš prvých ${TRIAL_DAYS} dní Premium zadarmo.`,
  },
  {
    q: "Ako sa dostanem do katalógu umelcov?",
    a: "Zaregistruj sa ako umelec (DJ, kapela alebo DJ + Kapela), vyplň profil (umelecké meno / názov, bio, fotka, lokalita) a tvoja verejná vizitka sa zobrazí v katalógu. Klienti ťa nájdu podľa mena alebo mesta.",
  },
  {
    q: "Ako funguje rezervácia pre klientov?",
    a: "Klient si vyberie umelca, zvolí dátum a čas a odošle dopyt. Obsadené termíny (vrátane synchronizovaného osobného kalendára) sa blokujú automaticky. Umelec dopyt prijme alebo odmietne.",
  },
  {
    q: "Čo všetko má umelec v dashboarde?",
    a: "Rezervácie, kalendár a blokácie, synchronizáciu s Google/Apple, PDF zmluvy a faktúry, harmonogram akcie, playlist, live song requesty, špeciálnu ponuku a žiadosť o Google recenziu po akcii.",
  },
  {
    q: "Sú moje údaje v bezpečí?",
    a: "Používame moderné prihlásenie a šifrované spojenie. Tvoje dáta patria tebe — nepredávame ich tretím stranám.",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      <Aurora />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6">
        {/* HERO — brand first */}
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
              Katalóg umelcov, nezáväzné rezervácie, kalendár, zmluvy a live
              requesty. Klient nájde umelca. Umelec drží celý event pod
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
                        { label: "Rezervácie", active: true },
                        { label: "Kalendár", active: false },
                        { label: "Zmluvy", active: false },
                        { label: "Live", active: false },
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

        {/* FEATURES */}
        <section className="mt-32 md:mt-44">
          <Reveal className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              Čo BookTheVibe robí
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white md:text-4xl">
              Od prvého dopytu po poslednú pieseň
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-zinc-500">
              Nástroje, ktoré v appke naozaj používaš — nie sľuby do vzduchu.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-6 md:grid-rows-2">
            <Reveal delay={0} className="md:col-span-4" from="left">
              <div className="card-lift group relative h-full overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-violet-500/[0.09] via-card to-card p-8">
                <div
                  aria-hidden
                  className="absolute -right-20 -top-20 size-64 rounded-full bg-violet-500/15 opacity-40 blur-3xl transition-opacity duration-700 group-hover:opacity-100"
                />
                <div className="relative flex h-full flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div className="max-w-sm">
                    <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300 shadow-[0_0_30px_-8px_oklch(0.6_0.26_295/0.7)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                      <ClipboardCheck className="size-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">
                      Rezervácie bez chaosu
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      Klient pošle dopyt s dátumom, časom a adresou. Ty prijmeš
                      alebo odmietneš — a všetko ostane v jednom dashboarde.
                    </p>
                  </div>
                  <div className="w-full max-w-[240px] space-y-2">
                    {[
                      {
                        name: "Svadba",
                        date: "14. 8.",
                        tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                      },
                      {
                        name: "Oslava",
                        date: "22. 8.",
                        tone: "text-violet-300 bg-violet-500/10 border-violet-500/20",
                      },
                      {
                        name: "Klub",
                        date: "5. 9.",
                        tone: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
                      },
                    ].map((row) => (
                      <div
                        key={row.name}
                        className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5"
                      >
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${row.tone}`}
                        >
                          {row.name}
                        </span>
                        <span className="ml-auto text-[10px] text-zinc-500">
                          {row.date}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={120} className="md:col-span-2" from="right">
              <div className="card-lift group relative h-full overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-cyan-500/[0.07] via-card to-card p-8">
                <div className="relative">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                    <Calendar className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    Kalendár & sync
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Blokácie, vlastné akcie a prepojenie s Google/Apple
                    kalendárom — obsadené termíny sa klientovi sami zablokujú.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={100} className="md:col-span-2" from="left">
              <div className="card-lift group relative h-full overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-fuchsia-500/[0.07] via-card to-card p-8">
                <div className="relative">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-300 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                    <FileSignature className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    Zmluvy & faktúry
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Šablóny, PDF dokumenty a odoslanie klientovi priamo z
                    rezervácie — bez Word chaosu.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={200} className="md:col-span-4" from="right">
              <div className="card-lift group relative h-full overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-amber-500/[0.07] via-card to-card p-8">
                <div className="relative flex h-full flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div className="max-w-sm">
                    <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                      <Users className="size-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">
                      Verejný katalóg
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      Profil s fotkou, bio, galériou, videami a odkazmi. Klienti
                      ťa nájdu podľa mesta — ty získaš dopyty, nie spam.
                    </p>
                  </div>
                  <div className="flex w-full max-w-[260px] items-end gap-2.5">
                    {[
                      "from-violet-400 to-fuchsia-500",
                      "from-cyan-400 to-blue-500",
                      "from-amber-400 to-orange-500",
                    ].map((g) => (
                      <div
                        key={g}
                        className="flex-1 overflow-hidden rounded-xl border border-white/8 bg-white/[0.03]"
                      >
                        <div
                          className={`flex h-14 items-center justify-center bg-gradient-to-br ${g}`}
                        >
                          <Mic2 className="size-4 text-white/80" />
                        </div>
                        <div className="space-y-1 p-2">
                          <div className="h-1.5 w-3/4 rounded-full bg-white/15" />
                          <div className="flex items-center gap-1">
                            <MapPin className="size-2 text-zinc-600" />
                            <div className="h-1 w-1/2 rounded-full bg-white/[0.08]" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Radio,
                title: "Live song requesty",
                text: "QR na akcii — hostia posielajú piesne, ty ich schvaľuješ v live boothi.",
              },
              {
                icon: Link2,
                title: "Harmonogram & playlist",
                text: "Časová os večera a zoznam skladieb priamo pri rezervácii.",
              },
              {
                icon: Star,
                title: "Recenzie po akcii",
                text: "Po evente môžeš požiadať o Google recenziu — automaticky, nie ručne.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={80 * i}>
                <div className="card-lift h-full rounded-3xl border border-white/8 bg-card/70 p-6 backdrop-blur-md">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white/5 text-violet-300">
                    <item.icon className="size-5" />
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                    {item.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CATALOG TEASER */}
        <section className="mt-32 md:mt-44">
          <Reveal from="none">
            <div className="glass card-lift relative overflow-hidden rounded-3xl p-10 md:p-14">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-violet-500/15 blur-3xl animate-glow-pulse"
              />
              <div className="relative flex flex-col items-center gap-8 text-center md:flex-row md:justify-between md:text-left">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-300">
                    <Zap className="size-3.5" />
                    Pre klientov
                  </div>
                  <h2 className="text-balance text-2xl font-bold tracking-tight text-white md:text-3xl">
                    Nájdi umelca pre svoju akciu
                  </h2>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400">
                    Prehliadaj profily, pozri dostupnosť a pošli nezáväzný dopyt
                    — bez telefonátov a bez chaosu v správach.
                  </p>
                </div>
                <Link
                  href="/djs"
                  className="group inline-flex h-12 shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 text-sm font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-violet-200"
                >
                  Otvoriť katalóg
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* PRICING — Free + Premium */}
        <section className="mt-32 md:mt-44">
          <Reveal className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              Plány
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Začni Free. Keď rastieš, choď Premium.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-500">
              Free ťa dostane do katalógu a pred klientov. Premium ti dá celý
              biznis nástroj — a prvých {TRIAL_DAYS} dní ho máš zadarmo.
            </p>
          </Reveal>

          <div className="mx-auto grid max-w-3xl items-stretch gap-5 md:grid-cols-2">
            <Reveal from="left" delay={80}>
              <div className="card-lift flex h-full flex-col rounded-3xl border border-white/8 bg-card/70 p-8 backdrop-blur-md md:p-9">
                <div className="mb-5 flex items-center gap-2.5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-white/5">
                    <Disc3 className="size-5 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Free</h3>
                </div>
                <div className="mb-2">
                  <span className="text-4xl font-bold tracking-tight text-white">
                    €0
                  </span>
                  <span className="ml-1.5 text-sm text-zinc-500">/ navždy</span>
                </div>
                <p className="mb-7 text-sm leading-relaxed text-zinc-400">
                  Ideálne na štart — buď viditeľný a nech ťa klienti nájdu.
                </p>
                <ul className="mb-8 flex-1 space-y-3.5">
                  {[
                    "Verejný profil s fotkou, bio a lokalitou",
                    "Miesto v katalógu — klienti ťa nájdu sami",
                    "Odkazy na Instagram, Spotify a web",
                    "Galéria a videá na vizitke",
                    "Jednoduchá verejná stránka, ktorú môžeš zdieľať",
                    "Bez karty, bez viazanosti",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-zinc-400"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register?role=dj"
                  className="flex h-11 w-full items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-medium text-white transition-all duration-300 hover:border-white/25 hover:bg-white/10"
                >
                  Začať Free — zadarmo
                </Link>
              </div>
            </Reveal>

            <Reveal from="right" delay={160}>
              <div className="card-lift relative flex h-full flex-col overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-b from-violet-500/[0.12] via-card to-card p-8 shadow-[0_24px_70px_-24px_oklch(0.6_0.26_295/0.5)] md:p-9">
                <div className="absolute right-6 top-6">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1 text-[10px] font-semibold text-white shadow-[0_8px_24px_-8px_oklch(0.6_0.26_295)]">
                    <Sparkles className="size-3" />
                    {TRIAL_DAYS} dní free
                  </span>
                </div>
                <div className="relative mb-5 flex items-center gap-2.5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/15">
                    <Receipt className="size-5 text-violet-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Premium</h3>
                </div>
                <div className="relative mb-2">
                  <span className="text-4xl font-bold tracking-tight text-white">
                    {PREMIUM_PRICE_LABEL}
                  </span>
                  <span className="ml-1.5 text-sm text-zinc-400">/ mesiac</span>
                </div>
                <p className="relative mb-7 text-sm leading-relaxed text-zinc-400">
                  Celý biznis v jednom dashboarde. Prvých {TRIAL_DAYS} dní
                  úplne zadarmo.
                </p>
                <ul className="relative mb-8 flex-1 space-y-3.5">
                  {[
                    "Rezervácie a dopyty od klientov",
                    "Kalendár, blokácie a ICS sync",
                    "PDF zmluvy a faktúry",
                    "Harmonogram, playlist a live requesty",
                    "Špeciálna ponuka a marketing",
                    "Všetko z Free plánu",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-zinc-300"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-violet-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register?role=dj"
                  className="relative flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-sm font-semibold text-white shadow-[0_12px_36px_-10px_oklch(0.6_0.26_295/0.9)] transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
                >
                  Vyskúšať {TRIAL_DAYS} dní zadarmo
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-32 md:mt-44">
          <Reveal className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              FAQ
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Často kladené otázky
            </h2>
          </Reveal>

          <Reveal delay={120}>
            <div className="mx-auto max-w-2xl">
              <Accordion className="glass rounded-3xl p-5">
                {faqItems.map((item, i) => (
                  <AccordionItem key={item.q} value={`faq-${i}`}>
                    <AccordionTrigger className="px-2 text-sm text-zinc-200">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="px-2 text-sm leading-relaxed text-zinc-500">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </Reveal>
        </section>

        {/* FINAL CTA */}
        <section className="my-32 md:my-44">
          <Reveal from="none">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.1] via-card/80 to-card/60 p-10 text-center md:p-20">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-32 left-1/2 size-[480px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,oklch(0.55_0.26_295/0.35),transparent_65%)] blur-2xl animate-glow-pulse"
              />
              <div className="relative z-10 flex flex-col items-center">
                <Equalizer className="mb-6 h-6 scale-125" />
                <h2 className="text-balance text-3xl font-bold tracking-tight text-white md:text-4xl">
                  Pripravený booknúť vibe
                  <br />
                  <span className="text-gradient">a nie chaos?</span>
                </h2>
                <p className="mt-4 max-w-md text-sm text-zinc-400">
                  Vytvor free profil, pridaj sa do katalógu a spravuj rezervácie
                  v BookTheVibe.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/register?role=dj"
                    className="group inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 text-sm font-semibold text-white shadow-[0_16px_44px_-12px_oklch(0.6_0.26_295)] transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
                  >
                    Vytvoriť účet zadarmo
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/djs"
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 text-sm font-medium text-zinc-200 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/10"
                  >
                    Prehliadať katalóg
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
