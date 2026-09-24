// Reine Hilfsfunktion fuer die "Alle Bands"-Pill (Auftrag "Alle-Bands-
// Pill"): ermittelt die meistverwendeten "Klingt nach"-Moods ueber ALLE
// uebergebenen Baender, statt einer fest kuratierten 4er-Liste wie bei den
// bestehenden Anlass-Tabs (siehe eventTypeTabs.ts). Bewusst ohne "@/"-
// Importe gehalten, damit die Datei wie lib/homepage/bandRotation.ts
// direkt per `node --test` importierbar bleibt.
type MoodLike = { slug: string; name: string };

// Zaehlt jeden Mood-Slug pro Band hoechstens einmal (ueber ein Set), auch
// falls band.moods versehentlich einen Slug doppelt enthaelt -- verhindert,
// dass ein einzelnes fehlerhaftes Banddaten-Objekt die Haeufigkeit verzerrt.
export function computeMostFrequentMoods(
  bands: { moods: MoodLike[] }[],
  count: number,
): MoodLike[] {
  const entries = new Map<string, { mood: MoodLike; count: number }>();

  for (const band of bands) {
    const uniqueSlugsForBand = new Set(band.moods.map((mood) => mood.slug));
    for (const slug of uniqueSlugsForBand) {
      const mood = band.moods.find((m) => m.slug === slug)!;
      const existing = entries.get(slug);
      if (existing) {
        existing.count += 1;
      } else {
        entries.set(slug, { mood, count: 1 });
      }
    }
  }

  // Stabiler Tie-Breaker bei gleicher Haeufigkeit: alphabetisch nach Slug,
  // damit die Reihenfolge bei Gleichstand nicht von der Map-Iterationsreihen-
  // folge (= Erstauftreten in den Banddaten) abhaengt.
  return [...entries.values()]
    .sort((a, b) =>
      b.count !== a.count ? b.count - a.count : a.mood.slug.localeCompare(b.mood.slug)
    )
    .slice(0, count)
    .map((entry) => entry.mood);
}
