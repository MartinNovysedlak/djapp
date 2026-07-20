// Curated list of Slovak and Czech cities/towns, grouped by region (kraj),
// used to force a real city selection instead of free-text typing.
// Covers every region of both countries with all major towns.

export type Country = "SK" | "CZ";

export type CityOption = {
  name: string;
  region: string;
  country: Country;
};

export const COUNTRIES: { code: Country; label: string }[] = [
  { code: "SK", label: "Slovensko" },
  { code: "CZ", label: "Česko" },
];

export function countryLabel(code: Country): string {
  return COUNTRIES.find((c) => c.code === code)?.label ?? code;
}

// ── Slovakia — grouped by kraj ────────────────────────────────────────────────
const SK_REGIONS: Record<string, string[]> = {
  "Bratislavský kraj": [
    "Bratislava",
    "Malacky",
    "Modra",
    "Pezinok",
    "Senec",
    "Stupava",
    "Svätý Jur",
  ],
  "Trnavský kraj": [
    "Trnava",
    "Dunajská Streda",
    "Galanta",
    "Gbely",
    "Hlohovec",
    "Holíč",
    "Leopoldov",
    "Piešťany",
    "Senica",
    "Sereď",
    "Skalica",
    "Šamorín",
    "Vrbové",
  ],
  "Trenčiansky kraj": [
    "Trenčín",
    "Bánovce nad Bebravou",
    "Bojnice",
    "Brezová pod Bradlom",
    "Dubnica nad Váhom",
    "Handlová",
    "Ilava",
    "Myjava",
    "Nováky",
    "Nové Mesto nad Váhom",
    "Partizánske",
    "Považská Bystrica",
    "Prievidza",
    "Púchov",
    "Stará Turá",
    "Trenčianske Teplice",
  ],
  "Nitriansky kraj": [
    "Nitra",
    "Hurbanovo",
    "Kolárovo",
    "Komárno",
    "Levice",
    "Nové Zámky",
    "Šahy",
    "Šaľa",
    "Štúrovo",
    "Tlmače",
    "Topoľčany",
    "Vráble",
    "Zlaté Moravce",
    "Želiezovce",
  ],
  "Žilinský kraj": [
    "Žilina",
    "Bytča",
    "Čadca",
    "Dolný Kubín",
    "Kysucké Nové Mesto",
    "Krásno nad Kysucou",
    "Liptovský Hrádok",
    "Liptovský Mikuláš",
    "Martin",
    "Námestovo",
    "Rajec",
    "Ružomberok",
    "Turčianske Teplice",
    "Turzovka",
    "Tvrdošín",
    "Vrútky",
  ],
  "Banskobystrický kraj": [
    "Banská Bystrica",
    "Banská Štiavnica",
    "Brezno",
    "Detva",
    "Fiľakovo",
    "Hnúšťa",
    "Kremnica",
    "Krupina",
    "Lučenec",
    "Modrý Kameň",
    "Nová Baňa",
    "Poltár",
    "Revúca",
    "Rimavská Sobota",
    "Sliač",
    "Tisovec",
    "Veľký Krtíš",
    "Zvolen",
    "Žarnovica",
    "Žiar nad Hronom",
  ],
  "Prešovský kraj": [
    "Prešov",
    "Bardejov",
    "Giraltovce",
    "Humenné",
    "Kežmarok",
    "Levoča",
    "Medzilaborce",
    "Poprad",
    "Sabinov",
    "Snina",
    "Spišská Belá",
    "Spišská Stará Ves",
    "Spišské Podhradie",
    "Stará Ľubovňa",
    "Stropkov",
    "Svidník",
    "Vranov nad Topľou",
    "Vysoké Tatry",
  ],
  "Košický kraj": [
    "Košice",
    "Čierna nad Tisou",
    "Dobšiná",
    "Gelnica",
    "Krompachy",
    "Medzev",
    "Michalovce",
    "Moldava nad Bodvou",
    "Rožňava",
    "Sečovce",
    "Sobrance",
    "Spišská Nová Ves",
    "Strážske",
    "Trebišov",
  ],
};

// ── Czech Republic — grouped by kraj ──────────────────────────────────────────
const CZ_REGIONS: Record<string, string[]> = {
  "Hlavní město Praha": ["Praha"],
  "Středočeský kraj": [
    "Beroun",
    "Benešov",
    "Brandýs nad Labem-Stará Boleslav",
    "Čáslav",
    "Černošice",
    "Český Brod",
    "Dobříš",
    "Hostivice",
    "Kladno",
    "Kolín",
    "Kutná Hora",
    "Lysá nad Labem",
    "Mělník",
    "Mladá Boleslav",
    "Mnichovo Hradiště",
    "Neratovice",
    "Nymburk",
    "Poděbrady",
    "Příbram",
    "Rakovník",
    "Říčany",
    "Sedlčany",
    "Slaný",
    "Vlašim",
    "Votice",
  ],
  "Jihočeský kraj": [
    "České Budějovice",
    "Blatná",
    "Český Krumlov",
    "Jindřichův Hradec",
    "Milevsko",
    "Písek",
    "Prachatice",
    "Sezimovo Ústí",
    "Soběslav",
    "Strakonice",
    "Tábor",
    "Trhové Sviny",
    "Třeboň",
    "Vodňany",
  ],
  "Plzeňský kraj": [
    "Plzeň",
    "Domažlice",
    "Horšovský Týn",
    "Klatovy",
    "Nýřany",
    "Přeštice",
    "Přimda",
    "Rokycany",
    "Stod",
    "Stříbro",
    "Sušice",
    "Tachov",
  ],
  "Karlovarský kraj": [
    "Karlovy Vary",
    "Aš",
    "Cheb",
    "Chodov",
    "Horní Slavkov",
    "Kraslice",
    "Mariánské Lázně",
    "Nejdek",
    "Ostrov",
    "Sokolov",
  ],
  "Ústecký kraj": [
    "Ústí nad Labem",
    "Bílina",
    "Chomutov",
    "Děčín",
    "Kadaň",
    "Klášterec nad Ohří",
    "Litoměřice",
    "Litvínov",
    "Louny",
    "Most",
    "Podbořany",
    "Roudnice nad Labem",
    "Rumburk",
    "Teplice",
    "Varnsdorf",
    "Žatec",
  ],
  "Liberecký kraj": [
    "Liberec",
    "Česká Lípa",
    "Doksy",
    "Frýdlant",
    "Jablonec nad Nisou",
    "Nový Bor",
    "Semily",
    "Tanvald",
    "Turnov",
    "Železný Brod",
  ],
  "Královéhradecký kraj": [
    "Hradec Králové",
    "Broumov",
    "Česká Skalice",
    "Dvůr Králové nad Labem",
    "Hořice",
    "Jičín",
    "Kostelec nad Orlicí",
    "Náchod",
    "Nová Paka",
    "Nový Bydžov",
    "Rychnov nad Kněžnou",
    "Trutnov",
    "Vrchlabí",
  ],
  "Pardubický kraj": [
    "Pardubice",
    "Česká Třebová",
    "Chrudim",
    "Hlinsko",
    "Holice",
    "Litomyšl",
    "Moravská Třebová",
    "Polička",
    "Přelouč",
    "Skuteč",
    "Svitavy",
    "Ústí nad Orlicí",
    "Vysoké Mýto",
  ],
  "Kraj Vysočina": [
    "Jihlava",
    "Bystřice nad Pernštejnem",
    "Havlíčkův Brod",
    "Chotěboř",
    "Humpolec",
    "Moravské Budějovice",
    "Náměšť nad Oslavou",
    "Pelhřimov",
    "Světlá nad Sázavou",
    "Třebíč",
    "Velké Meziříčí",
    "Žďár nad Sázavou",
  ],
  "Jihomoravský kraj": [
    "Brno",
    "Blansko",
    "Břeclav",
    "Bučovice",
    "Hodonín",
    "Ivančice",
    "Kyjov",
    "Mikulov",
    "Rosice",
    "Rousínov",
    "Slavkov u Brna",
    "Šlapanice",
    "Tišnov",
    "Veselí nad Moravou",
    "Vyškov",
    "Znojmo",
  ],
  "Olomoucký kraj": [
    "Olomouc",
    "Hranice",
    "Jeseník",
    "Konice",
    "Lipník nad Bečvou",
    "Litovel",
    "Prostějov",
    "Přerov",
    "Šumperk",
    "Uničov",
    "Zábřeh",
  ],
  "Zlínský kraj": [
    "Zlín",
    "Bystřice pod Hostýnem",
    "Holešov",
    "Kroměříž",
    "Kunovice",
    "Luhačovice",
    "Napajedla",
    "Otrokovice",
    "Rožnov pod Radhoštěm",
    "Uherské Hradiště",
    "Uherský Brod",
    "Valašské Meziříčí",
    "Vsetín",
  ],
  "Moravskoslezský kraj": [
    "Ostrava",
    "Bohumín",
    "Bruntál",
    "Český Těšín",
    "Frenštát pod Radhoštěm",
    "Frýdek-Místek",
    "Havířov",
    "Karviná",
    "Kopřivnice",
    "Krnov",
    "Nový Jičín",
    "Odry",
    "Opava",
    "Orlová",
    "Rýmařov",
    "Studénka",
    "Třinec",
  ],
};

function buildCities(
  regions: Record<string, string[]>,
  country: Country
): CityOption[] {
  const list: CityOption[] = [];
  for (const [region, cities] of Object.entries(regions)) {
    for (const name of cities) {
      list.push({ name, region, country });
    }
  }
  return list.sort((a, b) => a.name.localeCompare(b.name, "sk"));
}

export const SK_CITIES: CityOption[] = buildCities(SK_REGIONS, "SK");
export const CZ_CITIES: CityOption[] = buildCities(CZ_REGIONS, "CZ");

export function getCitiesForCountry(country: Country): CityOption[] {
  return country === "SK" ? SK_CITIES : CZ_CITIES;
}

/** Formats a city + country into the single display string stored in the DB. */
export function formatLocation(cityName: string, country: Country): string {
  return `${cityName}, ${countryLabel(country)}`;
}

/**
 * Best-effort parse of a stored `location` string ("Mesto, Krajina") back into
 * a structured country/city pair, so previously saved free-text values still
 * pre-select something sensible in the new pickers.
 */
export function parseLocation(
  value: string | null | undefined
): { country: Country; city: string | null } {
  if (!value) return { country: "SK", city: null };

  const trimmed = value.trim();
  const [cityPart, countryPart] = trimmed.split(",").map((s) => s.trim());

  const matchCountry = COUNTRIES.find(
    (c) => c.label.toLowerCase() === (countryPart ?? "").toLowerCase()
  )?.code;

  const candidates = matchCountry
    ? getCitiesForCountry(matchCountry)
    : [...SK_CITIES, ...CZ_CITIES];

  const normalized = (cityPart || trimmed).toLowerCase();
  const found = candidates.find((c) => c.name.toLowerCase() === normalized);

  if (found) return { country: found.country, city: found.name };
  if (matchCountry) return { country: matchCountry, city: null };
  return { country: "SK", city: null };
}
