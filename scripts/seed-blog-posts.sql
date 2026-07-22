-- Seed 6 published wedding/DJ blog posts (July 2026)
-- Idempotent: skips if slug already exists

INSERT INTO public.blog_posts (title, slug, excerpt, content_html, status, published_at, created_at, updated_at)
SELECT * FROM (VALUES
(
  'Koľko stojí svadba na Slovensku v roku 2026?',
  'kolko-stoji-svadba-na-slovensku-2026',
  'Orientačný rozpočet podľa počtu hostí: od malej svadby do 7 000 € až po veľké hostiny nad 20 000 €. Prehľad najväčších položiek a tipy, ako plánovať realisticky.',
  $html1$
<p>Plánovanie svadby začína jednou otázkou: <strong>koľko to celé bude stáť</strong>? Na Slovensku v roku 2026 závisí výsledná suma najmä od počtu hostí, lokality a úrovne služieb. Nižšie nájdete reálne rozpätia podľa verejne dostupných svadobných rozpočtov.</p>

<h2>Orientačné ceny podľa veľkosti svadby</h2>
<ul>
<li><strong>Malá svadba (do 30 hostí):</strong> približne 3 000 – 7 000 €</li>
<li><strong>Stredná svadba (40 – 80 hostí):</strong> najčastejšie 8 500 – 14 000 € (typický stred okolo 11–12 000 €)</li>
<li><strong>Veľká svadba (100 – 120 hostí):</strong> približne 12 000 – 20 000 €, luxusné akcie ľahko nad 25–30 000 €</li>
</ul>
<p>Priemerná „tradičná“ svadba so 50–80 hosťami sa často pohybuje v pásme <strong>8 000 – 15 000 €</strong>. Na jedného hosťa rátajte orientačne 140 – 210 € pri štandardnej úrovni; úspornejšie varianty okolo 90 – 130 €, prémiové 250 € a viac.</p>

<h2>Čo zje najväčší kus rozpočtu</h2>
<p>Catering a nápoje zvyčajne tvoria <strong>35–50 %</strong> celkových nákladov. Hostina v roku 2026 vychádza približne na <strong>55–80 € na osobu</strong> (jedlo + nápoje podľa menu). Prenájom priestoru býva ďalších 20–25 %. Foto a video často 10–15 %. Zvyšok ide na výzdobu, oblečenie, hudbu, koordináciu a drobnosti.</p>

<h2>Kde sa dá ušetriť bez straty atmosféry</h2>
<ul>
<li>Piatok alebo mimo sezóny (marec, november) – prenájom a služby môžu byť o 15–25 % lacnejšie než sobota v lete.</li>
<li>Menší počet hostí má väčší vplyv na cenu než lacnejšia výzdoba.</li>
<li>Obálky od hostí typicky pokryjú okolo 35–55 % nákladov – nestavajte na to celý rozpočet.</li>
</ul>

<h2>Hudba v rozpočte</h2>
<p>Profesionálny DJ na celý večer je obvykle niekoľko stoviek až okolo tisíc eur; kapela výrazne viac. Pri plánovaní si najprv určte prioritu (atmosféra vs. úspora) a až potom porovnávajte ponuky.</p>

<p><em>Zdroje: verejné prehľady rozpočtov 2026 (napr. La Reunion, Findorama, Bez Kecov) – ceny sú orientačné a líšia sa podľa regiónu.</em></p>
$html1$,
  'published',
  '2026-07-03T09:00:00+02:00'::timestamptz,
  '2026-07-03T09:00:00+02:00'::timestamptz,
  '2026-07-03T09:00:00+02:00'::timestamptz
),
(
  'Ako vybrať DJ-a na svadbu: kontrolný zoznam',
  'ako-vybrat-dj-a-na-svadbu',
  'Na čo sa pýtať pred rezerváciou, čo musí byť v zmluve a ako spoznáte profesionála, ktorý zvládne aj starších hostí aj nočnú párty.',
  $html2$
<p>Dobrý svadobný DJ nie je len „ten, čo púšťa pesničky“. Je to človek, ktorý drží tempo večera, vie čítať parket a zvláda prechody medzi ceremoniálom, večerou a tanečnou párty.</p>

<h2>1. Skúsenosti so svadbami, nie len s klubmi</h2>
<p>Opýtajte sa, koľko svadieb robil za posledný rok a či vie moderovať (príchod snúbencov, prvý tanec, súťaže). Klubový set a svadobný večer sú iný žáner.</p>

<h2>2. Referencie a ukážky</h2>
<p>Požiadajte o krátke video z reálnej svadby, playlist ukážku a kontakty na páry. Overení DJ-i na platformách (vrátane BookTheVibe) majú verejný profil, fotky a recenzie.</p>

<h2>3. Technika v cene</h2>
<ul>
<li>Ozvučenie vhodné pre veľkosť sály</li>
<li>Základné svetlá / ambient</li>
<li>Mikrofón na príhovory</li>
<li>Záloha (spare) pri kritických zariadeniach</li>
</ul>
<p>Vždy si overte, či je technika v cene, alebo sa pripočítava zvlášť – a kto rieši prúd, káble a miesto na setup.</p>

<h2>4. Komunikácia pred svadbou</h2>
<p>Profík si vypýta: must-play / do-not-play zoznam, časový harmonogram, vekové zloženie hostí a či bude kapela alebo spev pred DJ setom. Ak nereaguje na správy do pár dní, hľadajte inde.</p>

<h2>5. Zmluva a záloha</h2>
<p>V zmluve majte dátum, miesto, čas hrania, čo je v cene, cestovné, storno podmienky a či DJ môže hrať do rána. Záloha je bežná – trvajte na písomnom potvrdení termínu.</p>

<h2>6. Osobné stretnutie (aspoň online)</h2>
<p>Chémia je dôležitá. DJ bude s vami celý večer – má pôsobiť pokojne, flexibilne a profesionálne, nie tlačiť „svoj“ štýl za každú cenu.</p>

<p>Tip: rezervujte DJ-a skôr než catering – dobrí ľudia majú soboty plné aj 6–12 mesiacov dopredu.</p>
$html2$,
  'published',
  '2026-07-07T10:30:00+02:00'::timestamptz,
  '2026-07-07T10:30:00+02:00'::timestamptz,
  '2026-07-07T10:30:00+02:00'::timestamptz
),
(
  '10 tipov, čo nesmie chýbať na svadbe',
  '10-tipov-co-nesmie-chybat-na-svadbe',
  'Od realistického rozpočtu cez časový harmonogram až po hudbu a plán B pri daždi – praktický checklist pre páry, ktoré chcú pokojný svadobný deň.',
  $html3$
<p>Svadba má stovky detailov. Týchto desať bodov však rozhoduje o tom, či večer pôjde hladko – alebo budete hasiť problémy namiesto tanca.</p>

<h2>1. Realistický rozpočet s rezervou</h2>
<p>Pridajte 10–15 % rezervu na nečakané (korkovné, doprava, neskôr objednané detaily). Bez rezervy každý „malý“ výdavok bolí.</p>

<h2>2. Časový harmonogram dňa</h2>
<p>Napíšte si timeline: príprava, obrad, fotenie, príchod, večera, prvý tanec, torta, voľná zábava. Pošlite ho DJ-ovi, fotografovi aj miestu konania.</p>

<h2>3. Zodpovedná osoba (nie snúbenci)</h2>
<p>Určte koordinátora alebo blízkeho, kto rieši dodávateľov počas dňa. Vy máte oslavovať, nie telefonovať catering.</p>

<h2>4. Zoznam hostí a seating</h2>
<p>Finálny počet hostí ovplyvní catering, tortu aj priestor. Seating chart ušetrí chaos pri večeri.</p>

<h2>5. Foto a video s briefom</h2>
<p>Napíšte must-have momenty (prvý tanec, rodičia, kľúčoví hostia). Bez briefu sa ľahko stane, že chýba práve tá fotka, na ktorej vám záleží.</p>

<h2>6. Hudba s must / don’t play listom</h2>
<p>Dajte DJ-ovi 10–20 skladieb, ktoré chcete, a zoznam, ktorý nechcete. Nechajte mu priestor reagovať na parket.</p>

<h2>7. Technika a ozvučenie na príhovory</h2>
<p>Mikrofón a fungujúci zvuk pri príhovoroch sú základ. Overte to pri obhliadke sály.</p>

<h2>8. Plán B pri počasí</h2>
<p>Pri outdoor obrade majte záložný priestor alebo stan. Rozhodnite sa vopred, kto rozhoduje o zmene (nečakajte do poslednej minúty).</p>

<h2>9. Jedlo a alergény</h2>
<p>Opýtajte sa hostí na alergie a vegetariánske / bezlepkové menu. Catering to potrebuje včas.</p>

<h2>10. Čas pre seba</h2>
<p>Vložte do harmonogramu 10–15 minút len pre vás dvoch. Svadba ubehne rýchlo – tieto minúty si zapamätáte.</p>
$html3$,
  'published',
  '2026-07-10T11:00:00+02:00'::timestamptz,
  '2026-07-10T11:00:00+02:00'::timestamptz,
  '2026-07-10T11:00:00+02:00'::timestamptz
),
(
  'DJ alebo kapela na svadbu? Porovnanie pre slovenské svadby',
  'dj-alebo-kapela-na-svadbu',
  'Ceny, repertoár, priestorové nároky a kedy sa oplatí kombinácia kapely a DJ-a. Rozhodovací sprievodca podľa rozpočtu.',
  $html4$
<p>Hudba je atmosféra svadby. Voľba medzi DJ-om a kapelou ovplyvní rozpočet, parket aj logistiku sály.</p>

<h2>Orientačné ceny na Slovensku</h2>
<ul>
<li><strong>DJ (4–6 hod.):</strong> začínajúci cca 200–400 €, skúsený 400–900 €, prémiový s vlastnou technikou a MC často 800–1 500 €</li>
<li><strong>Kapela:</strong> duo/trio cca 500–1 200 €, 4–6 členov typicky 1 200–2 500 €, väčšie zoskupenia 2 000–4 000 €</li>
</ul>
<p>Solídny DJ na celý večer teda často vyjde na <strong>400–900 €</strong>, kvalitná kapela zhruba na dvoj- až trojnásobok.</p>

<h2>Čo vyhráva DJ</h2>
<ul>
<li>Takmer neobmedzený repertoár a rýchla zmena štýlu</li>
<li>Menšie nároky na priestor (1–2 m² vs. 15–30 m² pri kapele)</li>
<li>Nižšia cena a jednoduchšia logistika</li>
<li>Lepšia kontinuita nočnej párty</li>
</ul>

<h2>Čo vyhráva kapela</h2>
<ul>
<li>Živá energia a emócia, ktorú ťažko nahradí playlist</li>
<li>Silný dojem počas hostiny a prvých tancov</li>
<li>„Show“ efekt pre hostí, ktorí chcú živý koncert</li>
</ul>

<h2>Najobľúbenejší kompromis</h2>
<p>Mnoho párov volí <strong>kapelu na časť večera</strong> (2–3 sety) a <strong>DJ-a od neskorej noci</strong>. Koktail môže pokryť akustické duo, hostinu kapela a párty DJ. Táto kombinácia býva drahšia (orientačne 2 500–5 000 € podľa úrovne), ale pokryje celý deň.</p>

<h2>Rýchle rozhodnutie</h2>
<ul>
<li>Rozpočet pod cca 700 € → skôr DJ</li>
<li>Rozpočet nad cca 1 500 € a túžba po živom zvuku → kapela je reálna</li>
<li>Chcete maximum flexibility na parkete → DJ alebo hybrid</li>
</ul>

<p><em>Cenové rozpätia vychádzajú z verejných prehľadov slovenských eventových a svadobných ponúk (2025/2026).</em></p>
$html4$,
  'published',
  '2026-07-14T09:15:00+02:00'::timestamptz,
  '2026-07-14T09:15:00+02:00'::timestamptz,
  '2026-07-14T09:15:00+02:00'::timestamptz
),
(
  'Koľko stojí svadobný DJ na Slovensku?',
  'kolko-stoji-svadobny-dj',
  'Reálne cenové pásma 2026: od začínajúcich DJ-ov po prémiové balíky s technikou a moderovaním. Čo ovplyvňuje cenu a na čo si dať pozor.',
  $html5$
<p>Hudba na svadbe býva jedna z položiek, kde sa oplatí nešetriť „naslepo“ – ale ani neplatiť prémiu bez jasného obsahu balíka. Tu je prehľad cien, ktoré sa na Slovensku v roku 2026 najčastejšie objavujú.</p>

<h2>Cenové pásma</h2>
<ul>
<li><strong>Začínajúci DJ:</strong> približne 200 – 400 €</li>
<li><strong>Skúsený svadobný DJ:</strong> približne 400 – 900 €</li>
<li><strong>Prémiový DJ (vlastná technika, svetlá, MC):</strong> približne 800 – 1 500 €</li>
</ul>
<p>V niektorých regiónoch (napr. Trenčiansky kraj) sa za komplet večer často uvádza pásmo okolo <strong>450 – 650 €</strong> pri skúsenom DJ-ovi. Skúsení DJ-i / „starejší“ s kompletným programom môžu ísť aj na <strong>800 – 1 500 €</strong>.</p>

<h2>Čo cenu zvyšuje</h2>
<ul>
<li>Dĺžka hrania (do polnoci vs. do rána)</li>
<li>Veľkosť sály a potrebný výkon ozvučenia</li>
<li>Svetelná show, dym, extra efekty</li>
<li>Moderovanie celého programu</li>
<li>Cestovné (bežne cca 0,15 – 0,50 €/km) a ubytovanie pri dlhšej trase</li>
</ul>

<h2>Čo by malo byť v ponuke jasné</h2>
<p>Pýtajte sa: je v cene ozvučenie a mikrofón? Koľko hodín hrania? Čo stojí každá ďalšia hodina? Je DPH v cene? (Od roku 2025 je základná sadzba DPH 23 % – overte, či je DJ plátca.)</p>

<h2>Ako plánovať rozpočet na program</h2>
<p>Na bežnú svadbu rátajte s DJ-om v pásme stoviek až cca 1 500 €. Ak pridávate fotografa a prípadne moderátora, celkový „programový“ balík môže ísť od približne 500 € do 2 500 € podľa úrovne.</p>

<p>Na BookTheVibe porovnajte profil, overenie, galériu a dostupnosť termínu – a až potom rozhodujte podľa ceny.</p>
$html5$,
  'published',
  '2026-07-17T14:00:00+02:00'::timestamptz,
  '2026-07-17T14:00:00+02:00'::timestamptz,
  '2026-07-17T14:00:00+02:00'::timestamptz
),
(
  'Ako zostaviť svadobný playlist, ktorý naozaj funguje',
  'ako-zostavit-svadobny-playlist',
  'Od prvého tanca po nočný peak: ako pripraviť must-play zoznam, vyhnúť sa prázdnemu parketu a dať DJ-ovi priestor čítať hostí.',
  $html6$
<p>Najlepší svadobný playlist nie je 200 skladieb „všetko čo máme radi“. Je to štruktúra večera + pár pevných momentov + dôvera v DJ-a.</p>

<h2>Rozdeľte večer na bloky</h2>
<ol>
<li><strong>Príchod / welcome drink</strong> – jemnejšie, ambient, jazz, acoustic pop</li>
<li><strong>Večera</strong> – tichší background, hlasitosť nesmie prebíjať rozhovory</li>
<li><strong>Prvý tanec a rodinné tance</strong> – vopred dohodnuté skladby</li>
<li><strong>Otvorenie parkietu</strong> – známe, tanečné hity naprieč generáciami</li>
<li><strong>Peak night</strong> – energickejšie, aktuálne aj evergreeny</li>
<li><strong>Záver</strong> – pomalšie, emotívne, „last dance“</li>
</ol>

<h2>Must-play a do-not-play</h2>
<p>Pripravte:</p>
<ul>
<li>10–15 skladieb, ktoré <strong>musia</strong> zaznieť</li>
<li>zoznam, ktorý <strong>nechcete</strong> (ex partner songs, meme tracky, príliš agresívny žáner)</li>
<li>špeciálne momenty: torta, súťaž, odchod</li>
</ul>
<p>Viac než 40 „povinných“ skladieb viaže DJ-ovi ruky a parkiet často zomrie.</p>

<h2>Myslite na vek hostí</h2>
<p>Ak sú na svadbe rodičia aj 20-roční kamaráti, striedajte éry. Klasika 80s/90s/00s často naplní parket rýchlejšie než len aktuálny TikTok hit.</p>

<h2>Prvý tanec: praktické tipy</h2>
<ul>
<li>Vyberte skladbu, v ktorej sa cítite prirodzene (nie čo „má byť“)</li>
<li>Skúste si tanec aspoň raz nanečisto</li>
<li>Dajte DJ-ovi čistú verziu / timestamp, ak chcete skrátiť intro</li>
</ul>

<h2>Nechajte priestor improvizácii</h2>
<p>DJ vidí, čo funguje naživo. Ak pevným zoznamom „zamknete“ celý večer, prídete o momenty, keď hostia začnú tancovať na niečo neočakávané.</p>

<p>Najlepší výsledok: jasný brief + flexibilný profesionál. Presne to hľadajte pri výbere DJ-a.</p>
$html6$,
  'published',
  '2026-07-20T16:45:00+02:00'::timestamptz,
  '2026-07-20T16:45:00+02:00'::timestamptz,
  '2026-07-20T16:45:00+02:00'::timestamptz
)
) AS v(title, slug, excerpt, content_html, status, published_at, created_at, updated_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts bp WHERE bp.slug = v.slug
);
