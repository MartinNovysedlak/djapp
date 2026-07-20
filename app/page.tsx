import Link from "next/link";
import {
  Disc3,
  Music,
  ClipboardCheck,
  ArrowRight,
  Sparkles,
  Download,
  Check,
  FileSignature,
  Calendar,
  Mic2,
  MapPin,
  Users,
  Zap,
  MessageSquare,
} from "lucide-react";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Reveal, Equalizer, Aurora } from "@/components/motion";

// ── FAQ data ───────────────────────────────────────────────────────────────────
const faqItems = [
  {
    q: "Je DJ App naozaj zadarmo?",
    a: "Áno. Free plán je a navždy bude zadarmo. Získaš v ňom verejný profil, základné info a miesto v katalógu DJ-ov. PRO funkcie (kalendár, aparatúra, rezervácie) sú dostupné v samostatnej aplikácii na stiahnutie.",
  },
  {
    q: "Ako sa dostanem do katalógu DJ-ov?",
    a: "Stačí sa zaregistrovať, vyplniť svoj profil (meno, bio, fotka) a automaticky sa zobrazíš v katalógu. Ostatní ťa nájdu podľa mena alebo lokality.",
  },
  {
    q: "Čo všetko mi PRO aplikácia ponúkne?",
    a: "Po stiahnutí PRO aplikácie získavaš plný systém pre Windows – kalendár vystúpení, manažment dopytov a rezervácií, zmluvy a správu aparatúry.",
  },
  {
    q: "Môžem si rezervácie spravovať sám?",
    a: "Áno. V PRO aplikácii máš úplnú kontrolu – schvaľuješ, upravuješ a spravuješ všetky rezervácie. Klienti ti posielajú požiadavky cez tvoju verejnú vizitku.",
  },
  {
    q: "Sú moje údaje v bezpečí?",
    a: "Používame Supabase Auth so šifrovaním. Tvoje dáta patria len tebe. Nikdy ich nepredávame ani nezdieľame s tretími stranami.",
  },
  {
    q: "Môžem si neskôr stiahnuť PRO aplikáciu?",
    a: "Samozrejme. Free profil ti ostáva natrvalo. PRO aplikáciu si môžeš stiahnuť kedykoľvek – všetky tvoje dáta z Free profilu sa automaticky prenesú.",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Home() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      <Aurora />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6">
        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 1. HERO                                                           */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section className="flex flex-col items-center pt-16 text-center md:pt-24">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)] backdrop-blur-md">
              <Equalizer className="h-4" />
              Freemium platforma pre profesionálnych DJ-ov
              <Sparkles className="size-3.5 text-violet-300" />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <h1 className="mt-7 max-w-4xl text-balance text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl">
              Tvoj DJ biznis,
              <br />
              <span className="text-gradient">
                profesionálne a na jednom mieste
              </span>
            </h1>
          </Reveal>

          <Reveal delay={240}>
            <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-zinc-400 md:text-lg">
              Verejný profil v katalógu, nezáväzné rezervácie od klientov,
              zmluvy a správa aparatúry. Jeden účet. Všetky nástroje.
            </p>
          </Reveal>

          <Reveal delay={360}>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href="/register?role=dj"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 text-sm font-semibold text-white shadow-[0_16px_40px_-12px_oklch(0.6_0.26_295/0.8)] transition-all duration-300 hover:shadow-[0_16px_55px_-8px_oklch(0.6_0.26_295/1)] hover:brightness-110 active:scale-[0.98]"
              >
                Pridať sa do katalógu
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <button
                type="button"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 text-sm font-medium text-zinc-200 backdrop-blur-md transition-all duration-300 hover:border-white/25 hover:bg-white/10 active:scale-[0.98]"
              >
                <Download className="size-4" />
                Stiahnuť PRO
              </button>
            </div>
          </Reveal>

          <Reveal delay={480}>
            <div className="mt-8 flex items-center gap-6 text-xs text-zinc-500">
              {["Žiadna karta", "Žiadne záväzky", "Natrvalo free"].map(
                (item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-400" />
                    {item}
                  </span>
                )
              )}
            </div>
          </Reveal>

          {/* ── Floating hero visual — mock app window + floating cards ───── */}
          <Reveal delay={550} className="relative mt-16 w-full md:mt-20">
            <div className="relative mx-auto max-w-4xl">
              {/* Glow under the window */}
              <div
                aria-hidden
                className="absolute -inset-x-8 top-8 -bottom-8 rounded-[3rem] bg-[radial-gradient(ellipse_60%_60%_at_50%_40%,oklch(0.55_0.26_295/0.28),transparent_70%)] blur-2xl animate-glow-pulse"
              />

              {/* Main mock window */}
              <div className="glass relative overflow-hidden rounded-3xl p-1.5 shadow-[0_40px_100px_-30px_oklch(0_0_0/0.8)]">
                <div className="rounded-[1.25rem] border border-white/5 bg-background/80 p-5 md:p-7">
                  {/* Toolbar */}
                  <div className="mb-5 flex items-center gap-2 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-full bg-rose-500/80" />
                      <div className="size-2.5 rounded-full bg-amber-500/80" />
                      <div className="size-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="mx-auto h-6 w-56 rounded-full border border-white/5 bg-white/[0.03]" />
                    <Equalizer className="ml-auto h-5" />
                  </div>

                  {/* Content: sidebar + calendar-like grid */}
                  <div className="flex gap-5">
                    <div className="hidden w-36 space-y-1.5 md:block">
                      {[
                        { label: "Prehľad", active: true },
                        { label: "Rezervácie", active: false },
                        { label: "Kalendár", active: false },
                        { label: "Zmluvy", active: false },
                        { label: "Aparatúra", active: false },
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
                        <div className="space-y-1.5">
                          <div className="h-2.5 w-32 rounded-full bg-white/15" />
                          <div className="h-2 w-20 rounded-full bg-white/[0.07]" />
                        </div>
                        <span className="ml-auto rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-semibold text-emerald-400">
                          3 nové dopyty
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          "from-violet-500/20 to-violet-500/5",
                          "from-fuchsia-500/15 to-fuchsia-500/5",
                          "from-cyan-500/15 to-cyan-500/5",
                        ].map((g, i) => (
                          <div
                            key={i}
                            className={`h-20 rounded-xl border border-white/5 bg-gradient-to-br ${g} p-3`}
                          >
                            <div className="mb-2 h-2 w-14 rounded-full bg-white/15" />
                            <div className="h-1.5 w-9 rounded-full bg-white/[0.08]" />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        {[80, 62, 71].map((w, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
                          >
                            <div className="size-6 rounded-full bg-white/10" />
                            <div
                              className="h-2 rounded-full bg-white/10"
                              style={{ width: `${w * 0.6}%` }}
                            />
                            <div className="ml-auto h-4 w-12 rounded-full bg-violet-500/15" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating card — booking request */}
              <div className="glass absolute -left-4 top-16 hidden w-52 rounded-2xl p-4 shadow-[0_24px_60px_-20px_oklch(0_0_0/0.8)] animate-float md:block lg:-left-16">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/25 to-emerald-500/10">
                    <MessageSquare className="size-4 text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Nový dopyt
                    </p>
                    <p className="text-[10px] text-zinc-500">Svadba · Trnava</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
                </div>
              </div>

              {/* Floating card — calendar */}
              <div className="glass absolute -right-4 bottom-12 hidden w-48 rounded-2xl p-4 shadow-[0_24px_60px_-20px_oklch(0_0_0/0.8)] animate-float-delayed md:block lg:-right-14">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400/25 to-fuchsia-500/10">
                    <Calendar className="size-4 text-violet-300" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Sobota</p>
                    <p className="text-[10px] text-zinc-500">Klubová noc · 22:00</p>
                  </div>
                </div>
              </div>

              {/* Floating vinyl */}
              <div
                aria-hidden
                className="absolute -top-10 right-8 hidden size-20 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] shadow-[0_20px_50px_-16px_oklch(0.6_0.26_295/0.6)] backdrop-blur-md animate-spin-slow lg:flex"
              >
                <Disc3 className="size-10 text-violet-300/80" strokeWidth={1} />
              </div>
            </div>
          </Reveal>
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 2. BENTO GRID — asymetrický                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section className="mt-32 md:mt-44">
          <Reveal className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              Funkcie platformy
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white md:text-4xl">
              Všetko, čo DJ potrebuje
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-zinc-500">
              Jeden účet. Všetky nástroje. Žiadny chaos.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-6 md:grid-rows-2">
            {/* Rezervácie — large tile 4x1 */}
            <Reveal
              delay={0}
              className="md:col-span-4"
              from="left"
            >
              <div className="card-lift group relative h-full overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-violet-500/[0.09] via-card to-card p-8">
                <div
                  aria-hidden
                  className="absolute -right-20 -top-20 size-64 rounded-full bg-violet-500/15 blur-3xl transition-opacity duration-700 group-hover:opacity-100 opacity-40"
                />
                <div className="relative flex h-full flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div className="max-w-sm">
                    <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300 shadow-[0_0_30px_-8px_oklch(0.6_0.26_295/0.7)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                      <ClipboardCheck className="size-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">
                      Rezervácie
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      Klienti ti posielajú nezáväzné dopyty priamo z tvojho
                      profilu. Schvaľuješ, odmietaš a odpovedáš jedným klikom.
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">
                      PRO
                    </span>
                  </div>

                  {/* Mini inbox mock */}
                  <div className="w-full max-w-[240px] space-y-2">
                    {[
                      { name: "Svadba", date: "14. 8.", tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                      { name: "Oslava", date: "22. 8.", tone: "text-violet-300 bg-violet-500/10 border-violet-500/20" },
                      { name: "Klub", date: "5. 9.", tone: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20" },
                    ].map((row, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 transition-transform duration-500 group-hover:translate-x-1"
                        style={{ transitionDelay: `${i * 60}ms` }}
                      >
                        <div className="size-6 rounded-full bg-white/10" />
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

            {/* Zmluvy — 2x1 */}
            <Reveal delay={120} className="md:col-span-2" from="right">
              <div className="card-lift group relative h-full overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-cyan-500/[0.07] via-card to-card p-8">
                <div
                  aria-hidden
                  className="absolute -left-16 -bottom-16 size-48 rounded-full bg-cyan-500/10 blur-3xl"
                />
                <div className="relative">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                    <FileSignature className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Zmluvy</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Profesionálne zmluvy pre každú akciu. Šablóny, potvrdenia a
                    archív dokumentov.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">
                    PRO
                  </span>
                </div>
              </div>
            </Reveal>

            {/* Aparatúra — 2x1 */}
            <Reveal delay={100} className="md:col-span-2" from="left">
              <div className="card-lift group relative h-full overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-fuchsia-500/[0.07] via-card to-card p-8">
                <div
                  aria-hidden
                  className="absolute -right-16 -top-16 size-48 rounded-full bg-fuchsia-500/10 blur-3xl"
                />
                <div className="relative">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-300 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                    <Music className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    Aparatúra
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Eviduj techniku, pripravuj checklisty a maj prehľad o stave
                    každého kusu vybavenia.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">
                    PRO
                  </span>
                </div>
              </div>
            </Reveal>

            {/* Katalóg — 4x1 */}
            <Reveal delay={200} className="md:col-span-4" from="right">
              <div className="card-lift group relative h-full overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-amber-500/[0.07] via-card to-card p-8">
                <div
                  aria-hidden
                  className="absolute -left-20 -bottom-20 size-64 rounded-full bg-amber-500/10 blur-3xl"
                />
                <div className="relative flex h-full flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div className="max-w-sm">
                    <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                      <Users className="size-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">
                      Katalóg DJ-ov
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      Verejný profil s fotkou, bio a odkazmi na hudbu. Klienti
                      ťa nájdu podľa mesta – bez provízií.
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                      FREE
                    </span>
                  </div>

                  {/* Mini profile cards mock */}
                  <div className="flex w-full max-w-[260px] items-end gap-2.5">
                    {[
                      "from-violet-400 to-fuchsia-500",
                      "from-cyan-400 to-blue-500",
                      "from-amber-400 to-orange-500",
                    ].map((g, i) => (
                      <div
                        key={i}
                        className="flex-1 overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] transition-transform duration-500 group-hover:-translate-y-1.5"
                        style={{ transitionDelay: `${i * 70}ms` }}
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
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 3. KATALÓG TEASER                                                 */}
        {/* ══════════════════════════════════════════════════════════════════ */}
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
                    Verejný katalóg
                  </div>
                  <h2 className="text-balance text-2xl font-bold tracking-tight text-white md:text-3xl">
                    Objav DJ-ov vo svojom meste
                  </h2>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400">
                    Prehliadaj profily aktívnych DJ-ov, filtruj podľa lokality a
                    pošli nezáväznú rezerváciu priamo cez platformu.
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

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 4. PRICING                                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section className="mt-32 md:mt-44">
          <Reveal className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              Cenník
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Začni zadarmo
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-zinc-500">
              Keď budeš potrebovať viac, stiahni si PRO desktopovú aplikáciu.
            </p>
          </Reveal>

          <div className="mx-auto grid max-w-3xl items-stretch gap-5 md:grid-cols-2">
            {/* Free */}
            <Reveal from="left" delay={80}>
              <div className="card-lift flex h-full flex-col rounded-3xl border border-white/8 bg-card/70 p-8 backdrop-blur-md md:p-9">
                <div className="mb-5 flex items-center gap-2.5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-white/5">
                    <Disc3 className="size-5 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Free</h3>
                </div>
                <div className="mb-7">
                  <span className="text-4xl font-bold tracking-tight text-white">
                    €0
                  </span>
                  <span className="ml-1.5 text-sm text-zinc-500">/ navždy</span>
                </div>
                <ul className="mb-8 flex-1 space-y-3.5">
                  {[
                    "Verejný profil s fotkou a bio",
                    "Miesto v katalógu DJ-ov",
                    "Odkazy na sociálne siete a hudbu",
                    "Prijímanie nezáväzných dopytov",
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
                  Začať zadarmo
                </Link>
              </div>
            </Reveal>

            {/* PRO */}
            <Reveal from="right" delay={160}>
              <div className="card-lift relative flex h-full flex-col overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-b from-violet-500/[0.12] via-card to-card p-8 shadow-[0_24px_70px_-24px_oklch(0.6_0.26_295/0.5)] md:p-9">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-violet-500/20 blur-3xl animate-glow-pulse"
                />
                {/* Popular badge */}
                <div className="absolute right-6 top-6">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1 text-[10px] font-semibold text-white shadow-[0_8px_24px_-8px_oklch(0.6_0.26_295)]">
                    <Sparkles className="size-3" />
                    Odporúčame
                  </span>
                </div>

                <div className="relative mb-5 flex items-center gap-2.5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/15">
                    <Mic2 className="size-5 text-violet-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">PRO</h3>
                </div>
                <div className="relative mb-7">
                  <span className="text-4xl font-bold tracking-tight text-white">
                    Desktop
                  </span>
                  <span className="ml-1.5 text-sm text-zinc-500">
                    pre Windows
                  </span>
                </div>
                <ul className="relative mb-8 flex-1 space-y-3.5">
                  {[
                    "Plný systém pre Windows",
                    "Kalendár vystúpení",
                    "Manažment dopytov a rezervácií",
                    "Zmluvy a dokumenty",
                    "Správa aparatúry",
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
                <button
                  type="button"
                  className="relative flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-sm font-semibold text-white shadow-[0_12px_36px_-10px_oklch(0.6_0.26_295/0.9)] transition-all duration-300 hover:shadow-[0_12px_44px_-6px_oklch(0.6_0.26_295)] hover:brightness-110 active:scale-[0.98]"
                >
                  <Download className="size-4" />
                  Stiahnuť PRO
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 5. FAQ                                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
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
                  <AccordionItem key={i} value={`faq-${i}`}>
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

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 6. FINAL CTA                                                      */}
        {/* ══════════════════════════════════════════════════════════════════ */}
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
                  Pripravený posunúť svoju kariéru
                  <br />
                  <span className="text-gradient">na vyššiu úroveň?</span>
                </h2>
                <p className="mt-4 text-sm text-zinc-400">
                  100% Free na štart. Žiadna kreditná karta. Žiadne záväzky.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/register?role=dj"
                    className="group inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 text-sm font-semibold text-white shadow-[0_16px_44px_-12px_oklch(0.6_0.26_295)] transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
                  >
                    Vytvoriť účet zadarmo
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  <button
                    type="button"
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 text-sm font-medium text-zinc-200 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/10"
                  >
                    <Download className="size-4" />
                    Stiahnuť PRO
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-10 text-center text-xs text-zinc-600">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Disc3 className="size-4 text-violet-400" strokeWidth={1.5} />
            <span className="font-medium text-zinc-400">DJ App</span>
          </div>
          <div className="flex gap-6">
            <span className="cursor-pointer transition-colors duration-300 hover:text-zinc-300">
              Podmienky
            </span>
            <span className="cursor-pointer transition-colors duration-300 hover:text-zinc-300">
              Súkromie
            </span>
            <span className="cursor-pointer transition-colors duration-300 hover:text-zinc-300">
              Kontakt
            </span>
          </div>
          <span>
            &copy; {new Date().getFullYear()} DJ App — Všetky práva vyhradené.
          </span>
        </div>
      </footer>
    </div>
  );
}
