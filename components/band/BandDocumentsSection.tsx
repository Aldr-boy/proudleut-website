import Image from 'next/image';
import type { Band, BandDocument } from '@/lib/types/band';

type Props = { band: Band };

// Veranstalter-Unterlagen (z. B. PDF-Praesentation), eingebettet als dunkle
// Karte in der rechten Spalte von "03 Die Band fuer euer Event?" (siehe
// BandTagsSection.tsx, finaler Entwurf: Festwirte-PDF-Karte neben der
// Hochzeitskarte). 0 Dokumente: entfaellt vollstaendig, kein Platzhalter.
// 1 oder mehrere: dieselbe kompakte Kartenzeile, keine Sonderbehandlung
// nach Anzahl -- generisch fuer jede Band mit Unterlagen. Vorschau per
// object-contain, damit das Dokumentformat (z. B. Hochformat-PDF-Cover)
// nicht beschnitten wird.
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
    <div className="bg-pl-stage rounded-2xl p-5 flex gap-4 items-center">
      <div className="relative w-16 shrink-0 aspect-[3/4] rounded overflow-hidden bg-pl-canvas/10">
        {document.thumbnailUrl ? (
          <Image
            src={document.thumbnailUrl}
            alt={`Vorschau: ${document.title}`}
            fill
            className="object-contain p-1.5"
            sizes="64px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <DocumentIcon />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold text-pl-accent-light uppercase tracking-wider mb-1">
          {document.audienceLabel}
        </p>
        <p className="text-sm font-bold text-pl-on-stage leading-snug mb-1">{document.title}</p>
        {document.description && (
          <p className="text-xs text-pl-on-stage-muted leading-relaxed mb-3 line-clamp-2">
            {document.description}
          </p>
        )}
        <a
          href={document.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-semibold bg-pl-paper text-pl-text hover:bg-white motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent-light"
        >
          Ansehen
        </a>
      </div>
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
      className="text-pl-on-stage-muted"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}
