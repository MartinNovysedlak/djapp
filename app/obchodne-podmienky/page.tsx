import type { Metadata } from "next";
import Link from "next/link";
import { Aurora } from "@/components/motion";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND } from "@/lib/brand";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata("obchodnePodmienky");

const updated = "21. 7. 2026";

export default function ObchodnePodmienkyPage() {
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
          Obchodné podmienky
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Posledná aktualizácia: {updated} · {BRAND.name} ·{" "}
          <a
            href={`mailto:${BRAND.email}`}
            className="text-zinc-400 underline-offset-2 hover:underline"
          >
            {BRAND.email}
          </a>
        </p>

        <article className="mt-10 space-y-8 text-sm leading-relaxed text-zinc-400">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Predmet a pôsobnosť</h2>
            <p>
              Tieto Obchodné podmienky (ďalej len „OP“) upravujú obchodný vzťah
              medzi prevádzkovateľom platformy {BRAND.name} a Používateľom, ktorý
              využíva platené funkcie, Pro plán, generovanie dokumentov,
              fakturačné nástroje alebo iné komerčné služby Platformy.
            </p>
            <p>
              OP dopĺňajú{" "}
              <Link
                href="/podmienky"
                className="text-violet-300 underline-offset-2 hover:underline"
              >
                Podmienky používania
              </Link>
              . V prípade rozporu medzi OP a Podmienkami používania majú pri
              platených / obchodných otázkach prednosť tieto OP.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Zmluvné strany</h2>
            <p>
              <strong className="text-zinc-300">Prevádzkovateľ</strong> —
              poskytovateľ Platformy {BRAND.name}, kontakt: {BRAND.email}.
            </p>
            <p>
              <strong className="text-zinc-300">Zákazník / Umelec</strong> —
              registrovaný Používateľ (fyzická osoba podnikateľ, právnická
              osoba alebo iný oprávnený subjekt), ktorý objednáva platenú
              službu Platformy. Spotrebiteľské práva podľa osobitných predpisov
              ostávajú nedotknuté, ak Zákazník vystupuje ako spotrebiteľ.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">3. Charakter služieb</h2>
            <p>
              Prevádzkovateľ poskytuje softvérovú službu typu SaaS (Software as
              a Service): prístup k funkciám Platformy cez internet. Služba
              zahŕňa podľa zvoleného plánu napr. správu rezervácií, kalendár,
              synchronizáciu, generovanie PDF dokumentov, fakturačné šablóny,
              live nástroje a marketingové funkcie.
            </p>
            <p>
              Prevádzkovateľ neposkytuje vystúpenie umelca, neuzatvára v mene
              umelca zmluvy s jeho klientmi a nie je platobným sprostredkovateľom
              medzi umelcom a jeho klientom, pokiaľ nie je výslovne uvedené inak.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. Objednávka a vznik zmluvy</h2>
            <p>
              Zmluva o poskytovaní platených služieb vzniká potvrdením objednávky
              (aktiváciou Pro / plateného plánu, prijatím ponuky alebo úhradou
              ceny) a sprístupnením príslušných funkcií. Pred uzavretím zmluvy
              sú Zákazníkovi oznámené podstatné parametre: rozsah funkcií, cena,
              fakturačné obdobie a spôsob platby.
            </p>
            <p>
              Elektronická komunikácia (e-mail, dashboard) sa považuje za
              písomnú formu, pokiaľ zákon nevyžaduje prísnejšiu formu.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Cena, fakturácia a DPH</h2>
            <p>
              Ceny sú uvedené v EUR, ak nie je dohodnuté inak. K cene môže byť
              pripočítaná DPH podľa platných predpisov, ak je prevádzkovateľ
              platiteľom DPH.
            </p>
            <p>
              Fakturácia prebieha podľa zvoleného cyklu (napr. mesačne /
              ročne) alebo podľa individuálnej dohody. Zákazník je povinný
              uhradiť faktúru v lehote splatnosti. Pri omeškaní môže
              prevádzkovateľ obmedziť prístup k plateným funkciám a uplatniť
              zákonné úroky z omeškania.
            </p>
            <p>
              Zákazník zodpovedá za správnosť svojich fakturačných údajov
              (meno / obchodné meno, adresa, IČO, DIČ, IČ DPH, IBAN a pod.)
              zadaných v profile.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. Trvanie a výpoveď</h2>
            <p>
              Predplatné sa predlžuje podľa zvoleného cyklu, pokiaľ nie je
              zrušené pred začiatkom ďalšieho obdobia spôsobom uvedeným v
              dashboarde alebo e-mailom. Zákazník môže službu vypovedať ku
              koncu zaplateného obdobia, pokiaľ nie je dohodnuté inak.
            </p>
            <p>
              Prevádzkovateľ môže zmluvu vypovedať alebo okamžite ukončiť pri
              závažnom porušení OP / Podmienok používania, neplatení alebo
              zneužití služby.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">7. Odstúpenie (spotrebiteľ)</h2>
            <p>
              Ak je Zákazník spotrebiteľom a služba bola objednaná na diaľku,
              môže mať právo odstúpiť od zmluvy v zákonnej lehote, pokiaľ
              zákonné výnimky (napr. začatie poskytovania digitálneho obsahu so
              súhlasom spotrebiteľa) neurčujú inak. Podrobnosti poskytneme na
              vyžiadanie pred uzavretím zmluvy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">8. Dokumenty generované Platformou</h2>
            <p>
              Šablóny zmlúv, faktúr a PDF výstupy sú pomocné nástroje.
              Prevádzkovateľ neručí za právnu úplnosť, daňovú správnosť ani
              vhodnosť konkrétneho dokumentu pre daný obchodný prípad.
              Zákazník (umelec) je povinný skontrolovať obsah pred odoslaním
              klientovi a v prípade potreby konzultovať právnika / účtovníka.
            </p>
            <p>
              Za údaje vložené do dokumentov (ceny, osobné údaje klientov,
              obchodné podmienky umelca) zodpovedá výhradne Zákazník.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">9. Kalendár a integrácie tretích strán</h2>
            <p>
              Synchronizácia s Google / Apple kalendárom a inými službami
              závisí od dostupnosti a podmienok týchto poskytovateľov.
              Prevádzkovateľ nezodpovedá za výpadky, zmeny API ani za obsah
              importovaný z externých kalendárov.
            </p>
            <p>
              Zákazník je povinný chrániť tajné ICS odkazy a tokeny; ich
              zverejnenie môže viesť k úniku údajov o termínoch.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">10. SLA a podpora</h2>
            <p>
              Pokiaľ nie je osobitne dohodnutá úroveň služieb (SLA),
              prevádzkovateľ poskytuje podporu primeranú povahe SaaS služby
              bez garancie maximálnej doby odozvy. Hláste výpadky na{" "}
              {BRAND.email}.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">11. Zodpovednosť a náhrada škody</h2>
            <p>
              Prevádzkovateľ zodpovedá za škodu spôsobenú úmyselne alebo
              hrubou nedbalosťou. V ostatných prípadoch je zodpovednosť v
              maximálnom zákonnom rozsahu obmedzená na výšku poplatkov
              zaplatených Zákazníkom za Pro / platenú službu za posledných 12
              mesiacov pred vznikom nároku.
            </p>
            <p>
              Prevádzkovateľ nezodpovedá za ušlý zisk, stratu zákaziek umelca,
              reputačné škody ani za spory medzi umelcom a jeho klientmi.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">12. Mlčanlivosť</h2>
            <p>
              Zmluvné strany zachovávajú mlčanlivosť o dôverných obchodných
              informáciách získaných v súvislosti so spoluprácou, okrem
              prípadov, keď je zverejnenie vyžadované zákonom alebo
              nevyhnutné na poskytnutie služby.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">13. Ochrana údajov a bezpečnosť</h2>
            <p>
              Spracúvanie osobných údajov klientov umelca v rámci dokumentov a
              rezervácií vykonáva umelec vo vlastnej zodpovednosti (spravidla ako
              samostatný prevádzkovateľ alebo v inom zákonnom postavení).
              Platforma poskytuje technické prostriedky; umelec je povinný
              dodržiavať GDPR a informovať svojich klientov.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">14. Zákaz postúpenia a prevod</h2>
            <p>
              Zákazník nesmie bez súhlasu prevádzkovateľa postúpiť práva z
              tejto zmluvy tretej osobe ani poskytnúť platený prístup tretím
              osobám nad rámec bežného používania účtu.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">15. Vyššia moc</h2>
            <p>
              Žiadna zo strán nezodpovedá za nesplnenie povinností spôsobené
              okolnosťami vyššej moci (výpadky infraštruktúry, prírodné
              katastrofy, vojnový stav, kybernetické útoky tretích strán a
              pod.), ak ich nemohla predvídať ani odvrátiť primeranou starostlivosťou.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">16. Rozhodné právo</h2>
            <p>
              Tieto OP sa riadia právom Slovenskej republiky. Spory riešia
              príslušné súdy SR, pokiaľ kogentné normy neurčujú inak.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">17. Záverečné ustanovenia</h2>
            <p>
              Neplatnosť jednotlivého ustanovenia nemá vplyv na platnosť
              ostatných. OP môžu byť aktualizované; aktuálna verzia je
              zverejnená na tejto stránke. Pokračovaním v platenom využívaní
              služby po zmene Zákazník so zmenami súhlasí, ak zákon nevyžaduje
              iný postup.
            </p>
            <p>
              Otázky k OP:{" "}
              <a
                href={`mailto:${BRAND.email}`}
                className="text-violet-300 underline-offset-2 hover:underline"
              >
                {BRAND.email}
              </a>
              .
            </p>
          </section>
        </article>
      </main>
      <SiteFooter caption="Obchodné podmienky" />
    </div>
  );
}
