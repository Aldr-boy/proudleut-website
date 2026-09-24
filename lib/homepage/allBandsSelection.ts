// Reine Hilfsfunktionen fuer die "Alle Bands"-Pill (Auftrag "Alle-Bands-
// Pill"): die Startseite (app/page.tsx) ist ISR-gecacht (revalidate =
// 300) -- eine serverseitig berechnete "zufaellige" Auswahl waere in
// Wirklichkeit nur zufaellig pro Cache-Generierung, nicht pro Seitenaufruf
// (siehe historisches Math.random()-Verhalten von
// components/homepage/BandGrid.tsx, das genau deshalb clientseitig nach
// dem Mount neu mischt). AuswahlSection.tsx uebernimmt dasselbe Prinzip:
// einmal pro Mount mischen (shuffleBands), danach rein clientseitig aus
// der gemischten Reihenfolge filtern/schneiden (selectAllBandsCards) --
// kein erneutes Mischen bei jedem Mood-Filter-Klick.
//
// Bewusst ohne "@/"-Import von bandMatchesMood (relativer Import statt
// Alias), damit diese Datei wie lib/homepage/bandRotation.ts direkt per
// `node --test` importierbar bleibt.
import { bandMatchesMood } from '../moods/bandMoodFilter.ts';

export function shuffleBands<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function selectAllBandsCards<T extends { moods: { slug: string }[] }>(
  shuffledPool: T[],
  selectedMoodSlug: string | null,
  count: number,
): T[] {
  return shuffledPool.filter((band) => bandMatchesMood(band.moods, selectedMoodSlug)).slice(0, count);
}
