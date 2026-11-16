// Optionaler redaktioneller Text unter den Bandkarten einer Anlassseite
// (/veranstaltung/<slug>). Eine weitere Anlassseite bekommt einen Text, indem
// unten in OCCASION_EDITORIAL ein Eintrag mit ihrem Slug (siehe
// lib/categories.ts) ergaenzt wird -- Aufbau wie bei weihnachtsfeier.
// Anlassseiten ohne Eintrag bleiben unveraendert. Gerendert von
// components/OccasionEditorial.tsx; keine strukturierten Daten.

export type EditorialBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] };

export type EditorialSection = {
  heading: string;
  blocks: EditorialBlock[];
};

export type EditorialFaq = {
  heading: string;
  items: { question: string; answer: string }[];
};

export type OccasionEditorial = {
  sections: EditorialSection[];
  faq?: EditorialFaq;
};

const weihnachtsfeier: OccasionEditorial = {
  sections: [
    {
      heading: 'Band statt DJ: Livemusik für eure Weihnachtsfeier',
      blocks: [
        {
          type: 'p',
          text: 'Viele Firmen hatten jahrelang einen DJ und wollen etwas Neues. Eine Liveband bringt eine andere Stimmung in den Raum: Die Leute schauen hin, singen mit und kommen auf die Tanzfläche.',
        },
        {
          type: 'p',
          text: 'Die meisten Weihnachtsfeiern laufen ähnlich ab: Programm am Nachmittag, gemeinsames Essen, danach wird gefeiert. Für diesen letzten Teil ist eine Partyband gemacht, mit Rock, Pop und Klassikern, die vom Azubi bis zur Geschäftsführung alle kennen.',
        },
        {
          type: 'p',
          text: 'Wenn ihr auch zum Empfang oder Essen Musik wollt, passt ein Duo oder Trio. Manche Bands können beides. Fragt gezielt danach.',
        },
      ],
    },
    {
      heading: 'Das gehört in eure Anfrage',
      blocks: [
        { type: 'p', text: 'Je genauer die Eckdaten, desto schneller bekommt ihr ein passendes Angebot:' },
        {
          type: 'ul',
          items: [
            'Termin, auch wenn er noch nicht ganz feststeht',
            'Ort oder Location, zum Beispiel Hotel, Gasthaus oder Firmengelände',
            'Anzahl der Gäste und Altersmischung',
            'Ablauf des Abends und gewünschte Spielzeit',
            'Musikrichtung, die euch vorschwebt',
            'Budget, falls es einen Rahmen gibt',
            'Technik: Gibt es vor Ort schon eine Musikanlage, oder bringt die Band alles mit? Soll sie auch für Reden zur Verfügung stehen?',
          ],
        },
      ],
    },
    {
      heading: 'Was kostet eine Band für die Weihnachtsfeier?',
      blocks: [
        {
          type: 'p',
          text: 'Bei Weihnachtsfeiern liegen die Gagen im üblichen Rahmen, anders als etwa an Silvester. Nach unseren Erfahrungen:',
        },
        {
          type: 'ul',
          items: [
            'Solomusiker und Duos: etwa 800 bis 2.500 €, je nach Auftrittsdauer',
            'Die meisten Bands: rund 2.500 bis 3.500 €',
            'Regional bekannte Bands: etwa 4.000 bis 6.000 €',
            'Überregional bekannte Livebands: bis zu 25.000 €',
          ],
        },
        {
          type: 'p',
          text: 'Holt euch ein Angebot, das alle Kosten enthält: Anreise, Technik und, falls nötig, die Hotelübernachtung der Band.',
        },
      ],
    },
  ],
  faq: {
    heading: 'Häufige Fragen',
    items: [
      {
        question: 'Wie früh sollten wir anfragen?',
        answer:
          'Am besten im Sommer. November und Dezember sind für viele Bands ruhige Monate, die Chancen stehen also gut. Sehr kurzfristige Anfragen sind trotzdem schwer umzusetzen. Zwei oder drei Wochen vorher klappt es manchmal noch. Fragt dann gleich mehrere passende Bands an. So erfahrt ihr, wer Zeit hat, bekommt ein Gefühl für die Gagen und könnt euer Budget bei Bedarf anpassen.',
      },
      {
        question: 'Geht auch ein Termin unter der Woche?',
        answer:
          'In der Regel ja. Berufsmusiker freuen sich über Auftritte unter der Woche. Bei Bands, deren Musiker tagsüber in anderen Berufen arbeiten, spricht meist auch nichts dagegen. Es braucht nur etwas mehr Abstimmung.',
      },
      {
        question: 'Wie lange spielt eine Band?',
        answer:
          'Das hängt von der Band ab. Eine Partyband spielt am Abend oft bis zu fünf Stunden. Bands, die eher konzertant spielen, kommen auf zwei bis drei Stunden. Dann lohnt sich ein zweiter Act für den Rest des Abends.',
      },
      {
        question: 'Muss die Band Weihnachtslieder spielen?',
        answer:
          'Nicht zwingend. Die meisten Firmen wollen einen stimmungsvollen, ausgelassenen Abend, um das Jahr gemeinsam abzuschließen.',
      },
      {
        question: 'Wie läuft die Anfrage?',
        answer:
          'Merkt euch bis zu acht Bands auf der Merkliste und schickt eine gemeinsame Anfrage. Alles Weitere stimmt ihr direkt mit den Bands ab.',
      },
    ],
  },
};

export const OCCASION_EDITORIAL: Record<string, OccasionEditorial> = {
  weihnachtsfeier,
};

export function getOccasionEditorial(slug: string): OccasionEditorial | undefined {
  return OCCASION_EDITORIAL[slug];
}
