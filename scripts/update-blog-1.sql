-- Enrich blog post 1: wedding cost
UPDATE public.blog_posts SET
  excerpt = 'Orientačný rozpočet svadby na Slovensku 2026 podľa počtu hostí, najväčšie položky, tipy na úsporu a realistický pohľad na obálky.',
  seo_title = 'Koľko stojí svadba na Slovensku 2026 – rozpočet a ceny',
  seo_description = 'Priemerná svadba 8–15 000 €, malá od 3 000 €, veľká nad 13 000 €. Prehľad cien cateringu, priestoru, DJ a tipy, ako ušetriť v roku 2026.',
  cover_url = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80',
  content_html = $html$
<p>Plánovanie svadby začína takmer vždy rovnakou otázkou: <strong>koľko to celé bude stáť</strong>? Na Slovensku v roku 2026 závisí výsledná suma najmä od počtu hostí, lokality (Bratislava vs. zvyšok krajiny), sezóny a úrovne služieb. V tomto článku nájdete realistické rozpätia podľa verejne dostupných svadobných rozpočtov – nie „vymyslené marketingové čísla“, ale orientáciu, s ktorou si viete nastaviť rozpočet.</p>

<p>Dôležité: každá svadba je iná. Páry s 40 hosťami v rodinnom dome môžu zostať pod 7 000 €, zatiaľ čo rovnaký počet ľudí v prémiovom priestore s live kapelou ľahko prekročí 15 000 €. Použite čísla nižšie ako rámec, nie ako fixnú cenu.</p>

<figure><img src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80" alt="Svadobná hostina" /><figcaption>Hostina a catering zvyčajne zjedajú najväčší kus rozpočtu.</figcaption></figure>

<h2>Orientačné ceny podľa veľkosti svadby</h2>
<ul>
<li><strong>Malá svadba (do 30 hostí):</strong> približne 3 000 – 7 000 €</li>
<li><strong>Stredná svadba (40 – 80 hostí):</strong> najčastejšie 8 500 – 14 000 € (typický stred okolo 11–12 000 €)</li>
<li><strong>Veľká svadba (100 – 120 hostí):</strong> približne 12 000 – 20 000 €, luxusné akcie ľahko nad 25–30 000 €</li>
</ul>

<p>Priemerná „tradičná“ svadba so 50–80 hosťami sa často pohybuje v pásme <strong>8 000 – 15 000 €</strong>. Stredne veľká svadba sa v praxi často zmestí do cca 15 000 €, ak nejdete do prémiového segmentu. Na jedného hosťa rátajte orientačne:</p>
<ul>
<li>úsporná úroveň: 90 – 130 €</li>
<li>štandard: 140 – 210 €</li>
<li>prémium: 250 € a viac</li>
</ul>

<h2>Čo zje najväčší kus rozpočtu</h2>
<p>Catering a nápoje zvyčajne tvoria <strong>35–50 %</strong> celkových nákladov. Hostina v roku 2026 vychádza približne na <strong>55–80 € na osobu</strong> (jedlo + nápoje podľa menu). Prenájom priestoru býva ďalších 20–25 % – v praxi často 1 500 – 3 500 € podľa sezóny a lokality. Foto a video často 10–15 %. Zvyšok ide na výzdobu, oblečenie, hudbu, koordináciu, dopravu a drobnosti.</p>

<p>Ak prinášate vlastný alkohol, počítajte s <strong>korkovným</strong> (orientačne 3–8 €/liter). Je to položka, na ktorú páry často zabudnú a potom ich prekvapí pri vyúčtovaní.</p>

<figure><img src="https://images.unsplash.com/photo-1511285560929-80b456142cbb?auto=format&fit=crop&w=1200&q=80" alt="Svadobný stôl" /><figcaption>Počet hostí má na celkovú cenu väčší vplyv než lacnejšia výzdoba.</figcaption></figure>

<h2>Kde sa dá ušetriť bez straty atmosféry</h2>
<ul>
<li><strong>Termín:</strong> piatok alebo mimo sezóny (marec, november) – prenájom a služby môžu byť o 15–25 % lacnejšie než sobota v lete. Rozdiel oproti top sezóne môže byť aj 2–3 000 €.</li>
<li><strong>Počet hostí:</strong> menší zoznam má väčší vplyv na cenu než lacnejšie kvety.</li>
<li><strong>Priority:</strong> rozhodnite sa, čo je „must“ (foto, hudba, jedlo) a čo je „nice to have“.</li>
<li><strong>Obálky:</strong> typicky pokryjú okolo 35–55 % nákladov – nestavajte na to celý rozpočet. Dary od roku 2022 nerástli tak rýchlo ako catering.</li>
</ul>

<h2>Hudba v rozpočte</h2>
<p>Profesionálny DJ na celý večer je obvykle niekoľko stoviek až okolo 1 000–1 500 €; kapela výrazne viac. Pri plánovaní si najprv určte prioritu (atmosféra vs. úspora) a až potom porovnávajte ponuky. Lacný DJ bez techniky môže nakoniec vyjsť drahšie, ak si budete prenajímať ozvučenie zvlášť.</p>

<h2>Praktický postup, ako si nastaviť rozpočet</h2>
<ol>
<li>Napíšte maximálnu sumu, ktorú nechcete prekročiť.</li>
<li>Odpočítajte 10–15 % rezervu.</li>
<li>Odhadnite počet hostí a cenu na osobu.</li>
<li>Rozdeľte zvyšok: priestor, foto/video, hudba, výzdoba, oblečenie.</li>
<li>Až potom oslovujte dodávateľov a porovnávajte ponuky.</li>
</ol>

<p><em>Zdroje: verejné prehľady rozpočtov 2026 (La Reunion, Findorama, Bez Kecov a ďalšie) – ceny sú orientačné a líšia sa podľa regiónu.</em></p>
$html$,
  updated_at = now()
WHERE slug = 'kolko-stoji-svadba-na-slovensku-2026';
