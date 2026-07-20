"use client";

import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  GripVertical,
  MousePointerClick,
  Save,
  Download,
} from "lucide-react";
import { Reveal } from "@/components/motion";

const STEPS = [
  {
    icon: FileText,
    title: "1. Nahraj Word zmluvu",
    text: "Na stránke Šablóny nahraj akýkoľvek .docx súbor. Nemusí obsahovať premenné — text sa otvorí v editore a formátovanie z Wordu sa zachová čo najviac.",
  },
  {
    icon: GripVertical,
    title: "2. Vlož polia do textu",
    text: "Vpravo uvidíš automatické polia (Meno klienta, Dátum akcie, Umelecké meno…). Pretiahni ich do textu alebo klikni. V dokumente uvidíš ľudský názov — napríklad „Meno klienta“ — systém si však pamätá technický kľúč v pozadí. Cena a záloha sú vždy manuálne — klient si ich dohodne individuálne.",
  },
  {
    icon: MousePointerClick,
    title: "3. Manuálne polia podľa seba",
    text: "Cena a Výška zálohy sú už predpripravené v sekcii Manuálne pridané. Ak potrebuješ ešte niečo vlastné (typ reproduktorov…), napíš názov do „Nové manuálne pole“. Do zmluvy ho vložíš až keď ho pretiahneš.",
  },
  {
    icon: Save,
    title: "4. Ulož šablónu",
    text: "Keď je text a mapovanie hotové, klikni Uložiť šablónu. Nastavenie sa zapamätá — pri ďalšej rezervácii ho nemusíš robiť odznova.",
  },
  {
    icon: Download,
    title: "5. Vygeneruj PDF",
    text: "V PDF zmluvy (záložka Vygenerovať) vyber rezerváciu a šablónu. Automatické údaje sa doplnia sami. Hotové PDF nájdeš v záložke Posledné zmluvy — odtiaľ ho môžeš aj poslať zákazníkovi.",
  },
];

export default function ContractsTutorialPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Reveal>
        <Link
          href="/dashboard/contracts"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-3.5" />
          Späť na šablóny
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Ako fungujú šablóny a PDF
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Krátky návod — od Wordu po hotové PDF. Bez zbytočností.
        </p>
      </Reveal>

      <Reveal delay={80}>
        <ol className="mt-8 space-y-4">
          {STEPS.map((step) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-2xl border border-white/10 bg-card/70 p-5 backdrop-blur-md"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                <step.icon className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">{step.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard/contracts"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-violet-500/30 hover:text-violet-200"
          >
            Prejsť na Šablóny
          </Link>
          <Link
            href="/dashboard/contracts/generate"
            className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-200 transition-colors hover:bg-violet-500/20"
          >
            Generovať PDF
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
