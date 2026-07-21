import type { Metadata } from "next";
import Link from "next/link";
import { Aurora } from "@/components/motion";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Podmienky používania",
  description: `Všeobecné podmienky používania platformy ${BRAND.name} — práva a povinnosti používateľov, rezervácie, obsah a zodpovednosť.`,
  alternates: { canonical: "/podmienky" },
};

const updated = "21. 7. 2026";

export default function PodmienkyPage() {
  return (
    <div className="relative flex min-h-svh flex-col bg-[#0A0A0A]">
      <Aurora subtle />
      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-6 pb-16 pt-10 md:pt-14">
        <Link href="/" className="mb-8 inline-flex">
          <BrandLogo size="lg" />
        </Link>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-400">
          Právne dokumenty
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
          Podmienky používania
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Posledná aktualizácia: {updated} · Prevádzkovateľ: {BRAND.name} (
          <a
            href={`mailto:${BRAND.email}`}
            className="text-zinc-400 underline-offset-2 hover:underline"
          >
            {BRAND.email}
          </a>
          )
        </p>

        <article className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-zinc-400">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Úvodné ustanovenia</h2>
            <p>
              Tieto Podmienky používania (ďalej len „Podmienky“) upravujú práva a
              povinnosti medzi prevádzkovateľom webovej platformy {BRAND.name}{" "}
              dostupnej na doméne bookthevibe.com a súvisiacich subdoménach
              (ďalej len „Platforma“) a každou fyzickou alebo právnickou osobou,
              ktorá Platformu používa (ďalej len „Používateľ“).
            </p>
            <p>
              Registráciou, prihlásením alebo iným používaním Platformy
              Používateľ potvrdzuje, že si Podmienky prečítal, porozumel im a
              súhlasí s nimi v plnom rozsahu. Ak s Podmienkami nesúhlasí, nie je
              oprávnený Platformu používať.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Popis služby</h2>
            <p>
              {BRAND.name} je online platforma, ktorá spája klientov (osoby
              hľadajúce hudobné / eventové služby) s umelcami (DJ, kapela alebo
              DJ + Kapela). Platforma umožňuje najmä:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>vytvorenie a správu používateľských účtov (umelec / klient),</li>
              <li>zverejnenie verejného profilu umelca v katalógu,</li>
              <li>odosielanie a správu nezáväzných dopytov / rezervácií,</li>
              <li>kalendár, blokácie a synchronizáciu s externými kalendármi,</li>
              <li>nástroje na dokumenty (zmluvy, faktúry), playlist, live requesty a súvisiacu komunikáciu,</li>
              <li>marketingové funkcie (napr. žiadosť o recenziu po akcii).</li>
            </ul>
            <p>
              Platforma vystupuje ako technický sprostredkovateľ. Pokiaľ nie je
              výslovne uvedené inak, {BRAND.name} nie je zmluvnou stranou medzi
              klientom a umelcom ohľadom samotného vystúpenia, ceny služby ani
              jej plnenia.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">3. Registrácia a účet</h2>
            <p>
              Na využívanie niektorých funkcií je potrebná registrácia. Používateľ
              je povinný uviesť pravdivé, aktuálne a úplné údaje a tieto
              priebežne aktualizovať. Za bezpečnosť prihlasovacích údajov
              zodpovedá Používateľ.
            </p>
            <p>
              Zakazuje sa vytváranie účtov v mene inej osoby bez oprávnenia,
              zdieľanie účtu, automatizované skripty bez súhlasu prevádzkovateľa
              a akékoľvek konanie smerujúce k obchádzaniu bezpečnostných
              mechanizmov Platformy.
            </p>
            <p>
              Prevádzkovateľ môže účet dočasne obmedziť alebo zrušiť pri
              porušení Podmienok, podozrení z podvodu, zneužitia alebo pri
              požiadavke vyplývajúcej z právnych predpisov.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. Role: Umelec a klient</h2>
            <p>
              <strong className="text-zinc-300">Umelec</strong> (DJ, kapela
              alebo DJ + Kapela) môže zverejniť profil, prijímať dopyty,
              spravovať kalendár a používať nástroje dashboardu podľa zvoleného
              plánu (Free / Pro). Umelec je výhradne zodpovedný za obsah svojho
              profilu, dostupnosť, cenu, kvalitu služby a plnenie dohôd s
              klientom.
            </p>
            <p>
              <strong className="text-zinc-300">Klient</strong> môže prehliadať
              katalóg, odosielať dopyty a spravovať svoje rezervácie a
              dokumenty. Klient je zodpovedný za správnosť údajov v dopyte
              (dátum, čas, miesto, kontakt) a za plnenie dohôd uzavretých s
              umelcom.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Rezervácie a komunikácia</h2>
            <p>
              Dopyt odoslaný cez Platformu je spravidla nezáväzný návrh na
              dohodu, pokiaľ umelec a klient výslovne nedohodnú inak (napr.
              prijatím rezervácie a následnou zmluvou). Potvrdenie, zmena alebo
              zrušenie termínu je vecou dohody medzi umelcom a klientom.
            </p>
            <p>
              Platforma môže zobrazovať obsadenosť na základe údajov zadaných
              umelcom a/alebo importovaných z externého kalendára. Prevádzkovateľ
              neručí za úplnosť, aktuálnosť ani bezchybnosť týchto údajov.
            </p>
            <p>
              Zakazuje sa spam, urážlivá komunikácia, podvodné dopyty a
              zneužívanie kontaktných údajov získaných cez Platformu na iné
              účely, než je dojednanie eventovej spolupráce.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. Plány, platby a Pro funkcie</h2>
            <p>
              Niektoré funkcie môžu byť dostupné len v rámci plateného plánu
              (Pro) alebo inej dohody. Ceny, rozsah a podmienky platených
              služieb upravujú{" "}
              <Link
                href="/obchodne-podmienky"
                className="text-violet-300 underline-offset-2 hover:underline"
              >
                Obchodné podmienky
              </Link>
              , prípadne osobitná zmluva.
            </p>
            <p>
              Free plán môže byť kedykoľvek upravený; o zásadných zmenách
              informujeme primeraným spôsobom.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">7. Obsah Používateľa</h2>
            <p>
              Používateľ si ponecháva práva k obsahu, ktorý nahrá (texty,
              fotografie, videá, dokumenty, playlisty a pod.). Nahratím obsahu
              udeľuje prevádzkovateľovi nevýhradnú, bezodplatnú licenciu na
              hostovanie, zobrazovanie a technické spracovanie tohto obsahu v
              rozsahu potrebnom na prevádzku Platformy.
            </p>
            <p>
              Používateľ vyhlasuje, že má všetky potrebné práva k nahrávanému
              obsahu a že obsah neporušuje práva tretích osôb, právne predpisy
              ani dobré mravy. Prevádzkovateľ môže obsah odstrániť pri
              porušení týchto pravidiel.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">8. Duševné vlastníctvo Platformy</h2>
            <p>
              Softvér, dizajn, ochranné známky, logá a databázy Platformy sú
              majetkom prevádzkovateľa alebo jeho licenčných partnerov.
              Používateľ nesmie Platformu kopírovať, spätne analyzovať,
              prenajímať ani používať na vytvorenie konkurenčnej služby bez
              písomného súhlasu.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">9. Dostupnosť a zmeny služby</h2>
            <p>
              Prevádzkovateľ sa snaží o stabilnú dostupnosť Platformy, no
              nezaručuje nepretržitú, bezchybnú ani neprerušovanú prevádzku.
              Môžu nastať odstávky z dôvodu údržby, aktualizácií, výpadkov
              tretích strán (hosting, e-mail, platby, kalendáre) alebo vyššej
              moci.
            </p>
            <p>
              Funkcie Platformy sa môžu meniť, dopĺňať alebo ukončovať.
              Prevádzkovateľ nie je povinný udržiavať konkrétnu funkciu
              natrvalo.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">10. Obmedzenie zodpovednosti</h2>
            <p>
              V maximálnom rozsahu dovolenom právom prevádzkovateľ nezodpovedá
              za:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>škody vzniknuté zo vzťahu medzi umelcom a klientom (neuskutočnenie akcie, oneskorenie, kvalita vystúpenia, platby medzi stranami),</li>
              <li>nepriame, následné alebo ušlé zisky,</li>
              <li>stratu dát spôsobenú konaním Používateľa alebo tretích strán,</li>
              <li>obsah profilov, recenzií a dokumentov vytvorených Používateľmi.</li>
            </ul>
            <p>
              Ak by bola zodpovednosť prevádzkovateľa napriek tomu založená,
              je v zákonnom rámci obmedzená na preukázateľnú priamu škodu a
              primeranú výšku súvisiacu s používaním Platformy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">11. Ochrana osobných údajov</h2>
            <p>
              Spracúvanie osobných údajov sa riadi platnými predpismi EÚ/SR
              (najmä GDPR) a informáciami poskytnutými pri používaní Platformy.
              Prevádzkovateľ spracúva údaje v rozsahu potrebnom na poskytnutie
              služby, komunikáciu, bezpečnosť a plnenie zákonných povinností.
              Otázky k údajom zasielajte na {BRAND.email}.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">12. Zakázané konanie</h2>
            <p>Používateľ sa najmä zaväzuje:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>nezasahovať do chodu Platformy (útoky, scraping nad rámec bežného používania, zneužitie API),</li>
              <li>nešíriť malware, phishing ani klamlivý obsah,</li>
              <li>nepoužívať Platformu na nezákonnú činnosť,</li>
              <li>neobchádzať limity plánov ani technické obmedzenia,</li>
              <li>nereplikovať katalóg ani kontaktné údaje na komerčné spam účely.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">13. Ukončenie používania</h2>
            <p>
              Používateľ môže kedykoľvek prestať Platformu používať a požiadať
              o zrušenie účtu. Prevádzkovateľ môže účet zrušiť alebo obmedziť
              pri porušení Podmienok. Po ukončení môžu byť niektoré údaje
              uchované v rozsahu vyžadovanom zákonom (napr. fakturačné záznamy).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">14. Zmeny Podmienok</h2>
            <p>
              Prevádzkovateľ môže Podmienky aktualizovať. Aktuálna verzia je
              vždy zverejnená na tejto stránke s dátumom aktualizácie. Pokračovaním
              v používaní Platformy po zmene Používateľ so zmenami súhlasí,
              pokiaľ zákon nevyžaduje iný postup.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">15. Rozhodné právo a spory</h2>
            <p>
              Tieto Podmienky sa riadia právnym poriadkom Slovenskej republiky.
              Spory sa prednostne riešia dohodou. Ak k dohode nedôjde,
              príslušné sú súdy SR, pokiaľ kogentné normy na ochranu spotrebiteľa
              neurčujú inak.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">16. Kontakt</h2>
            <p>
              V otázkach týchto Podmienok nás kontaktujte na{" "}
              <a
                href={`mailto:${BRAND.email}`}
                className="text-violet-300 underline-offset-2 hover:underline"
              >
                {BRAND.email}
              </a>{" "}
              alebo cez stránku{" "}
              <Link
                href="/kontakt"
                className="text-violet-300 underline-offset-2 hover:underline"
              >
                Kontakt
              </Link>
              .
            </p>
          </section>
        </article>
      </main>
      <SiteFooter caption="Podmienky používania" />
    </div>
  );
}
