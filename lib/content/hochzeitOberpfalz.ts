// Inhalt der Themenseite /veranstaltung/hochzeit/oberpfalz. Quelle und Wortlaut:
// docs/hochzeit-oberpfalz.md (v2, wörtlich übernommen). Name, Ort, Besetzung und
// Anlass-Tags der Bandkarten kommen aus den Bandprofilen; die Slugs dienen nur
// der Auswahl und der Verlinkung der Bands.

export const HOCHZEIT_OBERPFALZ_PATH = '/veranstaltung/hochzeit/oberpfalz';

// Ab dieser Zahl (aktiver, verlinkbarer) Bands ist die Seite indexierbar und
// steht in der Sitemap; darunter noindex und nicht in der Sitemap.
export const HOCHZEIT_OBERPFALZ_MIN_BANDS = 3;

// Alle Buttons "Alle Hochzeitsbands ..." führen auf den Finder der Hochzeitsseite
// mit vorgesetztem Regionsfilter (Vorgabe im Auftrag, geht der Datei vor).
export const HOCHZEIT_OBERPFALZ_ALL_BANDS_URL = '/veranstaltung/hochzeit?region=oberpfalz';
export const HOCHZEIT_OBERPFALZ_ALL_BANDS_LABEL = 'Alle Hochzeitsbands aus der Oberpfalz ansehen →';

export const hochzeitOberpfalzMeta = {
  title: 'Hochzeitsbands Oberpfalz: Trauung bis Tanz – proudleut.com',
  description:
    'Hochzeitsbands aus der Oberpfalz: Musik für Trauung, Sektempfang und Tanz, von uns ausgewählt. Mit Preisorientierung und Tipps. Bands merken und anfragen.',
  canonical: 'https://www.proudleut.com/veranstaltung/hochzeit/oberpfalz',
};

export const hochzeitOberpfalzHero = {
  imageSrc: '/images/veranstaltung/hochzeitsband-donnaweda-hagenhill.webp',
  imageAlt:
    'Fünf Musiker der Band Donnaweda in Lederhosen springen mit Gitarre, Harmonika, Trommeln und Tuba vor einem Landgasthof in der Sonne',
  caption: 'Bayrische Partyband Donnaweda bei einer Hochzeit im Landgasthof Wild in Hagenhill, August 2016.',
  headline: 'Hochzeitsbands in der Oberpfalz',
  intro:
    'Du heiratest in der Oberpfalz und suchst Livemusik, die zu eurer Feier passt? Hier findest du Bands aus der Region, die wir für Hochzeiten ausgewählt haben.',
  primaryButton: 'Bands ansehen',
};

export const hochzeitOberpfalzSteps = {
  title: 'SO LÄUFT’S AUF PROUDLEUT',
  items: [
    'Bands mit dem Herz in der Merkliste sammeln, bis zu acht.',
    'Buchungsanfrage abschicken, an mehrere Bands gleichzeitig.',
    'Direkt mit der Band weitersprechen.',
  ],
};

export type HochzeitOberpfalzGroup = {
  heading: string;
  bands: { slug: string }[];
};

export const hochzeitOberpfalzGroups: HochzeitOberpfalzGroup[] = [
  {
    heading: 'Trauung, Empfang und Essen',
    bands: [
      { slug: 'freunde-des-brautpaares' },
      { slug: 'claudia-und-ralph' },
      { slug: 'lebensgfuehl-duo' },
      { slug: 'sabrina-robold' },
    ],
  },
  {
    heading: 'Tanz am Abend: Bayrische Partybands',
    bands: [
      { slug: 'donnaweda' },
      { slug: 'otterbachtaler' },
      { slug: 'd-quertreiber' },
      { slug: 'sturschaedl-band' },
    ],
  },
  {
    heading: 'Tanz am Abend: Pop und Cover',
    bands: [
      { slug: 'whoobers' },
      { slug: 'sommerwind-band' },
      { slug: 'extra-die-band' },
      { slug: 'zechpreller-trio' },
    ],
  },
];

// Erste Section unter dem Kopf: Einstiegssatz, drei Phasen-Karten (springen zum
// passenden Bandbereich, Anker siehe HOCHZEIT_OBERPFALZ_GROUP_ANCHORS) und Schlusssatz.
export const hochzeitOberpfalzIntroSection = {
  lead: 'Zu jedem Moment eurer Hochzeit passt andere Musik.',
  phases: [
    {
      title: 'Vormittag',
      moments: 'Weißwurstfrühstück · Kirchenzug',
      music: 'Blasmusik für Weißwurstfrühstück und Kirchenzug',
      href: '#blasmusik',
    },
    {
      title: 'Trauung & Empfang',
      moments: 'Trauung · Auszug · Sektempfang',
      music: 'Akustikband oder Blasmusik',
      href: '#trauung-empfang-essen',
    },
    {
      title: 'Abend',
      moments: 'Abendessen · Brautentführung · Eröffnungstanz · Party',
      music: 'Partybands für Eröffnungstanz und Party',
      href: '#partybands',
    },
  ],
  closing: 'Jede Hochzeit läuft anders. Besprecht mit den Bands, was zu eurem Ablauf passt.',
};

// Sprungmarken der Bandbereiche (Schlüssel: Überschrift der Gruppe).
export const HOCHZEIT_OBERPFALZ_GROUP_ANCHORS: Record<string, string> = {
  'Trauung, Empfang und Essen': 'trauung-empfang-essen',
  'Blasmusik und Volksmusik für eure Hochzeit': 'blasmusik',
  'Tanz am Abend: Bayrische Partybands': 'partybands',
};

// Abschnitt Blasmusik und Volksmusik: Bandkarten wie in den anderen Gruppen.
export const hochzeitOberpfalzBlasmusik: HochzeitOberpfalzGroup = {
  heading: 'Blasmusik und Volksmusik für eure Hochzeit',
  bands: [
    { slug: 'dezent-boehmisch' },
    { slug: 'ruescherl-muse' },
    { slug: 'seubersdorfer-blasmusik' },
    { slug: 'broeslschmarrn-duo' },
  ],
};

export const hochzeitOberpfalzTips = {
  heading: 'Worauf es bei der Band ankommt',
  items: [
    {
      title: 'Die Band als Dienstleister',
      text: 'Eine Hochzeitsband sollte sich als Dienstleister für euren Tag verstehen. Das musikalische Handwerk muss sitzen! Entscheidend ist, dass sie euch und euren Gästen hilft, einen wunderbaren Hochzeitstag zu erleben.',
    },
    {
      title: 'Wünsche vorher klären',
      text: 'Klärt vorher, was ihr wollt: bayerische Partyband oder Pop und Cover, Brautentführung ja oder nein, ganzer Tag oder nur Abend.',
    },
    {
      title: 'Ablauf und Absprachen',
      text: 'Geht den Ablauf mit der Band gemeinsam durch. Zumeist ist 2 oder 3 Wochen vor der Hochzeit ein guter Zeitpunkt für so ein Hochzeitsgespräch, da sich normalerweise nicht mehr viel ändert. So erhält die Band alle passenden und wichtigen Infos.',
    },
  ],
};

export const hochzeitOberpfalzPrice = {
  heading: 'Was kostet eine Hochzeitsband?',
  text: 'Nach unseren Erfahrungen aus Anfragen liegen die Gagen zwischen rund 1.200 € und weit über 10.000 €. Die meisten Hochzeitsbands kosten etwa 3.000 bis 3.500 €, erfahrene und bekannte Bands aus der Region eher 5.000 bis 6.000 €. Den Preis bestimmen vor allem Bekanntheit und Erfahrung und natürlich die Spieldauer (ganzer Tag oder nur Party am Abend). Bitte die Band um ein Angebot, das alle Kosten enthält, auch die Anreise.',
  cards: [
    { label: 'Einstieg', value: 'ab rund 1.200 €', note: '' },
    { label: 'Die meisten Hochzeitsbands', value: 'etwa 3.000 bis 3.500 €', note: '' },
    {
      label: 'Erfahrene, bekannte Bands aus der Region',
      value: 'etwa 5.000 bis 6.000 €',
      note: 'Nach oben weit über 10.000 €.',
    },
  ],
};

export const hochzeitOberpfalzFaq = {
  heading: 'Häufige Fragen',
  items: [
    {
      question: 'Wie früh sollte man buchen?',
      answer:
        'Mindestens ein Jahr vorher. Location und Band gehören zu den ersten Dingen, die ihr fixieren solltet. Beliebte Bands, die auch Volksfeste und Kirwas spielen, sind im Sommer oft lange im Voraus vergeben.',
    },
    {
      question: 'Wie viele Stunden Musik sind üblich?',
      answer:
        'Wird ein ganzer Hochzeitstag angefragt, sind es in der Regel 10 bis 12 Stunden, von der Trauung bis in die Nacht. Viele Paare buchen auch nur die Party am Abend. Ihr könnt beide Varianten anfragen und die Preise vergleichen.',
    },
    {
      question: 'Was braucht die Band vor Ort?',
      answer:
        'Das hängt von Besetzung und Technik der Band ab. Klärt Platz, Bühne und Stromanschlüsse deshalb vorab mit der Band. Ist wenig Platz da, passt oft ein Duo oder Trio besser.',
    },
    {
      question: 'Wie läuft die Anfrage?',
      answer:
        'Du sammelst Bands mit dem Herz in der Merkliste, bis zu acht, und schickst eine Buchungsanfrage. Danach sprichst du direkt mit der Band. Frag gleich nach Trauung und Brautentführung. Mehrere Bands gleichzeitig anzufragen ist sinnvoll, denn nicht jede antwortet.',
    },
    {
      question: 'Brauche ich mit einer Band einen Vertrag?',
      answer:
        'Wir empfehlen es: Schließt einen schriftlichen Vertrag mit der Band oder lasst euch wenigstens die Eckdaten eurer Hochzeit (Termin, Ort, Spielzeiten, Gage) per Mail bestätigen. Kommt das nicht schon von der Band, fühlt es sich vielleicht komisch an, so etwas zu verlangen. Aber nur so haben alle Beteiligten die Sicherheit, dass am Hochzeitstag auch wirklich gemeinsam gefeiert wird.',
    },
  ],
};

export const hochzeitOberpfalzClosing = {
  heading: 'Gefällt dir eine Band? Merk sie dir.',
  text: 'Tippe bei einer Band auf das Herz. In deiner Merkliste sammelst du bis zu acht Bands, schickst eine Buchungsanfrage an alle gleichzeitig und sprichst danach direkt mit den Bands.',
};

// Bands der Auswahl, die in der übergebenen Menge aktiver Slugs vorkommen
// (Gruppen und Reihenfolge bleiben erhalten; leere Gruppen entfallen).
export function resolveHochzeitOberpfalzGroups(activeSlugs: ReadonlySet<string>): HochzeitOberpfalzGroup[] {
  return hochzeitOberpfalzGroups
    .map((g) => ({ ...g, bands: g.bands.filter((b) => activeSlugs.has(b.slug)) }))
    .filter((g) => g.bands.length > 0);
}

export function resolveHochzeitOberpfalzBlasmusik(activeSlugs: ReadonlySet<string>): HochzeitOberpfalzGroup | null {
  const bands = hochzeitOberpfalzBlasmusik.bands.filter((b) => activeSlugs.has(b.slug));
  return bands.length > 0 ? { ...hochzeitOberpfalzBlasmusik, bands } : null;
}

export function countHochzeitOberpfalzBands(groups: HochzeitOberpfalzGroup[]): number {
  return groups.reduce((n, g) => n + g.bands.length, 0);
}
