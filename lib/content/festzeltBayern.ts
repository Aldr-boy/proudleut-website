// Inhalt der Themenseite /veranstaltung/festzelt/bayern. Quelle und Wortlaut:
// docs/festzelt-bayern.md (Version 2, wörtlich übernommen). Name, Ort,
// Besetzung und Anlass-Tags der Bandkarten kommen aus den Bandprofilen, die
// Zeile "claim" aus dieser Datei; die Slugs dienen nur der Auswahl und der
// Verlinkung der Bands.

export const FESTZELT_BAYERN_PATH = '/veranstaltung/festzelt/bayern';

// Ab dieser Zahl (aktiver, verlinkbarer) Bands ist die Seite indexierbar und
// steht in der Sitemap; darunter noindex und nicht in der Sitemap.
export const FESTZELT_BAYERN_MIN_BANDS = 3;

export const FESTZELT_BAYERN_ALL_BANDS_URL = 'https://www.proudleut.com/bands?anlass=festzelt';

export const festzeltBayernMeta = {
  title: 'Festzeltbands Bayern: Party, Blasmusik & Brass – proudleut.com',
  description:
    'Festzeltbands aus Bayern für Volksfest, Kirwa, Dult und Vereinsfest: Partybands, Volksmusik und Brass, von uns ausgewählt. Bands merken und anfragen.',
  canonical: 'https://www.proudleut.com/veranstaltung/festzelt/bayern',
};

export const festzeltBayernHero = {
  imageSrc: '/images/veranstaltung/festzelt-gruendungsfest-wappersdorf.jpg',
  imageAlt:
    'Einzug mit Fahnenabordnungen ins Festzelt beim Gründungsfest der Freiwilligen Feuerwehr Wappersdorf, jubelnde Gäste und Konfetti',
  caption:
    'Einzug beim Gründungsfest der Freiwilligen Feuerwehr Wappersdorf, 2019. Foto: Florian Schlegel – Photo & more',
  headline: 'Festzeltbands aus Bayern',
  audience: 'Für Festwirte, Vereine, Gemeinden und Feuerwehren',
  intro:
    'In Bayern wird gern und ausgiebig gefeiert – auf Volksfesten und Dulten, bei Kirchweihen, Vereinsfesten und vielen weiteren Anlässen. Die passende Musik gehört dazu: von traditioneller Volksmusik und Brassbands bis zur bayerischen Partyband. Hier findest du Bands, die Festzelt und Festplatz im Programm haben und die wir für solche Feste ausgewählt haben.',
  primaryButton: 'Bands ansehen',
  secondaryButton: 'Alle Festzeltbands ansehen →',
};

export const festzeltBayernSteps = {
  title: 'SO LÄUFT`S AUF PROUDLEUT',
  items: [
    'Bands mit dem Herz in der Merkliste sammeln, bis zu acht.',
    'Buchungsanfrage abschicken, an mehrere Bands gleichzeitig.',
    'Direkt mit der Band weitersprechen.',
  ],
};

export type FestzeltBayernBand = {
  slug: string;
  claim: string;
  betreut?: boolean;
};

export type FestzeltBayernGroup = {
  heading: string;
  bands: FestzeltBayernBand[];
};

export const festzeltBayernBetreutHinweis = 'Von mir betreut';

export const festzeltBayernGroups: FestzeltBayernGroup[] = [
  {
    heading: 'Bayrische Partybands',
    bands: [
      { slug: 'donnaweda', claim: '' },
      { slug: 'd-quertreiber', claim: '' },
      { slug: 'groegoetz-weissbir', claim: '' },
      { slug: 'getthatmusic-band', claim: '' },
      { slug: 'zruck-zu-dir', claim: '' },
      { slug: 'die-haumdaucher', claim: '' },
      { slug: 'herbn-beets', claim: '' },
    ],
  },
  {
    heading: 'Volksmusik und Blasmusik',
    bands: [
      { slug: 'blechhilfswerk', claim: '' },
      { slug: 'tegernseer-tanzlmusi', claim: '' },
      { slug: 'dezent-boehmisch', claim: '' },
      { slug: 'boehmisches-verlangen', claim: '' },
    ],
  },
  {
    heading: 'Brass',
    bands: [
      { slug: 'blechstreet-boys', claim: '' },
      { slug: 'muckasaeck', claim: '' },
      { slug: 'kapelle-quetschnblech', claim: '' },
    ],
  },
];

export const festzeltBayernOrga = {
  heading: 'Ein großes Fest braucht eine gute Orga. Dies können Fragen im Festzelt in puncto Musik sein',
  items: [
    {
      title: 'Spielzeit: Meist bis Mitternacht',
      text: 'In Festzelten ist meist gegen Mitternacht Zapfenstreich. Eine Partyband spielt deshalb häufig rund fünf Stunden, zum Beispiel von 19 bis 24 Uhr. Manche Bands spielen nur drei oder vier Stunden. Konzertantere Bands spielen oft nur etwa zwei Stunden, dann muss eine zweite Band den Abend übernehmen.',
    },
    {
      title: 'Technik und Anlage: Steht oft schon',
      text: 'Nach unserer Erfahrung steht bei großen Festzelten die Technik zunehmend schon, zum Beispiel auf dem Gillamoos, der Dult in Regensburg oder Landshut, oder wie auf der Flosser Kirwa. Das macht die Organisation einfacher und schneller. Wo das nicht so ist, bringt die Band Licht und Ton mit, wobei sich dies natürlich auf die Bandgage auswirkt.',
    },
    {
      title: 'Lautstärke: Der Veranstalter gibt hier den Ton an',
      text: 'Die Lautstärke gibt der Veranstalter oder Festwirt vor, und die Band sollte sich daran halten. Sprecht das vorab ab.',
    },
    {
      title: 'Bühne und Strom: Im Technical Rider geklärt',
      text: 'Die Anforderungen an die Bühne stehen im Technical Rider der Band, klärt sie vorab. Standard-Festzeltbühnen bieten nach unserer Erfahrung oft genug Platz, auch für große Besetzungen wie eine Blaskapelle. Als Beispiel für eine einzelne Band: Laut ihrer Bühnenanweisung (Stand Februar 2026) braucht Donnaweda die Bühne fünf Stunden vor Beginn für Aufbau und Soundcheck, mindestens 7 × 4 Meter Fläche und einen eigenen 63-A-Stromanschluss. Andere Bands haben andere Anforderungen.',
    },
  ],
};

export const festzeltBayernPrice = {
  heading: 'Preisorientierung',
  text: 'Die Gage hängt vor allem von der Bekanntheit der Band ab. Nach unseren Erfahrungen liegen weniger bekannte Zeltbands bei etwa 1.500 bis 2.800 € ohne Licht- und Tonanlage, regional bekannte Bands eher bei 3.500 bis 5.500 €. Nach oben gibt es kein Ende, sehr bekannte Bands kosten deutlich mehr. Bringt die Band Licht und Ton mit, wirkt sich das auf die Gage aus. Lass dir im Angebot bestätigen, was enthalten ist.',
  cards: [
    { label: 'Weniger bekannte Zeltbands', value: 'etwa 1.500 bis 2.800 €', note: '(ohne Licht- und Tonanlage)' },
    { label: 'Regional bekannte Bands', value: 'etwa 3.500 bis 5.500 €', note: '' },
    { label: 'Sehr bekannte Bands', value: 'deutlich mehr', note: '(Nach oben gibt es kein Ende.)' },
  ],
};

export const festzeltBayernFaq = {
  heading: 'Häufige Fragen',
  items: [
    {
      question: 'Wie früh muss man ein Zelt-Wochenende buchen?',
      answer:
        'Für Volksfest, Dult oder Kirchweih wird die Band meist ein Jahr bis ein halbes Jahr vor dem Termin gebucht. Bei Gründungsfesten kommen die ersten Anfragen oft zwei bis drei Jahre vorher, fix gemacht wird die Band etwa zwei bis anderthalb Jahre davor. Frag mehrere Bands an, denn nicht jede ist an deinem Termin frei.',
    },
    {
      question: 'Ist die Technik im Preis enthalten?',
      answer:
        'Das hängt vom Zelt ab. Bei großen Festzelten steht die Technik häufig schon, dann spielt die Band ohne eigene Anlage. Bringt die Band Licht und Ton mit, wirkt sich das auf die Gage aus. Unsere Preisorientierung gilt ohne Anlage. Klär das vorher mit der Band und lass es im Angebot festhalten.',
    },
    {
      question: 'Kann man mehrere Bands für ein Festprogramm anfragen?',
      answer:
        'Ja, und das ist oft sinnvoll. Konzertantere Bands spielen nur etwa zwei Stunden, dann übernimmt eine zweite Band, und bei mehrtägigen Festen spielt häufig an jedem Tag eine andere. Du kannst bis zu acht Bands in der Merkliste sammeln und gleichzeitig anfragen. So findest du schneller eine freie Band und bekommst einen guten Überblick über die Preise.',
    },
  ],
};

export const festzeltBayernClosing = {
  heading: 'Gefällt dir eine Band? Merk sie dir.',
  text: 'Tippe bei einer Band auf das Herz. In deiner Merkliste sammelst du bis zu acht Bands, schickst eine Buchungsanfrage an alle gleichzeitig und sprichst danach direkt mit den Bands.',
  button: 'Alle Festzeltbands ansehen',
};

// Bands der Auswahl, die in der übergebenen Menge aktiver Slugs vorkommen
// (Gruppen und Reihenfolge bleiben erhalten; leere Gruppen entfallen).
export function resolveFestzeltBayernGroups(activeSlugs: ReadonlySet<string>): FestzeltBayernGroup[] {
  return festzeltBayernGroups
    .map((g) => ({ ...g, bands: g.bands.filter((b) => activeSlugs.has(b.slug)) }))
    .filter((g) => g.bands.length > 0);
}

export function countFestzeltBayernBands(groups: FestzeltBayernGroup[]): number {
  return groups.reduce((n, g) => n + g.bands.length, 0);
}
