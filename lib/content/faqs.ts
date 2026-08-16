export type FaqItem = { question: string; answer: string };
export type FaqGroup = { label: string; items: FaqItem[] };

export const faqGroups: FaqGroup[] = [
  {
    label: "proudleut verstehen",
    items: [
      {
        question: "Ist proudleut kostenlos?",
        answer:
          "Ja. proudleut ist kostenlos. Sprich ohne Gebühren, Provision oder Vermittlungskosten. proudleut soll helfen, gute Livebands sichtbarer zu machen und Veranstaltern die Suche zu erleichtern.",
      },
      {
        question: "Wer steckt hinter proudleut?",
        answer:
          "Ich bin Alexander Dressler, komme aus der Oberpfalz und arbeite seit Jahrzehnten mit Bands und Musikern. proudleut ist keine anonyme Datenbank, sondern ein persönlich aufgebautes Verzeichnis für Livebands.",
      },
      {
        question: "Wie läuft eine Anfrage ab?",
        answer:
          "Du findest eine Band, die zu deinem Event passt, und kontaktierst sie direkt über die Bandseite. Die Anfrage geht also ohne Umweg an die Band selbst.",
      },
    ],
  },
  {
    label: "Bandsuche starten",
    items: [
      {
        question: "Kann ich auch Hilfe bei der Bandsuche bekommen?",
        answer:
          "Klar. Wenn du nicht sicher bist, welche Band zu deinem Event passt, schreib mir einfach kurz, was du planst. Oft reichen ein paar Eckdaten: Anlass, Ort, Datum, Gästezahl und musikalische Richtung. Ich kann dir dann zwei oder drei Bands vorschlagen, die gut passen könnten.",
      },
      {
        question: "Wann sollte ich mit der Bandsuche beginnen?",
        answer:
          "So früh wie möglich ;). Bei Hochzeiten, Firmenfeiern und größeren Festen ist ein Jahr Vorlauf definitiv sinnvoll. Gute Bands sind häufig weit im Voraus gebucht, besonders an Samstagen und in der Hauptsaison.",
      },
      {
        question: "Was sollte ich vor der Bandsuche geklärt haben?",
        answer:
          "Hilfreich sind ein paar Grundfragen: Welcher Anlass ist es? Wie viele Gäste kommen? Gibt es schon eine Location? Soll die Musik eher im Hintergrund begleiten oder später die Tanzfläche füllen? Und natürlich: Welches Budget ist ungefähr eingeplant?",
      },
    ],
  },
  {
    label: "Gut vorbereitet buchen",
    items: [
      {
        question: "Worauf kommt es bei einer guten Hochzeitsband an?",
        answer:
          "Natürlich muss die Musik passen. Genauso wichtig ist aber, dass die Band versteht, wie besonders dieser Tag für euch ist. Eine gute Hochzeitsband denkt mit, bleibt entspannt und hilft dabei, dass Musik, Stimmung und Ablauf zusammenpassen.",
      },
      {
        question: "Sollte ich einen Vertrag mit der Band machen?",
        answer:
          "Ja, unbedingt. Ein Vertrag schafft Klarheit für beide Seiten: Termin, Spielzeit, Gage, Technik, Ablauf und besondere Absprachen sind sauber festgehalten. Mein Tipp: Geht einige Wochen vor dem Termin gemeinsam den Ablauf nochmal durch, dann gibt es am Veranstaltungstag weniger Überraschungen.",
      },
      {
        question: "Wie kommen Bands auf proudleut?",
        answer:
          "Wenn ihr als Band auf proudleut erscheinen möchtet, meldet euch einfach bei mir. Ich freue mich über jede gute Liveband, die das Verzeichnis bereichert. Mir ist nur wichtig, kurz persönlich mit euch zu sprechen, damit ich euch, euren Sound und passende Veranstaltungen gut einordnen kann.",
      },
    ],
  },
];
