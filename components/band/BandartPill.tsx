// Pill mit der primaeren Bandart oben links im Kartenbild (BandCard,
// AuswahlBandCard), gegenueber vom Merk-Herz. Muss in einem Container mit
// position: relative liegen. Ohne Primaerart wird nichts gerendert.
export function BandartPill({ name }: { name?: string }) {
  if (!name) return null;
  return (
    <span
      className="absolute top-2.5 left-2.5 z-10 h-9 max-w-[calc(100%-5rem)] inline-flex items-center px-3
                 rounded-full bg-pl-elevated text-pl-text text-xs font-semibold shadow-pl-photo
                 border border-pl-soft"
    >
      <span className="truncate">{name}</span>
    </span>
  );
}
