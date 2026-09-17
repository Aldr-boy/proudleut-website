type Props = {
  number: string;
  title: string;
  variant?: 'light' | 'dark';
};

// Gemeinsame Kapitelueberschrift fuer "01"/"02"/"03" (Auftrag
// "Bandseiten-Nachschaerfung", Abschnitt 2): Nummer und Titel in einer
// Zeile, Nummer untergeordnet im bestehenden Akzent, Titel deutlich
// praesenter als zuvor, darunter eine feine Trennlinie ueber die
// Inhaltsbreite. "light" fuer Papier-/Leinwandflaechen (01/03), "dark"
// fuer die Buehnenflaeche (02). Bleibt semantisch <h2> -- der Bandname in
// BandHero.tsx ist die einzige <h1> der Seite.
export function BandChapterHeading({ number, title, variant = 'light' }: Props) {
  const isDark = variant === 'dark';

  return (
    <div
      className={`mb-8 md:mb-10 flex items-baseline gap-3 pb-4 md:pb-5 border-b ${
        isDark ? 'border-white/10' : 'border-pl-soft'
      }`}
    >
      <span
        aria-hidden="true"
        className={`shrink-0 text-sm md:text-base font-semibold ${
          isDark ? 'text-pl-accent-light' : 'text-pl-accent-deep'
        }`}
      >
        {number}
      </span>
      <h2
        className={`min-w-0 flex-1 text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight ${
          isDark ? 'text-pl-on-stage' : 'text-pl-text'
        }`}
      >
        {title}
      </h2>
    </div>
  );
}
