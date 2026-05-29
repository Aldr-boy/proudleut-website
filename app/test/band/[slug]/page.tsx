export const dynamic = 'force-dynamic'

import { getBandFromSupabase } from '@/lib/supabase/queries'
import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand'
import { BandHero } from '@/components/band/BandHero'
import { HeroCTA } from '@/components/band/HeroCTA'
import { BandTagsSection } from '@/components/band/BandTagsSection'
import { BandVideoSection } from '@/components/band/BandVideoSection'
import { BandDescription } from '@/components/band/BandDescription'
import { BandReferenceEvents } from '@/components/band/BandReferenceEvents'
import { BandSocialIndex } from '@/components/band/BandSocialIndex'
import { BandGallery } from '@/components/band/BandGallery'
import { BandWeddingModule } from '@/components/band/BandWeddingModule'
import { BandContactSection } from '@/components/band/BandContactSection'

interface Props {
  params: Promise<{ slug: string }>
}

type Row = Record<string, unknown>

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function safeUrl(raw?: string): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.protocol === 'javascript:') return null
    return u.href
  } catch {
    return null
  }
}

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    let id: string | null = null
    if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1).split('?')[0]
    } else if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') {
        id = u.searchParams.get('v')
      } else if (u.pathname.startsWith('/embed/')) {
        id = u.pathname.replace('/embed/', '').split('?')[0]
      } else if (u.pathname.startsWith('/shorts/')) {
        id = u.pathname.replace('/shorts/', '').split('?')[0]
      }
    }
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null
    return `https://www.youtube-nocookie.com/embed/${id}`
  } catch {
    return null
  }
}

export default async function SupabaseTestPage({ params }: Props) {
  const { slug } = await params
  const { data, error } = await getBandFromSupabase(slug)

  if (error || !data) {
    return (
      <main style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: '960px' }}>
        <h1>Supabase Test – /test/band/{slug}</h1>
        <p style={{ color: 'red' }}>Fehler beim Laden der Band-Daten:</p>
        <pre style={{ background: '#fff0f0', color: '#333', padding: '1rem', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
          {JSON.stringify(error, null, 2)}
        </pre>
      </main>
    )
  }

  const band = data as Row
  const normalizedBand = normalizeBandFromSupabase(data)
  const embedUrl = getYouTubeEmbedUrl(normalizedBand.youtubeVideoUrl)
  const websiteUrl = safeUrl(normalizedBand.websiteUrl)

  const profiles = asArray<Row>(band.band_profiles as Row | Row[] | null)
  const contacts = asArray<Row>(band.band_contacts as Row | Row[] | null)
  const location = band.locations as Row | null
  const mediaAssets = asArray<Row>(band.media_assets as Row | Row[] | null)
  const videos = asArray<Row>(band.videos as Row | Row[] | null)
  const socialProfiles = asArray<Row>(band.social_profiles as Row | Row[] | null)
  const referenceEvents = asArray<Row>(band.reference_events as Row | Row[] | null)
  const bandEventTypes = asArray<Row>(band.band_event_types as Row | Row[] | null)
  const bandBandTypes = asArray<Row>(band.band_band_types as Row | Row[] | null)
  const bandLineups = asArray<Row>(band.band_lineups as Row | Row[] | null)
  const bandSoundWorlds = asArray<Row>(band.band_sound_worlds as Row | Row[] | null)
  const bandMoods = asArray<Row>(band.band_moods as Row | Row[] | null)
  const bandServices = asArray<Row>(band.band_services as Row | Row[] | null)
  const bandRelations = asArray<Row>(band.band_relations as Row | Row[] | null)

  const heroAssets = mediaAssets.filter((a) => (a.asset_type as string) === 'hero')
  const thumbnailAssets = mediaAssets.filter((a) => (a.asset_type as string) === 'thumbnail')
  const galleryAssets = mediaAssets.filter((a) => (a.asset_type as string) === 'gallery')

  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: '960px', lineHeight: '1.6' }}>
      <h1 style={{ borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>
        Supabase Debug – /test/band/{slug}
      </h1>

      {/* 0. Normalisiertes Band-Objekt */}
      <section style={{ marginTop: '2rem', background: '#e8f5e9', padding: '1rem', borderRadius: '4px' }}>
        <h2>0. Normalisiertes Band-Objekt (normalizeBandFromSupabase)</h2>
        <pre style={{ background: '#f1f8f1', color: '#333', padding: '1rem', whiteSpace: 'pre-wrap', overflowX: 'auto', fontSize: '0.75rem' }}>
          {JSON.stringify(normalizedBand, null, 2)}
        </pre>
      </section>

      {/* 0b. Komponenten-Vorschau */}
      <section style={{ marginTop: '2rem', borderTop: '3px solid #555', paddingTop: '1rem' }}>
        <h2>0b. Komponenten-Vorschau (Supabase → normalizeBandFromSupabase)</h2>
        <p style={{ color: '#555', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Die bestehenden Band-Komponenten rendern mit dem Supabase-normalisierten Band-Objekt — kein Airtable.
        </p>
      </section>
      <article className="bg-pl-canvas">
        <BandHero band={normalizedBand} />
        <HeroCTA name={normalizedBand.name} slug={normalizedBand.slug} eventTypes={normalizedBand.eventTypes} />
        <BandTagsSection band={normalizedBand} />
        <BandVideoSection embedUrl={embedUrl} bandName={normalizedBand.name} />
        <BandDescription band={normalizedBand} />
        {(() => {
          const hasReferenceEvents = normalizedBand.referenceEvents.length > 0
          const s = normalizedBand.socialMediaStats
          const hasSocialStats = !!(s?.igFollowers || s?.fbFollowers || s?.ytSubscribers)
          const both = hasReferenceEvents && hasSocialStats
          if (!hasReferenceEvents && !hasSocialStats) return null
          return (
            <section className="bg-pl-stage">
              <BandReferenceEvents band={normalizedBand} compactBottom={both} />
              {both && <div className="border-t border-white/10" />}
              <BandSocialIndex band={normalizedBand} compactTop={both} />
            </section>
          )
        })()}
        <BandGallery band={normalizedBand} />
        <BandWeddingModule band={normalizedBand} />
        <BandContactSection band={normalizedBand} websiteUrl={websiteUrl} />
      </article>

      {/* 1. Band-Kern */}
      <section style={{ marginTop: '2rem' }}>
        <h2>1. Band-Kern</h2>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {(['id', 'name', 'slug', 'status', 'created_at', 'updated_at'] as string[]).map((key) => (
              <tr key={key}>
                <td style={{ border: '1px solid #ccc', padding: '0.25rem 0.5rem', fontWeight: 'bold', width: '200px' }}>{key}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.25rem 0.5rem' }}>{String(band[key] ?? '–')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 2. Profil */}
      <section style={{ marginTop: '2rem' }}>
        <h2>2. Profil (band_profiles) – {profiles.length} Einträge</h2>
        {profiles.length === 0 ? <p>–</p> : profiles.map((p, i) => (
          <pre key={i} style={{ background: '#f5f5f5', color: '#333', padding: '1rem', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
            {JSON.stringify(p, null, 2)}
          </pre>
        ))}
      </section>

      {/* 3. Kontakt */}
      <section style={{ marginTop: '2rem' }}>
        <h2>3. Kontakt (band_contacts) – {contacts.length} Einträge</h2>
        {contacts.length === 0 ? <p>–</p> : contacts.map((c, i) => (
          <pre key={i} style={{ background: '#f5f5f5', color: '#333', padding: '1rem', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
            {JSON.stringify(c, null, 2)}
          </pre>
        ))}
      </section>

      {/* 4. Standort */}
      <section style={{ marginTop: '2rem' }}>
        <h2>4. Standort (locations)</h2>
        {!location ? <p>–</p> : (
          <pre style={{ background: '#f5f5f5', color: '#333', padding: '1rem', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
            {JSON.stringify(location, null, 2)}
          </pre>
        )}
      </section>

      {/* 5. Bandarten */}
      <section style={{ marginTop: '2rem' }}>
        <h2>5. Bandarten (band_band_types) – {bandBandTypes.length} Einträge</h2>
        {bandBandTypes.length === 0 ? <p>–</p> : (
          <ul>
            {bandBandTypes.map((bt, i) => {
              const t = bt.band_types as Record<string, unknown> | null
              return <li key={i}>{t ? `${String(t.name ?? '?')} (slug: ${String(t.slug ?? '?')})` : JSON.stringify(bt)}</li>
            })}
          </ul>
        )}
      </section>

      {/* 6. Eventtypen */}
      <section style={{ marginTop: '2rem' }}>
        <h2>6. Eventtypen (band_event_types) – {bandEventTypes.length} Einträge</h2>
        {bandEventTypes.length === 0 ? <p>–</p> : (
          <ul>
            {bandEventTypes.map((et, i) => {
              const t = et.event_types as Record<string, unknown> | null
              return <li key={i}>{t ? `${String(t.name ?? '?')} (slug: ${String(t.slug ?? '?')})` : JSON.stringify(et)}</li>
            })}
          </ul>
        )}
      </section>

      {/* 7. Lineup */}
      <section style={{ marginTop: '2rem' }}>
        <h2>7. Lineup (band_lineups) – {bandLineups.length} Einträge</h2>
        {bandLineups.length === 0 ? <p>–</p> : (
          <ul>
            {bandLineups.map((bl, i) => {
              const l = bl.lineups as Record<string, unknown> | null
              return <li key={i}>{l ? String(l.name ?? JSON.stringify(l)) : JSON.stringify(bl)}</li>
            })}
          </ul>
        )}
      </section>

      {/* 8. Klangwelten */}
      <section style={{ marginTop: '2rem' }}>
        <h2>8. Klangwelten (band_sound_worlds) – {bandSoundWorlds.length} Einträge</h2>
        {bandSoundWorlds.length === 0 ? <p>–</p> : (
          <ul>
            {bandSoundWorlds.map((sw, i) => {
              const s = sw.sound_worlds as Record<string, unknown> | null
              return <li key={i}>{s ? String(s.name ?? JSON.stringify(s)) : JSON.stringify(sw)}</li>
            })}
          </ul>
        )}
      </section>

      {/* 9. Moods */}
      <section style={{ marginTop: '2rem' }}>
        <h2>9. Moods (band_moods) – {bandMoods.length} Einträge</h2>
        {bandMoods.length === 0 ? <p>–</p> : (
          <ul>
            {bandMoods.map((bm, i) => {
              const m = bm.moods as Record<string, unknown> | null
              return <li key={i}>{m ? String(m.name ?? JSON.stringify(m)) : JSON.stringify(bm)}</li>
            })}
          </ul>
        )}
      </section>

      {/* 10. Services */}
      <section style={{ marginTop: '2rem' }}>
        <h2>10. Services (band_services) – {bandServices.length} Einträge</h2>
        {bandServices.length === 0 ? <p>–</p> : (
          <ul>
            {bandServices.map((bs, i) => {
              const s = bs.services as Record<string, unknown> | null
              return <li key={i}>{s ? String(s.name ?? JSON.stringify(s)) : JSON.stringify(bs)}</li>
            })}
          </ul>
        )}
      </section>

      {/* 11. Medien */}
      <section style={{ marginTop: '2rem' }}>
        <h2>11. Medien (media_assets) – {mediaAssets.length} Einträge total</h2>
        {mediaAssets.length === 0 && <p>–</p>}

        {heroAssets.length > 0 && (
          <>
            <h3>Hero ({heroAssets.length})</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {heroAssets.map((a, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={String(a.url ?? '')} alt={String(a.alt_text ?? 'hero')}
                  style={{ maxHeight: '200px', maxWidth: '300px', objectFit: 'cover', border: '1px solid #ccc' }} />
              ))}
            </div>
          </>
        )}

        {thumbnailAssets.length > 0 && (
          <>
            <h3>Thumbnail ({thumbnailAssets.length})</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {thumbnailAssets.map((a, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={String(a.url ?? '')} alt={String(a.alt_text ?? 'thumbnail')}
                  style={{ maxHeight: '150px', maxWidth: '200px', objectFit: 'cover', border: '1px solid #ccc' }} />
              ))}
            </div>
          </>
        )}

        {galleryAssets.length > 0 && (
          <>
            <h3>Galerie ({galleryAssets.length})</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {galleryAssets.map((a, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={String(a.url ?? '')} alt={String(a.alt_text ?? `gallery-${i}`)}
                  style={{ maxHeight: '150px', maxWidth: '200px', objectFit: 'cover', border: '1px solid #ccc' }} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* 12. Videos */}
      <section style={{ marginTop: '2rem' }}>
        <h2>12. Videos – {videos.length} Einträge</h2>
        {videos.length === 0 ? <p>–</p> : (
          <ul>
            {videos.map((v, i) => (
              <li key={i}>
                {String(v.platform ?? '?')}: <a href={String(v.url ?? '#')} target="_blank" rel="noreferrer">{String(v.url ?? '–')}</a>
                {v.title ? ` – ${String(v.title)}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 13. Social Profiles */}
      <section style={{ marginTop: '2rem' }}>
        <h2>13. Social Profiles – {socialProfiles.length} Einträge</h2>
        {socialProfiles.length === 0 ? <p>–</p> : (
          <ul>
            {socialProfiles.map((sp, i) => (
              <li key={i}>
                {String(sp.platform ?? '?')}: <a href={String(sp.url ?? '#')} target="_blank" rel="noreferrer">{String(sp.url ?? '–')}</a>
                {sp.follower_count ? ` (${String(sp.follower_count)} Follower)` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 14. Referenz-Events */}
      <section style={{ marginTop: '2rem' }}>
        <h2>14. Referenz-Events – {referenceEvents.length} Einträge</h2>
        {referenceEvents.length === 0 ? <p>–</p> : (
          <ul>
            {referenceEvents.map((re, i) => (
              <li key={i}>
                {String(re.event_name ?? '?')}
                {re.venue ? ` – ${String(re.venue)}` : ''}
                {re.city ? `, ${String(re.city)}` : ''}
                {re.year ? ` (${String(re.year)})` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 15. Ähnliche Bands */}
      <section style={{ marginTop: '2rem' }}>
        <h2>15. Ähnliche Bands (band_relations, source_band_id = diese Band) – {bandRelations.length} Einträge</h2>
        {bandRelations.length === 0 ? <p>–</p> : (
          <ul>
            {bandRelations.map((br, i) => {
              const target = br.target_band as Record<string, unknown> | null
              return (
                <li key={i}>
                  {target ? `${String(target.name ?? '?')} (slug: ${String(target.slug ?? '?')}, id: ${String(target.id ?? '?')})` : JSON.stringify(br)}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* 16. Rohdaten-Dump */}
      <section style={{ marginTop: '2rem' }}>
        <h2>16. Rohdaten (JSON)</h2>
        <pre style={{ background: '#f0f0f0', color: '#333', padding: '1rem', whiteSpace: 'pre-wrap', overflowX: 'auto', fontSize: '0.75rem' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </section>
    </main>
  )
}
