import Image from 'next/image';
import type { Band, BandDocument } from '@/lib/types/band';

type Props = { band: Band };

// Veranstalter-Unterlagen (z. B. PDF-Praesentation), eingebettet als
// flache, helle Dokumentkarte ueber die verfuegbare Inhaltsbreite ganz
// unten in "03 Die Band fuer euer Event?" (siehe BandTagsSection.tsx,
// Nachschaerfung Abschnitt 3: helle statt dunkle Karte, volle Breite statt
// halbe Spalte neben der Hochzeitskarte). 0 Dokumente: entfaellt
// vollstaendig, kein Platzhalter. 1 oder mehrere: dieselbe Kartenzeile,
// keine Sonderbehandlung nach Anzahl -- generisch fuer jede Band mit
// Unterlagen. Vorschau per object-contain, damit das Dokumentformat (z. B.
// Hochformat-PDF-Cover) nicht beschnitten wird. Auch die Beschreibung
// bleibt vollstaendig sichtbar, keine gekuerzte Textzeile.
export function BandDocumentsSection({ band }: Props) {
  const documents = band.documents;
  if (documents.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {documents.map((document) => (
        <DocumentCard key={document.id} document={document} />
      ))}
    </div>
  );
}

function DocumentCard({ document }: { document: BandDocument }) {
  return (
    <div className="bg-pl-elevated border border-pl-soft rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row gap-5 md:items-center">
      <div className="relative w-20 md:w-24 shrink-0 aspect-[3/4] mx-auto md:mx-0 rounded-lg overflow-hidden border border-pl-soft bg-pl-canvas">
        {document.thumbnailUrl ? (
          <Image
            src={document.thumbnailUrl}
            alt={`Vorschau: ${document.title}`}
            fill
            className="object-contain p-1.5"
            sizes="96px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <DocumentIcon />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 text-center md:text-left">
        <p className="text-[11px] font-semibold text-pl-accent-deep uppercase tracking-wider mb-1">
          {document.audienceLabel}
        </p>
        <p className="text-base font-bold text-pl-text leading-snug mb-1">{document.title}</p>
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
  );
}

function DocumentIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-pl-text-hint"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}
