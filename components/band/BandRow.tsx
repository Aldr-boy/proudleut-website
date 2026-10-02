import type { ReactNode } from 'react';

type Props = {
  label: string;
  // 'accent': Label in Akzentfarbe (Hochzeit), sonst gedaempft.
  tone?: 'muted' | 'accent';
  // Label auf die Hoehe der ersten Pill-Zeile ruecken (Stil, Spielt bei).
  pillAligned?: boolean;
  // Element des Labels: Default <p>; 'h2' fuer Zeilen, die eine echte
  // Zwischenueberschrift bleiben sollen ("Mehr von [Band]", "Live").
  labelAs?: 'p' | 'h2';
  // Unsichtbarer Zusatz hinter dem sichtbaren Label (sr-only), damit die
  // Ueberschrift fuer Screenreader aussagekraeftig ist ("Live – Video von X").
  labelSrSuffix?: string;
  // Anker-Id der Zeile (z. B. "live"). Mit id bekommt die Zeile einen
  // scroll-margin-top, der unter der Faktenleiste endet: Header-Pill plus
  // Leiste (74 px) am Desktop, Header-Pill am Handy (dort liegt die Leiste
  // unten).
  id?: string;
  children: ReactNode;
};

// Zeile mit Label links und Inhalt rechts (Prototyp E, "Zeilenraster"): ab md
// Label 200 px + Inhalt, mobil Label ueber dem Inhalt. Die Trennlinie steht
// oberhalb jeder Zeile; die erste gerenderte Zeile hat weder Linie noch
// Oberabstand (first:), die letzte keinen Unterabstand (last:) -- entfallen
// Zeilen (null), entsteht dadurch keine Luecke und keine Linie ueber der
// ersten sichtbaren Zeile. Die Zeilen muessen direkte Geschwister im selben
// Container sein.
export function BandRow({
  label,
  tone = 'muted',
  pillAligned = false,
  labelAs = 'p',
  labelSrSuffix,
  id,
  children,
}: Props) {
  const Label = labelAs;
  return (
    <div
      id={id}
      className={`grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3 md:gap-10 py-6 md:py-7 border-t border-pl-soft first:border-t-0 first:pt-0 last:pb-0${
        id ? ' scroll-mt-nav md:scroll-mt-[calc(var(--pl-nav-height)+5rem)]' : ''
      }`}
    >
      <Label
        className={`text-xs font-bold uppercase tracking-[0.08em] ${pillAligned ? 'md:pt-2.5' : 'md:pt-0.5'} ${
          tone === 'accent' ? 'text-pl-accent-deep' : 'text-pl-text-muted'
        }`}
      >
        {label}
        {labelSrSuffix && <span className="sr-only"> {labelSrSuffix}</span>}
      </Label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
