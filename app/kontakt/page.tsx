"use client";

import Link from "next/link";
import {
  Disc3,
  Headphones,
  HeartHandshake,
  Mail,
  Sparkles,
  Users,
} from "lucide-react";
import { Reveal, Aurora } from "@/components/motion";
import { ContactAdminForm } from "@/components/ContactAdminForm";

const CONTACT_EMAIL = "bookthevibeonline@gmail.com";

export default function KontaktPage() {
  return (
    <div className="relative flex min-h-svh flex-col bg-[#0A0A0A]">
      <Aurora subtle />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 pb-24 pt-6 md:pt-10">
        <Reveal>
          <div className="mb-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-md">
              <Sparkles className="size-3.5 text-violet-300" />
              O nás & Kontakt
            </div>
            <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight text-white md:text-5xl">
              Spojme sa.{" "}
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-200 bg-clip-text text-transparent">
                Postavme eventy inak.
              </span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500 md:text-base">
              DJ App nie je anonymný web — je to platforma s jasnou víziou:
              menej chaosu pre DJ-ov, viac istoty pre klientov.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          {/* ── Left: About / Mission ─────────────────────────────────────── */}
          <div className="space-y-6">
            <Reveal delay={80}>
              <div>
                <h2 className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-3xl">
                  Náš príbeh & Poslanie
                </h2>
                <p className="mt-2 text-base font-medium text-zinc-300">
                  Meníme spôsob, akým funguje eventový biznis.
                </p>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
                <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                  <Headphones className="size-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Pre DJ-ov</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Nástroj, ktorý ťa zbaví chaosu. Sústreď sa na hudbu, my riešime
                  manažment — rezervácie, kalendár a komunikáciu s klientmi na
                  jednom mieste.
                </p>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
                <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-300">
                  <Users className="size-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Pre klientov</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Koniec stresu pri hľadaní DJ-a. Transparentnosť, reálne
                  recenzie a rýchla rezervácia — vyber si podľa hodnotení a
                  pošli dopyt za pár klikov.
                </p>
              </div>
            </Reveal>

            <Reveal delay={260}>
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/[0.08] to-transparent p-6">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                  <HeartHandshake className="size-4 text-violet-300" />
                  Priamy kontakt
                </div>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex items-center gap-2 text-sm text-violet-200 transition-colors hover:text-white"
                >
                  <Mail className="size-4" />
                  {CONTACT_EMAIL}
                </a>
                <div className="mt-4 flex items-center gap-2">
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all hover:border-pink-500/30 hover:bg-pink-500/10 hover:text-pink-300"
                    aria-label="Instagram"
                  >
                    <svg
                      className="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                  </a>
                  <Link
                    href="/djs"
                    className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-300"
                    aria-label="Katalóg DJ-ov"
                  >
                    <Disc3 className="size-4" />
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>

          {/* ── Right: Contact form ───────────────────────────────────────── */}
          <Reveal delay={160} from="right">
            <div className="card-lift sticky top-28 rounded-[2rem] border border-white/10 bg-card/70 p-7 shadow-[0_40px_100px_-40px_oklch(0_0_0/0.8)] backdrop-blur-xl md:p-9">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-violet-500/20 blur-3xl"
              />
              <div className="relative">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Napíšte nám
                </h2>
                <p className="mt-1.5 text-sm text-zinc-500">
                  Otázka, partnerstvo alebo spätná väzba — radi sa ozveme.
                </p>

                <ContactAdminForm className="mt-7 space-y-4" />
              </div>
            </div>
          </Reveal>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 px-6 py-8 text-center text-xs text-zinc-600">
        DJ App &copy; {new Date().getFullYear()} — Kontakt
      </footer>
    </div>
  );
}
