import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getBandBySlug } from '@/lib/airtable/queries';

// ISR: Seite wird on-demand gecacht und alle 5 Minuten revalidiert.
// generateStaticParams wird erst in Phase 2 mit Rate-Limiting ergänzt.
export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function BandPage({ params }: Props) {
  const { slug } = await params;
  const band = await getBandBySlug(slug);

  if (!band) notFound();

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>
        Phase 1A – Technischer Durchstich
      </p>

      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{band.name}</h1>

      {band.category && (
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>{band.category}</p>
      )}

      {/* TEMPORÄR Phase 1A: Airtable-Attachment-URL – keine stabile Produktionslösung.
          Finale Bildstrategie wird nach erfolgreichem Durchstich entschieden. */}
      {band.heroImage && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', marginBottom: '1.5rem', background: '#111' }}>
          <Image
            src={band.heroImage.url}
            alt={band.heroImage.alt}
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>
      )}

      {band.shortDescription && (
        <p style={{ fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          {band.shortDescription}
        </p>
      )}

      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.4rem 1rem', marginBottom: '1.5rem' }}>
        {band.eventTypes.length > 0 && (
          <>
            <dt style={{ fontWeight: 600 }}>Veranstaltungstypen</dt>
            <dd style={{ margin: 0 }}>{band.eventTypes.join(', ')}</dd>
          </>
        )}
        {(band.location.city || band.location.state) && (
          <>
            <dt style={{ fontWeight: 600 }}>Region</dt>
            <dd style={{ margin: 0 }}>
              {[band.location.city, band.location.state].filter(Boolean).join(', ')}
            </dd>
          </>
        )}
        {band.websiteUrl && (
          <>
            <dt style={{ fontWeight: 600 }}>Website</dt>
            <dd style={{ margin: 0 }}>
              <a href={band.websiteUrl} target="_blank" rel="noopener noreferrer">
                {band.websiteUrl}
              </a>
            </dd>
          </>
        )}
      </dl>

      {band.description && (
        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Über die Band</h2>
          <p style={{ lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{band.description}</p>
        </section>
      )}
    </main>
  );
}
