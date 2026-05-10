import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getBandBySlug } from '@/lib/airtable/queries';
import { generateBandJsonLd } from '@/lib/seo/jsonLd';
import type { Metadata } from 'next';

// ISR: Seiten werden on-demand gecacht und alle 5 Minuten revalidiert.
// generateStaticParams wird erst in Phase 2 mit Rate-Limiting ergänzt.
export const revalidate = 300;

// --- SEO: Dynamische Metadaten ---

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const band = await getBandBySlug(slug);
  if (!band) return {};

  return {
    title: `${band.name} – proudleut.com`,
    description: band.metaDescription || band.shortDescription || `${band.name} bei proudleut`,
  };
}

// --- Page ---

export default async function BandPage({ params }: PageProps) {
  const { slug } = await params;
  const band = await getBandBySlug(slug);

  if (!band) notFound();

  const jsonLd = generateBandJsonLd(band);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-12 max-w-3xl mx-auto">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Durchstich-Hinweis */}
      <div className="mb-8 p-3 bg-amber-900/30 border border-amber-700/50 rounded text-amber-200 text-sm">
        Technischer Durchstich – kein finales Design. Ziel: Datenfluss prüfen.
      </div>

      {/* Hero-Bild */}
      {band.heroImage && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-8">
          <Image
            src={band.heroImage.url}
            alt={band.heroImage.alt}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      )}

      {/* Bandname + Kategorie */}
      <h1 className="text-3xl font-bold mb-2">{band.name}</h1>
      {band.category && (
        <p className="text-neutral-400 mb-6">{band.category}</p>
      )}

      {/* Kurztext */}
      {band.shortDescription && (
        <p className="text-lg text-neutral-300 mb-6">{band.shortDescription}</p>
      )}

      {/* Beschreibung */}
      {band.description && (
        <div className="prose prose-invert max-w-none mb-8">
          <p className="whitespace-pre-line">{band.description}</p>
        </div>
      )}

      {/* Location */}
      {band.location.city && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Standort</h2>
          <p className="text-neutral-300">
            {[band.location.city, band.location.district, band.location.state]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </section>
      )}

      {/* Event-Typen */}
      {band.eventTypes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Veranstaltungstypen</h2>
          <div className="flex flex-wrap gap-2">
            {band.eventTypes.map((type) => (
              <span
                key={type}
                className="px-3 py-1 bg-neutral-800 rounded-full text-sm text-neutral-300"
              >
                {type}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Referenz-Events */}
      {band.referenceEvents.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Referenzen</h2>
          <ul className="space-y-1 text-neutral-300">
            {band.referenceEvents.map((ev, i) => (
              <li key={i}>
                {ev.eventName}
                {ev.city && ` · ${ev.city}`}
                {ev.year && ` (${ev.year})`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Hochzeits-Info */}
      {band.weddingInfo?.weddingDescription && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Hochzeit</h2>
          <p className="text-neutral-300 whitespace-pre-line">
            {band.weddingInfo.weddingDescription}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-neutral-400">
            {band.weddingInfo.bandSize && (
              <span>Bandgröße: {band.weddingInfo.bandSize}</span>
            )}
            {band.weddingInfo.feeRange && (
              <span>Gage: {band.weddingInfo.feeRange}</span>
            )}
            {band.weddingInfo.moderation !== null && (
              <span>Moderation: {band.weddingInfo.moderation ? 'Ja' : 'Nein'}</span>
            )}
            {band.weddingInfo.kidnappingBride !== null && (
              <span>Brautentführung: {band.weddingInfo.kidnappingBride ? 'Ja' : 'Nein'}</span>
            )}
          </div>
        </section>
      )}

      {/* Social Links */}
      {Object.values(band.socialLinks).some(Boolean) && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Social Media</h2>
          <div className="flex gap-4 text-sm">
            {band.socialLinks.instagram && (
              <a href={band.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                Instagram
              </a>
            )}
            {band.socialLinks.facebook && (
              <a href={band.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                Facebook
              </a>
            )}
            {band.socialLinks.spotify && (
              <a href={band.socialLinks.spotify} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                Spotify
              </a>
            )}
            {band.socialLinks.youtube && (
              <a href={band.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                YouTube
              </a>
            )}
          </div>
        </section>
      )}

      {/* Website */}
      {band.websiteUrl && (
        <section className="mb-8">
          <a
            href={band.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-5 py-2 bg-purple-700 hover:bg-purple-600 rounded text-white transition-colors"
          >
            Band-Website besuchen →
          </a>
        </section>
      )}

      {/* Ähnliche Bands (nur Namen, ohne Links – Durchstich) */}
      {(band.similarBands.manual1 || band.similarBands.manual2 || band.similarBands.manual3) && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Ähnliche Bands</h2>
          <p className="text-neutral-300">
            {[band.similarBands.manual1, band.similarBands.manual2, band.similarBands.manual3]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </section>
      )}

      {/* Gallery (erste 4 Bilder) */}
      {band.gallery.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Galerie</h2>
          <div className="grid grid-cols-2 gap-3">
            {band.gallery.slice(0, 4).map((img, i) => (
              <div key={i} className="relative aspect-video rounded overflow-hidden">
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 384px"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Debug: JSON-LD Vorschau */}
      <details className="mt-12 text-xs text-neutral-500">
        <summary className="cursor-pointer hover:text-neutral-300">
          JSON-LD Debug-Vorschau
        </summary>
        <pre className="mt-2 p-4 bg-neutral-900 rounded overflow-x-auto">
          {JSON.stringify(jsonLd, null, 2)}
        </pre>
      </details>
    </main>
  );
}
