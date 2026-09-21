import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo/metadata';

// Auftrag "Fehlende Canonicals vor dem Domain-Cutover beheben": app/ueber-
// mich/page.tsx gehoert zur bestehenden lokalen WIP und wird bewusst NICHT
// angefasst -- weder auf origin/main noch in der lokalen WIP-Fassung setzt
// die Seite ein eigenes `alternates`, daher greift dieses Segment-Layout
// additiv, ohne von der Seite ueberschrieben zu werden. Identisches
// Prinzip wie app/fuer-bands/layout.tsx.
export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl('/ueber-mich') },
};

// Reiner Passthrough ohne zusaetzliches DOM-Element -- keine sichtbare
// Layoutaenderung.
export default function UeberMichLayout({ children }: { children: React.ReactNode }) {
  return children;
}
