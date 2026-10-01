import Image from 'next/image';
import type { Band, BandDocument } from '@/lib/types/band';
import { BandRow } from './BandRow';

type Props = { band: Band };

// Veranstalter-Unterlagen (z. B. PDF-Praesentation) als Zeile im Zeilenraster
// von BandTagsSection.tsx (Prototyp E): Label links ist document.audienceLabel
// (je Dokument eine Zeile), rechts eine helle, dezent umrandete Dokumentkarte.
// 0 Dokumente: entfaellt vollstaendig, kein Platzhalter. 1 oder mehrere:
// dieselbe Kartenzeile, keine Sonderbehandlung nach Anzahl -- generisch fuer
// jede Band mit Unterlagen. Vorschau per object-contain, damit das
// Dokumentformat (z. B. Hochformat-PDF-Cover) nicht beschnitten wird; ohne
// Vorschaubild steht ein "PDF"-Kaestchen. Auch die Beschreibung bleibt
// vollstaendig sichtbar, keine gekuerzte Textzeile.
export function BandDocumentsSection({ band }: Props) {
  const documents = band.documents;
  if (documents.length === 0) return null;

  return (
    <>
      {documents.map((document) => (
        <DocumentCard key={document.id} document={document} />
      ))}
    </>
  );
}

function DocumentCard({ document }: { document: BandDocument }) {
  return (
    <BandRow label={document.audienceLabel}>
      <div className="bg-pl-elevated border border-pl-soft rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row gap-5 md:items-center">
        <div className="relative w-16 md:w-20 shrink-0 aspect-[3/4] mx-auto md:mx-0 rounded-lg overflow-hidden border border-pl-soft bg-pl-canvas">
          {document.thumbnailUrl ? (
            <Image
              src={document.thumbnailUrl}
              alt={`Vorschau: ${document.title}`}
              fill
              className="object-contain p-1.5"
              sizes="80px"
            />
          ) : (
            <DocumentIcon />
          )}
        </div>
        <div className="min-w-0 flex-1 text-center md:text-left">
          <p className="text-lg font-extrabold text-pl-text leading-snug mb-1">{document.title}</p>
          {document.description && (
            <p className="text-sm text-pl-text-muted leading-relaxed">
              {document.description}
            </p>
          )}
        </div>
        <a
          href={document.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold border border-pl-soft text-pl-text hover:border-pl-accent hover:text-pl-accent motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent"
        >
          PDF ansehen
        </a>
      </div>
    </BandRow>
  );
}

// Fallback ohne Vorschaubild: "PDF"-Kaestchen wie in Prototyp E.
function DocumentIcon() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-pl-text text-pl-paper text-xs font-extrabold tracking-[0.06em]">
      PDF
    </div>
  );
}
