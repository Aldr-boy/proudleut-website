// Bewusste Abweichungen der oeffentlichen Darstellung einzelner Bandprofile
// von den Katalogdaten (Bandart, Stimmung, Ort, Besetzung), ohne den Katalog
// oder die Suche zu veraendern. Wirkt nur auf die Anzeige; die gespeicherten
// Zuordnungen (band_band_types, band_moods, locations) bleiben unveraendert und
// steuern weiter Suche, Filter und "Aehnliche Bands".
//
// Angewendet in lib/supabase/normalizeBand.ts. Neue Eintraege nur auf
// ausdruecklichen Wunsch der Band.

export type PublicProfileOverride = {
  // Bezeichnung im Profilkopf, Seitentitel, Link-Vorschau und JSON-LD (genre).
  // Bandkarten und Listen zeigen weiter die Katalog-Bandart.
  bandartLabel?: string;
  // Ort nirgends anzeigen (Profilkopf, Herkunft, Link-Vorschau, JSON-LD,
  // Bandkarten). Die Ortssuche arbeitet weiter mit dem gespeicherten Ort.
  hideLocation?: boolean;
  // Besetzung in der Faktenleiste (der Freitext aus der Datenbank waere dort
  // zu lang, siehe BESETZUNG_FALLBACK_MAX_LENGTH in lib/bands/bandFacts.ts).
  besetzungLabel?: string;
  // "Klingt nach" auf dem Profil; ersetzt nur die Anzeige, nicht band_moods.
  klingtNach?: string[];
};

export const PUBLIC_PROFILE_OVERRIDES: Record<string, PublicProfileOverride> = {
  '9to5': {
    bandartLabel: 'Live- und Showband',
    hideLocation: true,
    besetzungLabel: '1 bis 12 Musiker/innen + DJ-Services',
    klingtNach: [
      'Hochwertig & erfahren',
      'Konzertfeeling trifft Entertainment',
      'Generationenverbindend',
    ],
  },
};
