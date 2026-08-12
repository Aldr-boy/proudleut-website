import Image from 'next/image';
import type { Band, BandDocument } from '@/lib/types/band';

type Props = { band: Band };

// Paket 2A -- Veranstalter-Unterlagen (z. B. PDF-Praesentation). 0 Dokumente:
// Section entfaellt vollstaendig, kein Platzhalter (Design-Soll 2d, Zustand
// 0). 1 Dokument: grosses Editorial-Feature (2a/2b). Mehrere: Kartenraster
// derselben Komponentenfamilie (2d), alle Karten gleichzeitig sichtbar --
// kein Durchblaetter-Widget, keine Reiter.
export function BandDocumentsSection({ band }: Props) {
  const documents = band.documents;
  if (documents.length === 0) return null;

  return (
    <section className="bg-pl-paper border-t border-pl-soft py-12 md:py-16 px-4 sm:px-6">
      <div className="pl-container-shell">
        {documents.length === 1 ? (
          <SingleDocumentFeature document={documents[0]} />
        ) : (
          <MultipleDocuments documents={documents} />
        )}
      </div>
    </section>
  );
}

function DocumentCover({ document, small }: { document: BandDocument; small?: boolean }) {
  return (
    <div
      className={`relative w-full ${small ? 'aspect-[3/4]' : 'aspect-[4/5] sm:aspect-[3/4]'}
                 rounded-xl overflow-hidden bg-pl-elevated border border-pl-soft`}
    >
      {document.thumbnailUrl ? (
        <Image
          src={document.thumbnailUrl}
          alt={`Cover: ${document.title}`}
          fill
          className={small ? 'object-contain p-2' : 'object-contain p-4'}
          sizes={small ? '96px' : '(min-width: 768px) 400px, 100vw'}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <DocumentIcon small={small} />
        </div>
      )}
    </div>
  );
}

function DocumentIcon({ small }: { small?: boolean }) {
  const size = small ? 28 : 48;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-pl-text-muted"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function DocumentEyebrowAndTitle({ document, compact }: { document: BandDocument; compact?: boolean }) {
  return (
    <>
      <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-1">
        {document.audienceLabel}
      </p>
      <h2 className={compact ? 'text-sm font-bold text-pl-text' : 'text-xl md:text-2xl font-bold text-pl-text'}>
        {document.title}
      </h2>
    </>
  );
}

function DocumentCtaLink({
  document,
  label,
  fullWidthMobile,
}: {
  document: BandDocument;
  label: string;
  fullWidthMobile?: boolean;
}) {
  return (
    <a
      href={document.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center px-6 py-3 rounded-full
                 text-sm font-semibold bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]
                 hover:bg-[var(--pl-accent-hover)] motion-safe:transition-colors
                 ${fullWidthMobile ? 'w-full sm:w-auto' : ''}`}
    >
      {label}
    </a>
  );
}

// Zustand 1 (Design-Soll 2a/2b): Paper-Feature mit Cover. Desktop: Cover
// links, Text rechts (2a). Mobile: Eyebrow/Titel zuerst, dann Cover, dann
// Beschreibung, dann CTA -- eigene Komposition, kein verkleinertes
// Desktop-Layout (2b).
function SingleDocumentFeature({ document }: { document: BandDocument }) {
  return (
    <div className="md:grid md:grid-cols-[400px_1fr] md:gap-10 lg:gap-14 md:items-center">
      <div className="md:hidden mb-5">
        <DocumentEyebrowAndTitle document={document} />
      </div>

      <DocumentCover document={document} />

      <div className="mt-6 md:mt-0">
        <div className="hidden md:block mb-3">
          <DocumentEyebrowAndTitle document={document} />
        </div>
        {document.description && (
          <p className="text-sm text-pl-text-muted leading-relaxed mb-6">{document.description}</p>
        )}
        <DocumentCtaLink document={document} label="Präsentation ansehen" fullWidthMobile />
      </div>
    </div>
  );
}

// Zustand mehrere (Design-Soll 2d): Kartenraster derselben Komponentenfamilie,
// klare Zielgruppen-Beschriftung je Karte, deterministisch sortiert (bereits
// durch lib/supabase/normalizeBand.ts erledigt). Standard-CTA "Ansehen".
function MultipleDocuments({ documents }: { documents: BandDocument[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-2">Unterlagen</p>
      <h2 className="text-xl md:text-2xl font-bold text-pl-text mb-8">Unterlagen für euer Event</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {documents.map(document => (
          <div key={document.id} className="bg-pl-elevated border border-pl-soft rounded-xl p-5 flex gap-4">
            <div className="w-20 shrink-0">
              <DocumentCover document={document} small />
            </div>
            <div className="flex flex-col min-w-0">
              <DocumentEyebrowAndTitle document={document} compact />
              {document.description && (
                <p className="text-xs text-pl-text-muted leading-relaxed mt-2 line-clamp-2">
                  {document.description}
                </p>
              )}
              <div className="mt-3">
                <DocumentCtaLink document={document} label="Ansehen" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
