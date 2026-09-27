// showOnHomepage: Eigenschaft des Inhalts, nicht der Darstellung -- steuert,
// ob eine Frage auf der Homepage-FAQ (components/homepage/FAQ.tsx) gezeigt
// wird. Der vollstaendige Fragenbestand bleibt unabhaengig davon hier
// erhalten und kann spaeter auf weiteren Seiten wiederverwendet werden.
export type FaqItem = { question: string; answer: string; showOnHomepage?: boolean };
export type FaqGroup = { label: string; items: FaqItem[] };

export const faqGroups: FaqGroup[] = [
  {
    label: "proudleut verstehen",
    items: [
      {
        question: "Ist proudleut kostenlos?",
        answer:
          "Ja. proudleut ist kostenlos. Sprich ohne Gebühren, Provision oder Vermittlungskosten. proudleut soll helfen, gute Livebands sichtbarer zu machen und Veranstaltern die Suche zu erleichtern.",
        showOnHomepage: true,
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
        showOnHomepage: true,
      },
      {
        question: "Wie kommen Bands auf proudleut?",
        answer:
          "Wenn ihr als Band auf proudleut erscheinen möchtet, meldet euch einfach bei mir. Ich freue mich über jede gute Liveband, die das Verzeichnis bereichert. Mir ist nur wichtig, kurz persönlich mit euch zu sprechen, damit ich euch, euren Sound und passende Veranstaltungen gut einordnen kann.",
        showOnHomepage: true,
      },
      {
        question: "Ich plane eine öffentliche Veranstaltung – was finde ich im Bandprofil?",
        answer:
          "Neben Stil, Anlässen, Fotos und Videos zeigen manche Bandprofile auch Social-Media- und Streaming-Zahlen: Follower auf Instagram und Facebook, Abonnenten auf YouTube sowie monatliche Hörer*innen auf Spotify, jeweils mit Stand. Hat eine Band eine Presse- und Booking-Info hinterlegt, findest du sie direkt im Profil als PDF. Diese Angaben können für Veranstalter interessant sein, etwa für Clubs, Festivals, Festwirte, Vereine oder Kulturämter.",
        showOnHomepage: true,
      },
      {
        question: "Sagen Social-Media- und Streaming-Zahlen etwas darüber aus, wie gut eine Band ist?",
        answer:
          "Nein. Sie geben einen Einblick in die Online-Präsenz, sagen aber nicht aus, wie gut eine Band live spielt oder ob sie zu einer Hochzeit oder Firmenfeier passt. Wenn eine Band eine Veranstaltung online mitbewerben soll, können die Zahlen ein zusätzlicher Anhaltspunkt sein. Sie sagen jedoch nicht voraus, wie viele Menschen tatsächlich kommen. Auch großartige Hochzeits- und Eventbands können online wenig sichtbar sein, wenn sie überwiegend auf privaten Festen spielen. Ob eine Band zu eurem Abend passt, zeigen Stil, Videos und Referenzen viel besser.",
        showOnHomepage: true,
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
        showOnHomepage: true,
      },
      {
        question: "Wann sollte ich mit der Bandsuche beginnen?",
        answer:
          "So früh wie möglich ;). Bei Hochzeiten, Firmenfeiern und größeren Festen ist ein Jahr Vorlauf definitiv sinnvoll. Gute Bands sind häufig weit im Voraus gebucht, besonders an Samstagen und in der Hauptsaison.",
        showOnHomepage: true,
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
    ],
  },
];
