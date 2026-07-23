// Curated list of Slovak and Czech cities/towns, grouped by region (kraj),
// used to force a real city selection instead of free-text typing.
// Covers every region of both countries with all major towns.

export type Country = "SK" | "CZ";

export type CityOption = {
  name: string;
  /** Administratívny kraj (napr. Žilinský kraj). */
  region: string;
  /** Mikroregión / oblasť (napr. Kysuce, Orava). */
  area?: string | null;
  country: Country;
  /** kraj = celý kraj, area = región, city = mesto */
  kind?: "city" | "region" | "area";
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

// ── Slovakia — tradičné regióny / oblasti (mesto → región → kraj) ─────────────
const SK_AREAS: Record<string, { kraj: string; cities: string[] }> = {
  Záhorie: {
    kraj: "Trnavský kraj",
    cities: ["Senica", "Skalica", "Holíč", "Gbely"],
  },
  "Malé Karpaty": {
    kraj: "Bratislavský kraj",
    cities: ["Malacky", "Stupava", "Pezinok", "Modra", "Svätý Jur", "Senec"],
  },
  Podunajsko: {
    kraj: "Trnavský kraj",
    cities: ["Dunajská Streda", "Šamorín", "Sereď", "Galanta"],
  },
  Považie: {
    kraj: "Trenčiansky kraj",
    cities: [
      "Trenčín",
      "Považská Bystrica",
      "Púchov",
      "Ilava",
      "Dubnica nad Váhom",
      "Nové Mesto nad Váhom",
    ],
  },
  "Horná Nitra": {
    kraj: "Trenčiansky kraj",
    cities: ["Prievidza", "Handlová", "Nováky", "Bojnice", "Partizánske"],
  },
  Myjavsko: {
    kraj: "Trenčiansky kraj",
    cities: ["Myjava", "Brezová pod Bradlom", "Stará Turá"],
  },
  Ponitrie: {
    kraj: "Nitriansky kraj",
    cities: ["Nitra", "Topoľčany", "Zlaté Moravce", "Vráble", "Šaľa"],
  },
  "Žitný ostrov": {
    kraj: "Nitriansky kraj",
    cities: ["Komárno", "Hurbanovo", "Kolárovo", "Štúrovo", "Želiezovce"],
  },
  Kysuce: {
    kraj: "Žilinský kraj",
    cities: ["Čadca", "Kysucké Nové Mesto", "Krásno nad Kysucou", "Turzovka"],
  },
  Orava: {
    kraj: "Žilinský kraj",
    cities: ["Dolný Kubín", "Námestovo", "Tvrdošín"],
  },
  Liptov: {
    kraj: "Žilinský kraj",
    cities: ["Liptovský Mikuláš", "Liptovský Hrádok", "Ružomberok"],
  },
  Turiec: {
    kraj: "Žilinský kraj",
    cities: ["Martin", "Vrútky", "Turčianske Teplice"],
  },
  "Žilinsko-Rajecká dolina": {
    kraj: "Žilinský kraj",
    cities: ["Žilina", "Bytča", "Rajec"],
  },
  Horehronie: {
    kraj: "Banskobystrický kraj",
    cities: ["Banská Bystrica", "Brezno", "Sliač"],
  },
  Pohronie: {
    kraj: "Banskobystrický kraj",
    cities: ["Žiar nad Hronom", "Žarnovica", "Nová Baňa", "Kremnica"],
  },
  Gemer: {
    kraj: "Banskobystrický kraj",
    cities: ["Rimavská Sobota", "Revúca", "Hnúšťa", "Tisovec"],
  },
  Novohrad: {
    kraj: "Banskobystrický kraj",
    cities: ["Lučenec", "Fiľakovo", "Poltár", "Veľký Krtíš", "Modrý Kameň"],
  },
  "Pohronský Inovec": {
    kraj: "Banskobystrický kraj",
    cities: ["Zvolen", "Detva", "Krupina", "Banská Štiavnica"],
  },
  Spiš: {
    kraj: "Prešovský kraj",
    cities: [
      "Poprad",
      "Kežmarok",
      "Levoča",
      "Spišská Belá",
      "Spišská Stará Ves",
      "Spišské Podhradie",
      "Stará Ľubovňa",
      "Spišská Nová Ves",
      "Gelnica",
      "Krompachy",
    ],
  },
  Tatry: {
    kraj: "Prešovský kraj",
    cities: ["Vysoké Tatry", "Poprad", "Kežmarok"],
  },
  Šariš: {
    kraj: "Prešovský kraj",
    cities: ["Prešov", "Sabinov", "Bardejov", "Giraltovce", "Svidník"],
  },
  "Horný Zemplín": {
    kraj: "Prešovský kraj",
    cities: ["Humenné", "Snina", "Medzilaborce", "Stropkov", "Vranov nad Topľou"],
  },
  "Dolný Zemplín": {
    kraj: "Košický kraj",
    cities: [
      "Michalovce",
      "Trebišov",
      "Sečovce",
      "Sobrance",
      "Strážske",
      "Čierna nad Tisou",
    ],
  },
  Abov: {
    kraj: "Košický kraj",
    cities: ["Košice", "Moldava nad Bodvou", "Medzev"],
  },
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

// ── Czechia — tradičné / turistické oblasti ───────────────────────────────────
const CZ_AREAS: Record<string, { kraj: string; cities: string[] }> = {
  Praha: {
    kraj: "Hlavní město Praha",
    cities: ["Praha"],
  },
  "Střední Čechy": {
    kraj: "Středočeský kraj",
    cities: [
      "Kladno",
      "Mladá Boleslav",
      "Kolín",
      "Příbram",
      "Kutná Hora",
      "Mělník",
      "Beroun",
      "Nymburk",
      "Poděbrady",
      "Říčany",
    ],
  },
  Šumava: {
    kraj: "Jihočeský kraj",
    cities: ["Prachatice", "Český Krumlov", "Sušice"],
  },
  "Jižní Čechy": {
    kraj: "Jihočeský kraj",
    cities: [
      "České Budějovice",
      "Tábor",
      "Písek",
      "Jindřichův Hradec",
      "Strakonice",
    ],
  },
  Plzeňsko: {
    kraj: "Plzeňský kraj",
    cities: ["Plzeň", "Rokycany", "Klatovy", "Domažlice", "Tachov"],
  },
  Karlovarsko: {
    kraj: "Karlovarský kraj",
    cities: ["Karlovy Vary", "Cheb", "Mariánské Lázně", "Sokolov", "Aš"],
  },
  "Krušné hory": {
    kraj: "Ústecký kraj",
    cities: ["Teplice", "Most", "Chomutov", "Jirkov", "Kadaň"],
  },
  "České Švýcarsko": {
    kraj: "Ústecký kraj",
    cities: ["Děčín", "Rumburk", "Varnsdorf"],
  },
  Liberecko: {
    kraj: "Liberecký kraj",
    cities: ["Liberec", "Jablonec nad Nisou", "Česká Lípa", "Turnov"],
  },
  Krkonoše: {
    kraj: "Královéhradecký kraj",
    cities: ["Trutnov", "Vrchlabí", "Dvůr Králové nad Labem"],
  },
  "Východní Čechy": {
    kraj: "Pardubický kraj",
    cities: ["Pardubice", "Chrudim", "Ústí nad Orlicí", "Svitavy", "Litomyšl"],
  },
  Vysočina: {
    kraj: "Kraj Vysočina",
    cities: ["Jihlava", "Třebíč", "Žďár nad Sázavou", "Havlíčkův Brod", "Pelhřimov"],
  },
  "Jižní Morava": {
    kraj: "Jihomoravský kraj",
    cities: ["Brno", "Znojmo", "Břeclav", "Vyškov", "Blansko", "Boskovice"],
  },
  Slovácko: {
    kraj: "Jihomoravský kraj",
    cities: ["Hodonín", "Břeclav", "Kyjov", "Veselí nad Moravou"],
  },
  Haná: {
    kraj: "Olomoucký kraj",
    cities: ["Olomouc", "Prostějov", "Přerov", "Šternberk", "Uničov"],
  },
  Jeseníky: {
    kraj: "Olomoucký kraj",
    cities: ["Šumperk", "Jeseník", "Zábřeh", "Mohelnice"],
  },
  Valašsko: {
    kraj: "Zlínský kraj",
    cities: [
      "Vsetín",
      "Valašské Meziříčí",
      "Rožnov pod Radhoštěm",
      "Zlín",
      "Otrokovice",
    ],
  },
  "Slovácko (Zlínsko)": {
    kraj: "Zlínský kraj",
    cities: ["Uherské Hradiště", "Uherský Brod", "Kroměříž"],
  },
  Ostravsko: {
    kraj: "Moravskoslezský kraj",
    cities: ["Ostrava", "Havířov", "Karviná", "Orlová", "Bohumín", "Opava"],
  },
  Beskydy: {
    kraj: "Moravskoslezský kraj",
    cities: [
      "Frýdek-Místek",
      "Třinec",
      "Český Těšín",
      "Frenštát pod Radhoštěm",
      "Kopřivnice",
      "Nový Jičín",
    ],
  },
};

type AreaDef = { kraj: string; cities: string[] };

const KIND_RANK: Record<NonNullable<CityOption["kind"]>, number> = {
  region: 0,
  area: 1,
  city: 2,
};

function buildLocationOptions(
  kraje: Record<string, string[]>,
  areas: Record<string, AreaDef>,
  country: Country
): CityOption[] {
  const list: CityOption[] = [];
  const cityAreas = new Map<string, string[]>();

  for (const [areaName, def] of Object.entries(areas)) {
    list.push({
      name: areaName,
      region: def.kraj,
      area: areaName,
      country,
      kind: "area",
    });
    for (const city of def.cities) {
      const prev = cityAreas.get(city) ?? [];
      if (!prev.includes(areaName)) prev.push(areaName);
      cityAreas.set(city, prev);
    }
  }

  for (const [kraj, cities] of Object.entries(kraje)) {
    list.push({
      name: kraj,
      region: kraj,
      country,
      kind: "region",
    });
    for (const name of cities) {
      const areasForCity = cityAreas.get(name);
      list.push({
        name,
        region: kraj,
        area: areasForCity?.[0] ?? null,
        country,
        kind: "city",
      });
    }
  }

  return list.sort((a, b) => {
    const ra = KIND_RANK[a.kind ?? "city"];
    const rb = KIND_RANK[b.kind ?? "city"];
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name, "sk");
  });
}

/** Areas that list this city (a city can belong to more than one). */
function areasContainingCity(
  cityName: string,
  country: Country
): string[] {
  const areas = country === "SK" ? SK_AREAS : CZ_AREAS;
  const key = normalizePlaceKey(cityName);
  return Object.entries(areas)
    .filter(([, def]) =>
      def.cities.some((c) => normalizePlaceKey(c) === key)
    )
    .map(([name]) => name);
}

export const SK_CITIES: CityOption[] = buildLocationOptions(
  SK_REGIONS,
  SK_AREAS,
  "SK"
);
export const CZ_CITIES: CityOption[] = buildLocationOptions(
  CZ_REGIONS,
  CZ_AREAS,
  "CZ"
);

export function getCitiesForCountry(country: Country): CityOption[] {
  return country === "SK" ? SK_CITIES : CZ_CITIES;
}

/** Unique combobox value — city/area/kraj can share a display name. */
export function locationOptionValue(option: CityOption): string {
  const kind = option.kind ?? "city";
  return `${option.country}:${kind}:${option.name}`;
}

/** Extract the place name from a combobox value. */
export function parseLocationOptionValue(value: string | null | undefined): string | null {
  if (!value?.trim() || value === "__all__") return null;
  const parts = value.split(":");
  // SK:city:Čadca | SK:area:Kysuce | SK:region:Žilinský kraj
  if (parts.length >= 3 && (parts[0] === "SK" || parts[0] === "CZ")) {
    return parts.slice(2).join(":");
  }
  // Legacy SK:Čadca
  if (parts.length === 2 && (parts[0] === "SK" || parts[0] === "CZ")) {
    return parts[1] || null;
  }
  return value;
}

/** Hint under a location option in the combobox. */
export function locationOptionHint(option: CityOption): string {
  if (option.kind === "region") return "Celý kraj";
  if (option.kind === "area") return `Región · ${option.region}`;
  if (option.area) return `${option.area} · ${option.region}`;
  return option.region;
}

/** Formats a city/kraj + country into the single display string stored in the DB. */
export function formatLocation(placeName: string, country: Country): string {
  return `${placeName}, ${countryLabel(country)}`;
}

/** Infer SK/CZ from a stored profile location string. */
export function locationCountry(
  value: string | null | undefined
): Country | null {
  if (!value?.trim()) return null;
  const lower = value.toLowerCase();
  if (
    lower.includes("slovensko") ||
    lower.endsWith(", sk") ||
    /(^|,\s*)sk\s*$/i.test(value.trim())
  ) {
    return "SK";
  }
  if (
    lower.includes("česko") ||
    lower.includes("cesko") ||
    lower.includes("česká") ||
    lower.includes("ceska") ||
    lower.endsWith(", cz") ||
    /(^|,\s*)cz\s*$/i.test(value.trim())
  ) {
    return "CZ";
  }

  const place = locationPlaceName(value);
  const found = [...SK_CITIES, ...CZ_CITIES].find(
    (c) => c.name.toLowerCase() === place.toLowerCase()
  );
  return found?.country ?? null;
}

function normalizePlaceKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Place part of a stored location ("Čadca, Slovensko" → "Čadca"). */
export function locationPlaceName(
  value: string | null | undefined
): string {
  if (!value?.trim()) return "";
  return value.split(",")[0]?.trim() || value.trim();
}

function addKrajTree(
  names: Set<string>,
  kraj: string,
  country: Country,
  all: CityOption[]
) {
  names.add(kraj);
  for (const c of all) {
    if (c.country !== country) continue;
    if (c.kind === "region" && c.name === kraj) continue;
    if (c.region === kraj) names.add(c.name);
  }
  const areas = country === "SK" ? SK_AREAS : CZ_AREAS;
  for (const [areaName, def] of Object.entries(areas)) {
    if (def.kraj === kraj) {
      names.add(areaName);
      for (const city of def.cities) names.add(city);
    }
  }
}

/**
 * Places that should match a catalog filter selection.
 * City → mesto + región(y) + kraj (+ mestá v regióne/kraji).
 * Región → región + kraj + mestá v regióne.
 * Kraj → kraj + regióny + všetky mestá.
 */
export function getLocationMatchNames(filterPlace: string): Set<string> {
  const trimmed = filterPlace.trim();
  if (!trimmed) return new Set();

  const all = [...SK_CITIES, ...CZ_CITIES];
  const key = normalizePlaceKey(trimmed);
  const found = all.find((c) => normalizePlaceKey(c.name) === key);

  if (!found) {
    return new Set([trimmed]);
  }

  const names = new Set<string>([found.name]);

  if (found.kind === "region") {
    addKrajTree(names, found.name, found.country, all);
    return names;
  }

  if (found.kind === "area") {
    names.add(found.region);
    const areas = found.country === "SK" ? SK_AREAS : CZ_AREAS;
    const def = areas[found.name];
    if (def) {
      for (const city of def.cities) names.add(city);
    }
    // Also match the whole kraj (umelci s lokalitou = kraj)
    addKrajTree(names, found.region, found.country, all);
    return names;
  }

  // City → own name + all areas containing it + kraj + siblings in those areas + kraj tree
  names.add(found.region);
  for (const area of areasContainingCity(found.name, found.country)) {
    names.add(area);
    const areas = found.country === "SK" ? SK_AREAS : CZ_AREAS;
    for (const city of areas[area]?.cities ?? []) names.add(city);
  }
  addKrajTree(names, found.region, found.country, all);
  return names;
}

/**
 * Catalog filter: searching Čadca also matches Kysuce / Žilinský kraj
 * (and other artists in that región / kraj).
 */
export function locationMatchesFilter(
  djLocation: string | null | undefined,
  filterPlace: string | null | undefined
): boolean {
  if (!filterPlace?.trim()) return true;
  if (!djLocation?.trim()) return false;

  const djPlace = locationPlaceName(djLocation);
  const djKey = normalizePlaceKey(djPlace);
  const matchNames = getLocationMatchNames(filterPlace);

  for (const name of matchNames) {
    if (normalizePlaceKey(name) === djKey) return true;
  }

  // Free-text / partial fallback for custom locations
  const filterKey = normalizePlaceKey(filterPlace);
  const fullKey = normalizePlaceKey(djLocation);
  return fullKey.includes(filterKey) || djKey.includes(filterKey);
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
  if (matchCountry) {
    return { country: matchCountry, city: cityPart || null };
  }
  return { country: "SK", city: cityPart || trimmed || null };
}
