import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo/metadata';

// Auftrag "Fehlende Canonicals vor dem Domain-Cutover beheben": app/fuer-
// bands/page.tsx gehoert zur bestehenden lokalen WIP und wird bewusst
// NICHT angefasst -- weder auf origin/main noch in der lokalen WIP-Fassung
// setzt die Seite ein eigenes `alternates`, daher greift dieses
// Segment-Layout additiv, ohne von der Seite ueberschrieben zu werden.
// Absichtlich kein eigenes title/description hier -- diese bleiben
// vollstaendig bei page.tsx, dieses Layout traegt ausschliesslich den
// Canonical.
export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl('/fuer-bands') },
};

// Reiner Passthrough ohne zusaetzliches DOM-Element -- keine sichtbare
// Layoutaenderung. /fuer-bands/band-vorstellen liegt ebenfalls unter
// diesem Segment und setzt deshalb bewusst eine eigene, self-referenzierende
// alternates.canonical (siehe dortige page.tsx), damit es nicht
// versehentlich den Canonical von /fuer-bands erbt.
export default function FuerBandsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
