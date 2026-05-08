import { getBands } from '@/lib/airtable/queries';

export const revalidate = 300;

export default async function BandsPage() {
  const bands = await getBands();

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>
        Phase 1B – Technischer Durchstich
      </p>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>
        Alle Bands ({bands.length})
      </h1>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {bands.map((band) => (
          <li key={band.slug} style={{ borderBottom: '1px solid #eee', padding: '0.75rem 0' }}>
            <a
              href={`/band/${band.slug}`}
              style={{ fontWeight: 600, textDecoration: 'none', color: '#000' }}
            >
              {band.name}
            </a>
            {band.location.city && (
              <span style={{ color: '#888', marginLeft: '0.75rem', fontSize: '0.9rem' }}>
                {band.location.city}
              </span>
            )}
            {band.shortDescription && (
              <p style={{ margin: '0.25rem 0 0', color: '#555', fontSize: '0.9rem' }}>
                {band.shortDescription}
              </p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
