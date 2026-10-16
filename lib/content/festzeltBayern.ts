// Inhalt der Themenseite /veranstaltung/festzelt/bayern. Quelle und Wortlaut:
// docs/festzelt-bayern.md (wörtlich übernommen). Die Bandzeilen kommen
// bewusst aus dieser Datei, nicht aus der Datenbank; die Slugs dienen nur
// dazu, jeden Bandnamen mit der Bandseite /band/<slug> zu verlinken.

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

export const festzeltBayernIntro =
  'In Bayern wird gern und ausgiebig gefeiert – auf Volksfesten und Dulten, bei Kirchweihen, Vereinsfesten und vielen weiteren Anlässen. Die passende Musik gehört dazu: von traditioneller Volksmusik und Brassbands bis zur bayerischen Partyband. Hier findest du Bands, die Festzelt und Festplatz im Programm haben und die wir für solche Feste ausgewählt haben.';

export const festzeltBayernAudience = 'Für Festwirte, Vereine, Gemeinden und Feuerwehren.';

export const festzeltBayernTips = {
  heading: 'Worauf du bei einer Zeltband achten solltest',
  items: [
    {
      lead: 'Spielzeit.',
      text: 'In Festzelten ist meist gegen Mitternacht Zapfenstreich. Eine Partyband spielt deshalb häufig rund fünf Stunden, zum Beispiel von 19 bis 24 Uhr. Manche Bands spielen nur drei oder vier Stunden. Konzertantere Bands spielen oft nur etwa zwei Stunden, dann muss eine zweite Band den Abend übernehmen.',
    },
    {
      lead: 'Technik und Anlage.',
      text: 'Nach unserer Erfahrung steht bei großen Festzelten die Technik zunehmend schon, zum Beispiel auf dem Gillamoos, der Dult in Regensburg oder Landshut und in Floß. Das macht die Organisation einfacher und schneller. Wo das nicht so ist, bringt die Band Licht und Ton mit, und das wirkt sich auf die Gage aus.',
    },
    {
      lead: 'Lautstärke.',
      text: 'Die Lautstärke gibt der Veranstalter oder Festwirt vor, und die Band sollte sich daran halten. Sprecht das vorab ab.',
    },
    {
      lead: 'Bühne und Strom.',
      text: 'Die Anforderungen an die Bühne stehen im Technical Rider der Band, klärt sie vorab. Standard-Festzeltbühnen bieten nach unserer Erfahrung oft genug Platz, auch für große Besetzungen wie eine Blaskapelle. Als Beispiel für eine einzelne Band: Laut ihrer Bühnenanweisung (Stand Februar 2026) braucht Donnaweda die Bühne fünf Stunden vor Beginn für Aufbau und Soundcheck, mindestens 7 × 4 Meter Fläche und einen eigenen 63-A-Stromanschluss. Andere Bands haben andere Anforderungen.',
    },
  ],
};

export type FestzeltBayernBand = {
  slug: string;
  name: string;
  ort: string;
  text: string;
};

export type FestzeltBayernGroup = {
  heading: string;
  bands: FestzeltBayernBand[];
};

export const festzeltBayernBandsHeading = 'Unsere Zeltbands';

export const festzeltBayernGroups: FestzeltBayernGroup[] = [
  {
    heading: 'Partybands',
    bands: [
      {
        slug: 'donnaweda',
        name: 'Donnaweda',
        ort: 'Hemau',
        text: 'Bayrische Partyband mit fünf Musikern, wiederkehrend auf der Dult in Regensburg und dem Gillamoos in Abensberg, 2024 auch auf der Flosser Kirwa. Die Band betreue ich selbst.',
      },
      {
        slug: 'd-quertreiber',
        name: 'Quertreiber',
        ort: 'Ensdorf',
        text: 'Bayrische Partyband mit fünf Musikern, buchbar für Festzelt, Kirchweih, Volksfest und Vereinsfest.',
      },
      {
        slug: 'groegoetz-weissbir',
        name: 'Grögötz Weißbir',
        ort: 'Ensdorf',
        text: 'Bayrische Partyband mit vier Musikern, „Ein Rausch für die Ohren!", buchbar für Festzelt, Bierfest, Brauereifest und Stadtfest.',
      },
      {
        slug: 'getthatmusic-band',
        name: 'GetThat!',
        ort: 'Augsburg',
        text: 'Partyband mit sieben Musikern, buchbar für Festzelt, Volksfest, Dult und Kirchweih.',
      },
      {
        slug: 'zruck-zu-dir',
        name: 'zruck zu Dir!',
        ort: 'Zolling',
        text: '„Die Partyband aus der Hallertau", fünf Musiker, buchbar für Festzelt, Kirchweih, Dult und Vereinsfest.',
      },
      {
        slug: 'die-haumdaucher',
        name: 'Die Haumdaucher',
        ort: 'Pegnitz',
        text: 'Bayrische Partyband mit sechs Musikern, „Stimmung bis das Zelt abhebt", buchbar für Festzelt, Volksfest, Kirchweih und Sportfest.',
      },
      {
        slug: 'herbn-beets',
        name: "Herb'n Beets",
        ort: 'Gangkofen',
        text: '„Die Partyband aus dem Rottal", fünf Musiker, buchbar für Festzelt, Dult, Gründungsfest und Vereinsfest.',
      },
    ],
  },
  {
    heading: 'Volksmusik und Blasmusik',
    bands: [
      {
        slug: 'blechhilfswerk',
        name: 'Blechhilfswerk',
        ort: 'Eichstätt',
        text: 'Blasmusik mit sieben Musikern, „4 von 5 Zahnärzten empfehlen unsere Blasmusik", buchbar für Festzelt, Bierfest, Brauereifest und Jubiläum.',
      },
      {
        slug: 'tegernseer-tanzlmusi',
        name: 'Tegernseer Tanzlmusi',
        ort: 'Kreuth',
        text: 'Alpenländische Volks- und Wirtshausmusik, als Duo oder Trio buchbar, für Festzelt, Bierfest, Biergarten und Kirchweih.',
      },
      {
        slug: 'dezent-boehmisch',
        name: 'Dezent Böhmisch',
        ort: 'Beratzhausen',
        text: 'Volksmusik, „jung, dynamisch und unverbraucht", buchbar für Festzelt, Kirchweih, Gründungsfest und Vereinsfest.',
      },
      {
        slug: 'boehmisches-verlangen',
        name: 'Böhmisches Verlangen',
        ort: 'Erlangen',
        text: 'Blasmusik „traditionell, böhmisch, modern", sieben Musiker, buchbar für Festzelt, Bierfest, Brauereifest und Stadtfest.',
      },
    ],
  },
  {
    heading: 'Brass',
    bands: [
      {
        slug: 'blechstreet-boys',
        name: 'Blechstreet Boys',
        ort: 'Memmelsdorf bei Bamberg',
        text: 'Future-Brass-Partyband mit neun Musikern, buchbar für Festzelt, Brauereifest, Bierfest und Gründungsfest.',
      },
      {
        slug: 'muckasaeck',
        name: 'Muckasäck',
        ort: 'Ruderatshofen',
        text: 'Brass-Partyband, „Mitreis(s)ende Euphorie", buchbar für Festzelt, Bierfest, Brauereifest und Open Air.',
      },
      {
        slug: 'kapelle-quetschnblech',
        name: 'Quetschnblech',
        ort: 'Vilsbiburg',
        text: 'Brass und Volksmusik mit zehn Musikern, „bavarian lifestyle | dancefloor groove", buchbar für Festzelt, Volksfest, Oktoberfest und Frühschoppen.',
      },
    ],
  },
];

export const festzeltBayernAllBandsLabel = 'Alle Festzeltbands ansehen';

export const festzeltBayernPrice = {
  heading: 'Preisorientierung',
  text: 'Die Gage hängt vor allem von der Bekanntheit der Band ab. Nach unseren Erfahrungen liegen weniger bekannte Zeltbands bei etwa 1.500 bis 2.800 € ohne Licht- und Tonanlage, regional bekannte Bands eher bei 3.500 bis 5.500 €. Nach oben gibt es kein Ende, sehr bekannte Bands kosten deutlich mehr. Bringt die Band Licht und Ton mit, wirkt sich das auf die Gage aus. Lass dir im Angebot bestätigen, was enthalten ist.',
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
