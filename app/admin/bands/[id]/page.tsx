import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { updateBandAction, createContactAction, updateContactAction, updateBandEventTypesAction, updateBandBandTypesAction, updateBandVideoAction } from './actions'
import { logoutAction } from '@/app/admin/actions'
import { DeleteContactButton } from './DeleteContactButton'
import { LocationEditSection } from './LocationEditSection'
import type { LocationData } from './LocationEditSection'
import { LocationReassignSection } from './LocationReassignSection'
import { SimilarBandsSection } from './SimilarBandsSection'
import type { SimilarBandSlotData } from './SimilarBandsSection'
import { MoodEditorSection } from './MoodEditorSection'
import type { BandMoodAssignment, MoodCatalogEntry } from '@/lib/moods/sortAssignments'
import { RepertoireStyleEditorSection } from './RepertoireStyleEditorSection'
import { HeroImageEditorSection } from './HeroImageEditorSection'
import { ThumbnailEditorSection } from './ThumbnailEditorSection'
import { GalleryEditorSection } from './GalleryEditorSection'
import type { GalleryImageData } from './GalleryEditorSection'
import { resolvePubliclyUsedMediaRow } from '@/lib/bandImages/resolveMediaRow'
import type {
  BandRepertoireStyleAssignment,
  RepertoireStyleCatalogEntry,
} from '@/lib/repertoireStyles/sortAssignments'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Band bearbeiten' }

const STATUS_OPTIONS = [
  { value: 'new', label: 'Neu' },
  { value: 'draft', label: 'Entwurf' },
  { value: 'active', label: 'Aktiv' },
  { value: 'paused', label: 'Pausiert' },
  { value: 'archived', label: 'Archiviert' },
]

const FLEXIBILITY_OPTIONS = [
  { value: 'unknown', label: 'Unbekannt' },
  { value: 'fixed', label: 'Fest' },
  { value: 'flexible', label: 'Flexibel' },
  { value: 'modular', label: 'Modular' },
]

const PRICE_TIER_OPTIONS = [
  { value: '', label: '–' },
  { value: 'budget', label: 'Budget' },
  { value: 'mid', label: 'Mittelklasse' },
  { value: 'premium', label: 'Premium' },
  { value: 'on_request', label: 'Auf Anfrage' },
]

const NULLABLE_BOOLEAN_OPTIONS = [
  { value: '', label: '–' },
  { value: 'true', label: 'Ja' },
  { value: 'false', label: 'Nein' },
]

const CONTACT_ROLE_OPTIONS = [
  { value: '', label: '– keine Rolle –' },
  { value: 'management', label: 'Management' },
  { value: 'booking', label: 'Booking' },
  { value: 'band_direct', label: 'Band direkt' },
  { value: 'technik', label: 'Technik' },
  { value: 'press', label: 'Presse' },
]

const EVENT_TYPES_ERROR_MESSAGES: Record<string, string> = {
  invalid_band:       'Band nicht gefunden.',
  invalid_event_type: 'Ungültige Event-Type-ID – bitte Seite neu laden.',
  db_error:           'Datenbankfehler – bitte erneut versuchen.',
}

const VIDEO_ERROR_MESSAGES: Record<string, string> = {
  invalid_url: 'Ungültiger YouTube-Link. Bitte einen konkreten Video-Link eingeben (z. B. youtube.com/watch?v=…).',
  db_error: 'Datenbankfehler – bitte erneut versuchen.',
  load_failed: 'Fehler beim Laden – bitte Seite neu laden, bevor du das Feld bearbeitest.',
}

const LOCATION_ERROR_MESSAGES: Record<string, string> = {
  no_location:          'Für diese Band ist noch keine Home-Location verknüpft. Dieser Admin kann aktuell nur bestehende, exklusive Standorte bearbeiten.',
  invalid_band:         'Band nicht gefunden.',
  shared_location:      'Diese Location wird von mehreren Bands genutzt. Änderungen sind in dieser Band-Maske gesperrt.',
  invalid_plz:          'PLZ muss 4 oder 5 Ziffern haben.',
  invalid_city:         'Ort/Stadt darf nicht leer sein.',
  invalid_coordinates:  'Latitude und Longitude müssen gültige Zahlen sein und gemeinsam gesetzt oder gemeinsam leer sein.',
  db_error:             'Datenbankfehler – bitte erneut versuchen.',
}

const LOCATION_REASSIGN_ERROR_MESSAGES: Record<string, string> = {
  missing_target:     'Bitte eine Ziel-Location auswählen.',
  band_not_found:     'Band nicht gefunden.',
  same_location:      'Diese Location ist bereits die aktuelle Home-Location dieser Band.',
  location_not_found: 'Ziel-Location nicht gefunden.',
  db_error:           'Datenbankfehler – bitte erneut versuchen.',
}

const SIMILAR_ERROR_MESSAGES: Record<string, string> = {
  similar_source_not_found:    'Band nicht gefunden.',
  similar_target_not_found:    'Eine ausgewählte Band existiert nicht mehr – bitte Seite neu laden.',
  similar_target_not_active:   'Eine ausgewählte Band ist nicht aktiv/veröffentlicht und kann nicht empfohlen werden.',
  similar_self_reference:      'Eine Band kann sich nicht selbst als ähnlich empfehlen.',
  similar_too_many_targets:    'Maximal 3 ähnliche Bands möglich.',
  similar_duplicate_target:    'Dieselbe Band wurde mehrfach ausgewählt.',
  similar_targets_required:    'Unerwarteter Fehler beim Speichern – bitte Seite neu laden und erneut versuchen.',
  similar_null_target:         'Unerwarteter Fehler beim Speichern – bitte Seite neu laden und erneut versuchen.',
  db_error:                    'Datenbankfehler – bitte erneut versuchen.',
}

const BAND_TYPES_ERROR_MESSAGES: Record<string, string> = {
  invalid_band:         'Band nicht gefunden.',
  missing_primary:      'Bitte eine primäre Bandart auswählen.',
  primary_in_secondary: 'Die primäre Bandart darf nicht auch als sekundär gewählt sein.',
  invalid_band_type:    'Ungültige Bandart-ID – bitte Seite neu laden.',
  db_error:             'Datenbankfehler – bitte erneut versuchen.',
}

const MOOD_ERROR_MESSAGES: Record<string, string> = {
  mood_band_not_found:    'Band nicht gefunden.',
  mood_targets_required:  'Unerwarteter Fehler beim Speichern – bitte Seite neu laden und erneut versuchen.',
  mood_too_many:          'Maximal 4 Moods möglich.',
  mood_null_target:       'Unerwarteter Fehler beim Speichern – bitte Seite neu laden und erneut versuchen.',
  mood_duplicate:         'Derselbe Mood wurde mehrfach ausgewählt.',
  mood_not_found:         'Ein ausgewählter Mood existiert nicht mehr – bitte Seite neu laden.',
  mood_not_active:        'Ein ausgewählter Mood ist nicht mehr aktiv – bitte Seite neu laden.',
  db_error:               'Datenbankfehler – bitte erneut versuchen.',
}

const REPERTOIRE_STYLE_ERROR_MESSAGES: Record<string, string> = {
  repertoire_band_not_found:    'Band nicht gefunden.',
  repertoire_targets_required:  'Unerwarteter Fehler beim Speichern – bitte Seite neu laden und erneut versuchen.',
  repertoire_too_many:          'Maximal 3 Einträge möglich.',
  repertoire_null_target:       'Unerwarteter Fehler beim Speichern – bitte Seite neu laden und erneut versuchen.',
  repertoire_duplicate:         'Derselbe Repertoire-Stil wurde mehrfach ausgewählt.',
  repertoire_style_not_found:   'Ein ausgewählter Repertoire-Stil existiert nicht mehr – bitte Seite neu laden.',
  repertoire_style_not_active:  'Ein ausgewählter Repertoire-Stil ist nicht mehr aktiv – bitte Seite neu laden.',
  db_error:                     'Datenbankfehler – bitte erneut versuchen.',
}

const HERO_IMAGE_ERROR_MESSAGES: Record<string, string> = {
  hero_image_band_not_found:   'Band nicht gefunden.',
  hero_image_file_required:    'Bitte eine Bilddatei auswählen.',
  hero_image_empty:            'Die ausgewählte Datei ist leer.',
  hero_image_too_large:        'Die Datei ist größer als 4 MB.',
  hero_image_invalid_type:     'Nur JPEG-, PNG- oder WebP-Dateien sind erlaubt.',
  hero_image_load_failed:      'Bestehendes Hero-Bild konnte nicht geladen werden – bitte Seite neu laden.',
  hero_image_ambiguous:        'Datenkonflikt: Für diese Band sind mehrere Hero-Bilder ohne eindeutige Reihenfolge hinterlegt. Bitte außerhalb dieses Editors klären.',
  hero_image_upload_failed:    'Upload fehlgeschlagen – bitte erneut versuchen.',
  hero_image_db_update_failed: 'Bild wurde hochgeladen, aber die Zuordnung konnte nicht gespeichert werden – bitte erneut versuchen.',
  db_error:                    'Datenbankfehler – bitte erneut versuchen.',
}

const THUMBNAIL_ERROR_MESSAGES: Record<string, string> = {
  thumbnail_band_not_found:   'Band nicht gefunden.',
  thumbnail_file_required:    'Bitte eine Bilddatei auswählen.',
  thumbnail_empty:            'Die ausgewählte Datei ist leer.',
  thumbnail_too_large:        'Die Datei ist größer als 4 MB.',
  thumbnail_invalid_type:     'Nur JPEG-, PNG- oder WebP-Dateien sind erlaubt.',
  thumbnail_load_failed:      'Bestehendes Thumbnail konnte nicht geladen werden – bitte Seite neu laden.',
  thumbnail_ambiguous:        'Datenkonflikt: Für diese Band sind mehrere Thumbnails ohne eindeutige Reihenfolge hinterlegt. Bitte außerhalb dieses Editors klären.',
  thumbnail_upload_failed:    'Upload fehlgeschlagen – bitte erneut versuchen.',
  thumbnail_db_update_failed: 'Bild wurde hochgeladen, aber die Zuordnung konnte nicht gespeichert werden – bitte erneut versuchen.',
  db_error:                   'Datenbankfehler – bitte erneut versuchen.',
}

const GALLERY_ERROR_MESSAGES: Record<string, string> = {
  gallery_band_not_found:    'Band nicht gefunden.',
  gallery_file_required:     'Bitte eine Bilddatei auswählen.',
  gallery_empty:             'Die ausgewählte Datei ist leer.',
  gallery_too_large:         'Die Datei ist größer als 4 MB.',
  gallery_invalid_type:      'Nur JPEG-, PNG- oder WebP-Dateien sind erlaubt.',
  gallery_load_failed:       'Galerie konnte nicht geladen werden – bitte Seite neu laden.',
  gallery_limit_reached:     'Maximale Anzahl von 10 Galeriebildern erreicht. Bitte zuerst ein bestehendes Bild löschen.',
  gallery_upload_failed:     'Upload fehlgeschlagen – bitte erneut versuchen.',
  gallery_db_insert_failed:  'Bild wurde hochgeladen, aber die Zuordnung konnte nicht gespeichert werden – bitte erneut versuchen.',
  gallery_target_required:   'Kein Galeriebild ausgewählt.',
  gallery_target_not_found:  'Dieses Galeriebild wurde nicht gefunden – bitte Seite neu laden.',
  gallery_target_wrong_band: 'Dieses Galeriebild gehört nicht zu dieser Band – bitte Seite neu laden.',
  gallery_target_wrong_role: 'Dieser Medieneintrag ist kein Galeriebild – bitte Seite neu laden.',
  gallery_invalid_direction: 'Unbekannte Verschieben-Aktion.',
  gallery_reorder_failed:    'Umsortieren fehlgeschlagen – bitte erneut versuchen.',
  db_error:                  'Datenbankfehler – bitte erneut versuchen.',
}

type ActiveEventType = {
  id: string
  name: string
  sort_order: number
}

type AssignedEventTypeRow = {
  event_type_id: string
  event_types: { name: string; status: string } | null
}

type ActiveBandType = {
  id: string
  name: string
  sort_order: number
}

type AssignedBandTypeRow = {
  band_type_id: string
  is_primary: boolean
}

const CONTACT_ERROR_MESSAGES: Record<string, string> = {
  missing_fields: 'Mindestens Name, E-Mail oder Telefon muss befüllt sein.',
  too_long: 'Ein Feld überschreitet die maximale Zeichenanzahl.',
  invalid_role: 'Ungültige Rolle.',
  invalid_email: 'Bitte eine gültige E-Mail-Adresse eingeben.',
  duplicate_role: 'Diese Rolle ist für diese Band bereits vergeben.',
  primary_conflict: 'Es gibt bereits einen primären Anfragekontakt.',
  check_failed: 'Ungültiger Wert (Datenbankprüfung fehlgeschlagen).',
  invalid_contact: 'Kontakt nicht gefunden oder nicht dieser Band zugeordnet.',
  db_error: 'Datenbankfehler – bitte erneut versuchen.',
}

type BandContact = {
  id: string
  contact_name: string | null
  email: string | null
  phone: string | null
  contact_role: string | null
  is_public: boolean
  is_primary_inquiry: boolean
  created_at: string
  updated_at: string
}

type BandDetail = {
  id: string
  name: string
  slug: string
  status: string
  is_published: boolean
  lineup_flexibility: string
  default_member_count: number | null
  website_url: string | null
  home_location_id: string | null
  locations: LocationData | null
  band_profiles: {
    short_description: string | null
    main_text: string | null
    slogan: string | null
    meta_description: string | null
    price_range: string | null
    price_tier: string | null
    wedding_description: string | null
    wedding_possible_playtimes: string | null
    wedding_constellation: string | null
    wedding_fee_range: string | null
    wedding_kidnapping_bride: boolean | null
    wedding_moderation: boolean | null
  } | null
  band_contacts: BandContact[]
}

type SearchParams = Promise<{
  saved?: string
  created?: string
  e_name?: string
  e_slug?: string
  e_status?: string
  e_lineup_flexibility?: string
  e_default_member_count?: string
  e_website_url?: string
  e_short_description?: string
  e_slogan?: string
  e_meta_description?: string
  e_price_tier?: string
  e_form?: string
  contact_created?: string
  contact_saved?: string
  contact_deleted?: string
  contact_error?: string
  event_types_saved?: string
  event_types_error?: string
  band_types_saved?: string
  band_types_error?: string
  video_saved?: string
  video_error?: string
  location_saved?: string
  location_error?: string
  location_reassign_saved?: string
  location_reassign_error?: string
  similar_saved?: string
  similar_error?: string
  mood_saved?: string
  mood_error?: string
  repertoire_saved?: string
  repertoire_error?: string
  hero_image_saved?: string
  hero_image_error?: string
  thumbnail_saved?: string
  thumbnail_error?: string
  gallery_saved?: string
  gallery_error?: string
}>

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-red-600">{msg}</p>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default async function AdminBandDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: SearchParams
}) {
  const { id } = await params
  const sp = await searchParams

  // UUID-Guard: bands.id ist Primary Key vom Typ uuid. Ein Parameter, der
  // keine UUID ist (z. B. versehentlich ein Slug statt der ID), wuerde
  // sonst als Postgres-Fehler (invalid input syntax for type uuid) enden
  // und ununterscheidbar von einem echten DB-Fehler behandelt werden.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) notFound()

  const client = createAdminClient()

  const { data, error } = await client
    .from('bands')
    .select(`
      id, name, slug, status, is_published,
      lineup_flexibility, default_member_count, website_url,
      home_location_id,
      locations(id, plz, city_name, landkreis, regierungsbezirk, bundesland, country, country_code, latitude, longitude),
      band_profiles(short_description, main_text, slogan, meta_description, price_range, price_tier, wedding_description, wedding_possible_playtimes, wedding_constellation, wedding_fee_range, wedding_kidnapping_bride, wedding_moderation),
      band_contacts(id, contact_name, email, phone, contact_role, is_public, is_primary_inquiry, created_at, updated_at)
    `)
    .eq('id', id)
    .single()

  // Echte Query-Fehler (z. B. Rechte, kaputter Embed, DB-Ausfall) duerfen
  // nicht als 404 erscheinen -- nur "kein Treffer" (PGRST116 von .single())
  // ist ein echtes "nicht gefunden". Fehler zusaetzlich ins Server-Log,
  // sichtbare Fehlerbehandlung analog zu /admin/bands.
  if (error && error.code !== 'PGRST116') {
    console.error('[admin/bands/[id]] Fehler beim Laden der Band:', error)
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <span className="font-semibold text-gray-800 text-sm">proudleut Admin</span>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Abmelden
            </button>
          </form>
        </header>
        <div className="px-6 py-6 max-w-3xl mx-auto">
          <a href="/admin/bands" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            ← Bands
          </a>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4 text-red-700 text-sm">
            Fehler beim Laden: {error.message}
          </div>
        </div>
      </div>
    )
  }

  if (!data) notFound()

  const band = data as unknown as BandDetail
  const profile = band.band_profiles ?? null
  const contacts = (band.band_contacts ?? []).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  const location = band.locations ?? null

  // Event-Types – admin-spezifische Reads (getrennt von den öffentlichen queries.ts)
  const [
    { data: allActiveEventTypesRaw },
    { data: assignedEventTypesRaw },
    { data: allActiveBandTypesRaw },
    { data: assignedBandTypesRaw },
  ] = await Promise.all([
    client
      .from('event_types')
      .select('id, name, sort_order')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    client
      .from('band_event_types')
      .select('event_type_id, event_types(name, status)')
      .eq('band_id', id),
    client
      .from('band_types')
      .select('id, name, sort_order')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    client
      .from('band_band_types')
      .select('band_type_id, is_primary')
      .eq('band_id', id),
  ])

  const allActiveEventTypes = (allActiveEventTypesRaw ?? []) as ActiveEventType[]
  const assignedRows = (assignedEventTypesRaw ?? []) as unknown as AssignedEventTypeRow[]
  const assignedIds = new Set(assignedRows.map(r => r.event_type_id))
  const inactiveAssigned = assignedRows.filter(r => r.event_types?.status !== 'active')

  const allActiveBandTypes = (allActiveBandTypesRaw ?? []) as ActiveBandType[]
  const assignedBandTypeRows = (assignedBandTypesRaw ?? []) as AssignedBandTypeRow[]
  const primaryBandTypeRow = assignedBandTypeRows.find(r => r.is_primary) ?? null
  const secondaryBandTypeIds = new Set(
    assignedBandTypeRows.filter(r => !r.is_primary).map(r => r.band_type_id)
  )

  const { data: videoRow, error: videoLoadError } = await client
    .from('videos')
    .select('url')
    .eq('band_id', id)
    .eq('platform', 'youtube')
    .maybeSingle()

  const videoLoaded = !videoLoadError
  const existingVideoUrl = videoRow?.url ?? ''

  // Aehnliche Bands: bestehende similar-Relations (Target inkl. Name/Slug,
  // rank, reason) + Kandidatenliste (aktiv+veroeffentlicht, aktuelle Band
  // ausgeschlossen). Target-FK wird explizit aliasiert, da band_relations
  // zwei FKs auf bands hat (Source + Target) -- ohne Alias waere der Embed
  // fuer PostgREST mehrdeutig.
  type SimilarRelationRow = {
    rank: number | null
    reason: string | null
    target: { id: string; name: string; slug: string } | null
  }
  type CandidateBandRow = { id: string; name: string }

  // Moods: aktiver Katalog (fuer die Auswahloptionen) + bestehende
  // Zuordnungen dieser Band inkl. eingebettetem Mood-Objekt JEGLICHEN
  // Status (fuer die Datenkonflikt-Erkennung bei inzwischen inaktiven
  // Moods -- siehe MoodEditorSection). Beide Queries laufen rein
  // lesend, keine Normalisierung, keine Schreiboperation.
  type MoodCatalogRow = MoodCatalogEntry
  type BandMoodRow = {
    mood_id: string
    sort_order: number | null
    moods: MoodCatalogEntry | null
  }

  // Repertoire-Styles ("Musikalisch verortet"): aktiver Katalog (fuer die
  // Suchauswahl) + bestehende Zuordnungen dieser Band inkl. eingebettetem
  // Katalogobjekt JEGLICHEN Status (fuer die Datenkonflikt-Erkennung bei
  // inzwischen inaktiven/entfernten Eintraegen -- siehe
  // RepertoireStyleEditorSection). Beide Queries laufen rein lesend.
  type RepertoireStyleCatalogRow = RepertoireStyleCatalogEntry
  type BandRepertoireStyleRow = {
    repertoire_style_id: string
    sort_order: number | null
    repertoire_styles: RepertoireStyleCatalogEntry | null
  }

  // Hero-Bild und Thumbnail: alle media_assets-Zeilen der jeweiligen Rolle
  // dieser Band laden (kein UNIQUE-Constraint auf (band_id, role) --
  // siehe HeroImageEditorSection/ThumbnailEditorSection/resolveMediaRow
  // fuer die Konfliktbestimmung).
  type MediaAssetRow = {
    id: string
    url: string
    alt_text: string | null
    role: string
    sort_order: number
    source_provider: string
  }

  const [
    { data: similarRelationsRaw, error: similarRelationsError },
    { data: candidateBandsRaw, error: candidateBandsError },
    { data: moodCatalogRaw, error: moodCatalogError },
    { data: bandMoodsRaw, error: bandMoodsError },
    { data: repertoireStyleCatalogRaw, error: repertoireStyleCatalogError },
    { data: bandRepertoireStylesRaw, error: bandRepertoireStylesError },
    { data: heroMediaAssetsRaw, error: heroMediaAssetsError },
    { data: thumbnailMediaAssetsRaw, error: thumbnailMediaAssetsError },
    { data: galleryMediaAssetsRaw, error: galleryMediaAssetsError },
  ] = await Promise.all([
    client
      .from('band_relations')
      .select('rank, reason, target:bands!band_relations_target_band_id_fkey(id, name, slug)')
      .eq('source_band_id', id)
      .eq('relation_type', 'similar')
      .order('rank', { ascending: true })
      .returns<SimilarRelationRow[]>(),
    client
      .from('bands')
      .select('id, name')
      .eq('status', 'active')
      .eq('is_published', true)
      .neq('id', id)
      .order('name', { ascending: true })
      .returns<CandidateBandRow[]>(),
    client
      .from('moods')
      .select('id, name, slug, description, status, sort_order')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .returns<MoodCatalogRow[]>(),
    client
      .from('band_moods')
      .select('mood_id, sort_order, moods(id, name, slug, description, status, sort_order)')
      .eq('band_id', id)
      .returns<BandMoodRow[]>(),
    client
      .from('repertoire_styles')
      .select('id, name, slug, description, status, sort_order')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .returns<RepertoireStyleCatalogRow[]>(),
    client
      .from('band_repertoire_styles')
      .select('repertoire_style_id, sort_order, repertoire_styles(id, name, slug, description, status, sort_order)')
      .eq('band_id', id)
      .returns<BandRepertoireStyleRow[]>(),
    client
      .from('media_assets')
      .select('id, url, alt_text, role, sort_order, source_provider')
      .eq('band_id', id)
      .eq('role', 'hero')
      .returns<MediaAssetRow[]>(),
    client
      .from('media_assets')
      .select('id, url, alt_text, role, sort_order, source_provider')
      .eq('band_id', id)
      .eq('role', 'thumbnail')
      .returns<MediaAssetRow[]>(),
    client
      .from('media_assets')
      .select('id, url, alt_text, role, sort_order, source_provider')
      .eq('band_id', id)
      .eq('role', 'gallery')
      .order('sort_order', { ascending: true })
      .returns<MediaAssetRow[]>(),
  ])

  // Ein Lesefehler darf NICHT als "keine Eintraege" (leere Slots/leere
  // Kandidatenliste) behandelt werden -- sonst wuerde ein Speichern nach
  // einem 403/Query-Fehler per leerem Array die bestehende Kuration
  // loeschen. Bei Fehler rendert SimilarBandsSection nur einen
  // Fehlerzustand, kein Formular, kein Submit.
  const similarBandsLoadError = !!similarRelationsError || !!candidateBandsError

  const similarSlots: (SimilarBandSlotData | null)[] = [null, null, null]
  for (const rel of similarRelationsRaw ?? []) {
    if (rel.target && rel.rank !== null && rel.rank >= 1 && rel.rank <= 3) {
      similarSlots[rel.rank - 1] = {
        targetBandId: rel.target.id,
        targetName: rel.target.name,
        reason: rel.reason,
      }
    }
  }

  const candidateBands = candidateBandsRaw ?? []

  // Gleiche Fail-closed-Logik wie bei Similar Bands: ein Ladefehler darf
  // nie als "keine Zuordnungen" (leerer Zustand) interpretiert werden --
  // MoodEditorSection rendert bei loadError=true nur einen Fehlerzustand,
  // kein Formular, kein Submit.
  const moodsLoadError = !!moodCatalogError || !!bandMoodsError
  const moodCatalog: MoodCatalogEntry[] = moodCatalogRaw ?? []
  const bandMoodAssignments: BandMoodAssignment[] = (bandMoodsRaw ?? []).map((row) => ({
    mood_id: row.mood_id,
    sort_order: row.sort_order ?? 0,
    mood: row.moods,
  }))

  // Gleiche Fail-closed-Logik wie bei Moods/Aehnlichen Bands: ein
  // Ladefehler darf nie als "keine Zuordnungen" (leerer Zustand)
  // interpretiert werden -- RepertoireStyleEditorSection rendert bei
  // loadError=true nur einen Fehlerzustand, kein Formular, kein Submit.
  const repertoireStylesLoadError = !!repertoireStyleCatalogError || !!bandRepertoireStylesError
  const repertoireStyleCatalog: RepertoireStyleCatalogEntry[] = repertoireStyleCatalogRaw ?? []
  const bandRepertoireStyleAssignments: BandRepertoireStyleAssignment[] = (bandRepertoireStylesRaw ?? []).map((row) => ({
    repertoire_style_id: row.repertoire_style_id,
    sort_order: row.sort_order ?? 0,
    repertoire_style: row.repertoire_styles,
  }))

  // Hero-Bild fuer die Anzeige: dieselbe Konfliktaufloesung wie im
  // Schreibpfad (lib/bandImages/resolveMediaRow.ts) -- zeigt exakt die
  // Zeile, die das oeffentliche Frontend tatsaechlich anzeigen wuerde.
  // Bei echtem sort_order-Gleichstand (ambiguous) wird defensiv kein Bild
  // angezeigt, statt zu raten.
  const heroImageLoadError = !!heroMediaAssetsError
  const heroRowResolution = resolvePubliclyUsedMediaRow(heroMediaAssetsRaw ?? [])
  const currentHeroImage = heroRowResolution.kind === 'resolved'
    ? { url: heroRowResolution.row.url, alt: heroRowResolution.row.alt_text ?? `${band.name} live` }
    : null

  // Thumbnail fuer die Anzeige: eigenstaendige Konfliktaufloesung, unabhaengig
  // vom Hero-Bild (dieselbe rollenneutrale Logik, andere media_assets-Zeilen).
  const thumbnailLoadError = !!thumbnailMediaAssetsError
  const thumbnailRowResolution = resolvePubliclyUsedMediaRow(thumbnailMediaAssetsRaw ?? [])
  const currentThumbnailImage = thumbnailRowResolution.kind === 'resolved'
    ? { url: thumbnailRowResolution.row.url, alt: thumbnailRowResolution.row.alt_text ?? `${band.name} live` }
    : null

  // Galerie: anders als Hero/Thumbnail sind hier mehrere Zeilen normal --
  // keine Konfliktaufloesung noetig, nur ein Ladefehler darf nicht
  // stillschweigend als "leere Galerie" behandelt werden.
  const galleryLoadError = !!galleryMediaAssetsError
  const galleryImages: GalleryImageData[] = (galleryMediaAssetsRaw ?? []).map((row) => ({
    id: row.id,
    url: row.url,
    alt: row.alt_text ?? `${band.name} live`,
  }))

  let locationUsageCount = 0
  if (band.home_location_id) {
    const { count } = await client
      .from('bands')
      .select('*', { count: 'exact', head: true })
      .eq('home_location_id', band.home_location_id)
    locationUsageCount = count ?? 0
  }

  const showSuccess = !!sp.saved || !!sp.created
  const hasFormError = !!sp.e_form
  const contactErrorMsg = sp.contact_error
    ? (CONTACT_ERROR_MESSAGES[sp.contact_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
    : null
  const eventTypesErrorMsg = sp.event_types_error
    ? (EVENT_TYPES_ERROR_MESSAGES[sp.event_types_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
    : null
  const bandTypesErrorMsg = sp.band_types_error
    ? (BAND_TYPES_ERROR_MESSAGES[sp.band_types_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
    : null
  const videoErrorMsg = sp.video_error
    ? (VIDEO_ERROR_MESSAGES[sp.video_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
    : null
  const locationErrorMsg = sp.location_error
    ? (LOCATION_ERROR_MESSAGES[sp.location_error] ?? 'Standort konnte nicht gespeichert werden.')
    : null
  const locationReassignErrorMsg = sp.location_reassign_error
    ? (LOCATION_REASSIGN_ERROR_MESSAGES[sp.location_reassign_error] ?? 'Home-Location konnte nicht gewechselt werden.')
    : null
  const similarErrorMsg = sp.similar_error
    ? (SIMILAR_ERROR_MESSAGES[sp.similar_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
    : null
  const moodErrorMsg = sp.mood_error
    ? (MOOD_ERROR_MESSAGES[sp.mood_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
    : null
  const repertoireErrorMsg = sp.repertoire_error
    ? (REPERTOIRE_STYLE_ERROR_MESSAGES[sp.repertoire_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
    : null
  const heroImageErrorMsg = sp.hero_image_error
    ? (HERO_IMAGE_ERROR_MESSAGES[sp.hero_image_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
    : null
  const thumbnailErrorMsg = sp.thumbnail_error
    ? (THUMBNAIL_ERROR_MESSAGES[sp.thumbnail_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
    : null
  const galleryErrorMsg = sp.gallery_error
    ? (GALLERY_ERROR_MESSAGES[sp.gallery_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">proudleut Admin</span>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Abmelden
          </button>
        </form>
      </header>

      <div className="px-6 py-6 max-w-3xl mx-auto">
        {/* Breadcrumb + title */}
        <div className="mb-6">
          <a href="/admin/bands" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            ← Bands
          </a>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">{band.name}</h1>
          <p className="text-sm text-gray-400 font-mono mt-0.5">{band.slug}</p>
        </div>

        {/* Band success banner */}
        {showSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5 text-green-700 text-sm">
            {sp.created ? 'Band wurde angelegt.' : 'Änderungen gespeichert.'}
          </div>
        )}

        {/* Band form error */}
        {hasFormError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5 text-red-700 text-sm">
            {sp.e_form}
          </div>
        )}

        {/* Standort bearbeiten */}
        <LocationEditSection
          bandId={band.id}
          location={location}
          locationUsageCount={locationUsageCount}
          successMsg={sp.location_saved ? 'Standort gespeichert.' : undefined}
          errorMsg={locationErrorMsg ?? undefined}
        />

        {/* Home-Location wechseln */}
        <LocationReassignSection
          bandId={band.id}
          currentLocation={location}
          currentLocationUsageCount={locationUsageCount}
          successMsg={sp.location_reassign_saved ? 'Home-Location gewechselt.' : undefined}
          errorMsg={locationReassignErrorMsg ?? undefined}
        />

        {/* ─── Event-Types ──────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Event-Types</h2>

          {sp.event_types_saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
              Zuordnungen gespeichert.
            </div>
          )}
          {eventTypesErrorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
              {eventTypesErrorMsg}
            </div>
          )}

          <form action={updateBandEventTypesAction}>
            <input type="hidden" name="band_id" value={band.id} />

            {allActiveEventTypes.length === 0 && inactiveAssigned.length === 0 ? (
              <p className="text-sm text-gray-400 mb-4">Keine aktiven Event-Types vorhanden.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-4">
                {allActiveEventTypes.map((et) => (
                  <label
                    key={et.id}
                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name="event_type_id"
                      value={et.id}
                      defaultChecked={assignedIds.has(et.id)}
                      className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    {et.name}
                  </label>
                ))}
              </div>
            )}

            {inactiveAssigned.length > 0 && (
              <div className="border-t border-gray-100 pt-4 mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Inaktiv – bereits zugeordnet
                </p>
                <div className="space-y-2">
                  {inactiveAssigned.map((r) => (
                    <label
                      key={r.event_type_id}
                      className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="event_type_id"
                        value={r.event_type_id}
                        defaultChecked
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      {r.event_types?.name ?? r.event_type_id}
                      <span className="text-xs text-amber-600 font-medium">inaktiv</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
            >
              Speichern
            </button>
          </form>
        </div>
        {/* ─── Ende Event-Types ────────────────────── */}

        {/* ─── Bandart ────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Bandart</h2>

          {sp.band_types_saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
              Zuordnungen gespeichert.
            </div>
          )}
          {bandTypesErrorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
              {bandTypesErrorMsg}
            </div>
          )}

          <form action={updateBandBandTypesAction}>
            <input type="hidden" name="band_id" value={band.id} />

            {!primaryBandTypeRow && (
              <p className="text-sm text-amber-600 font-medium mb-3">
                Noch nicht zugeordnet — bitte eine primäre Bandart auswählen.
              </p>
            )}

            {/* Primäre Bandart */}
            <div className="mb-4">
              <label
                htmlFor="primary_band_type_id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Primäre Bandart <span className="text-red-500">*</span>
              </label>
              {allActiveBandTypes.length === 0 ? (
                <p className="text-sm text-gray-400">Keine aktiven Bandarten vorhanden.</p>
              ) : (
                <select
                  id="primary_band_type_id"
                  name="primary_band_type_id"
                  defaultValue={primaryBandTypeRow?.band_type_id ?? ''}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">– auswählen –</option>
                  {allActiveBandTypes.map((bt) => (
                    <option key={bt.id} value={bt.id}>{bt.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Sekundäre Bandarten */}
            {allActiveBandTypes.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Sekundäre Bandarten{' '}
                  <span className="text-xs text-gray-400 font-normal">(optional)</span>
                </p>
                <p className="text-xs text-gray-400 mb-2">
                  Die primäre Bandart bitte nicht zusätzlich als sekundäre Bandart auswählen.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                  {allActiveBandTypes.map((bt) => (
                    <label
                      key={bt.id}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="secondary_band_type_id"
                        value={bt.id}
                        defaultChecked={secondaryBandTypeIds.has(bt.id)}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      {bt.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
            >
              Speichern
            </button>
          </form>
        </div>
        {/* ─── Ende Bandart ───────────────────────── */}

        {/* Klingt nach (Mood-Editor) */}
        <MoodEditorSection
          bandId={band.id}
          moodCatalog={moodCatalog}
          assignments={bandMoodAssignments}
          loadError={moodsLoadError}
          successMsg={sp.mood_saved ? 'Moods gespeichert.' : undefined}
          errorMsg={moodErrorMsg ?? undefined}
        />

        {/* Musikalisch verortet (Repertoire-Style-Editor) */}
        <RepertoireStyleEditorSection
          bandId={band.id}
          catalog={repertoireStyleCatalog}
          assignments={bandRepertoireStyleAssignments}
          loadError={repertoireStylesLoadError}
          successMsg={sp.repertoire_saved ? 'Musikalisch verortet gespeichert.' : undefined}
          errorMsg={repertoireErrorMsg ?? undefined}
        />

        {/* Hero-Bild (Admin-Anzeige + Ersatz) */}
        <HeroImageEditorSection
          bandId={band.id}
          heroImage={currentHeroImage}
          loadError={heroImageLoadError}
          successMsg={sp.hero_image_saved ? 'Hero-Bild gespeichert.' : undefined}
          errorMsg={heroImageErrorMsg ?? undefined}
        />

        {/* Thumbnail (Admin-Anzeige + Ersatz, eigenstaendig vom Hero-Bild) */}
        <ThumbnailEditorSection
          bandId={band.id}
          thumbnailImage={currentThumbnailImage}
          loadError={thumbnailLoadError}
          successMsg={sp.thumbnail_saved ? 'Thumbnail gespeichert.' : undefined}
          errorMsg={thumbnailErrorMsg ?? undefined}
        />

        {/* Galerie (Bühnenmomente): anzeigen, hinzufuegen, loeschen, umsortieren */}
        <GalleryEditorSection
          bandId={band.id}
          images={galleryImages}
          loadError={galleryLoadError}
          successMsg={sp.gallery_saved ? 'Galerie gespeichert.' : undefined}
          errorMsg={galleryErrorMsg ?? undefined}
        />

        {/* ─── Kontakte ─────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Kontakte</h2>

          {/* Contact success/error banner */}
          {sp.contact_created && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
              Kontakt wurde angelegt.
            </div>
          )}
          {sp.contact_saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
              Kontakt gespeichert.
            </div>
          )}
          {sp.contact_deleted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
              Kontakt gelöscht.
            </div>
          )}
          {contactErrorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
              {contactErrorMsg}
            </div>
          )}

          {/* Existing contacts */}
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-400 mb-4">Noch keine Kontakte vorhanden.</p>
          ) : (
            <div className="space-y-4 mb-6">
              {contacts.map((c) => (
                <div key={c.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Contact header */}
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">
                        {c.contact_name ?? <span className="text-gray-400 italic">Kein Name</span>}
                      </span>
                      {c.contact_role && (
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          {c.contact_role}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {c.is_primary_inquiry && (
                        <span className="text-violet-700 font-medium">Primärkontakt</span>
                      )}
                      {c.is_public && (
                        <span className="text-gray-500">öffentlich</span>
                      )}
                      <DeleteContactButton contactId={c.id} bandId={band.id} />
                    </div>
                  </div>

                  {/* Edit form */}
                  <form action={updateContactAction} className="p-4 space-y-3">
                    <input type="hidden" name="contact_id" value={c.id} />
                    <input type="hidden" name="band_id" value={band.id} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Name */}
                      <div>
                        <label
                          htmlFor={`cn_${c.id}`}
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Name
                        </label>
                        <input
                          id={`cn_${c.id}`}
                          name="contact_name"
                          type="text"
                          defaultValue={c.contact_name ?? ''}
                          maxLength={200}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                      </div>

                      {/* Rolle */}
                      <div>
                        <label
                          htmlFor={`cr_${c.id}`}
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Rolle
                        </label>
                        <select
                          id={`cr_${c.id}`}
                          name="contact_role"
                          defaultValue={c.contact_role ?? ''}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          {CONTACT_ROLE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* E-Mail */}
                      <div>
                        <label
                          htmlFor={`em_${c.id}`}
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          E-Mail
                        </label>
                        <input
                          id={`em_${c.id}`}
                          name="email"
                          type="text"
                          defaultValue={c.email ?? ''}
                          maxLength={254}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                      </div>

                      {/* Telefon */}
                      <div>
                        <label
                          htmlFor={`ph_${c.id}`}
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Telefon
                        </label>
                        <input
                          id={`ph_${c.id}`}
                          name="phone"
                          type="text"
                          defaultValue={c.phone ?? ''}
                          maxLength={80}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="flex gap-5">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          id={`pub_${c.id}`}
                          name="is_public"
                          type="checkbox"
                          value="1"
                          defaultChecked={c.is_public}
                          className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        Öffentlich
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          id={`pri_${c.id}`}
                          name="is_primary_inquiry"
                          type="checkbox"
                          value="1"
                          defaultChecked={c.is_primary_inquiry}
                          className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        Primärer Anfragekontakt
                      </label>
                    </div>

                    {/* Timestamps + submit */}
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-gray-400">
                        Angelegt: {formatDate(c.created_at)}
                        {c.updated_at !== c.created_at && (
                          <> · Geändert: {formatDate(c.updated_at)}</>
                        )}
                      </p>
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
                      >
                        Speichern
                      </button>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          )}

          {/* New contact form */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Neuen Kontakt anlegen</h3>
            <form action={createContactAction} className="space-y-3">
              <input type="hidden" name="band_id" value={band.id} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Name */}
                <div>
                  <label htmlFor="new_contact_name" className="block text-xs font-medium text-gray-600 mb-1">
                    Name
                  </label>
                  <input
                    id="new_contact_name"
                    name="contact_name"
                    type="text"
                    maxLength={200}
                    placeholder="z. B. Max Mustermann"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                {/* Rolle */}
                <div>
                  <label htmlFor="new_contact_role" className="block text-xs font-medium text-gray-600 mb-1">
                    Rolle
                  </label>
                  <select
                    id="new_contact_role"
                    name="contact_role"
                    defaultValue=""
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {CONTACT_ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* E-Mail */}
                <div>
                  <label htmlFor="new_email" className="block text-xs font-medium text-gray-600 mb-1">
                    E-Mail
                  </label>
                  <input
                    id="new_email"
                    name="email"
                    type="text"
                    maxLength={254}
                    placeholder="kontakt@beispiel.de"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                {/* Telefon */}
                <div>
                  <label htmlFor="new_phone" className="block text-xs font-medium text-gray-600 mb-1">
                    Telefon
                  </label>
                  <input
                    id="new_phone"
                    name="phone"
                    type="text"
                    maxLength={80}
                    placeholder="+49 89 …"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex gap-5">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    id="new_is_public"
                    name="is_public"
                    type="checkbox"
                    value="1"
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  Öffentlich
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    id="new_is_primary_inquiry"
                    name="is_primary_inquiry"
                    type="checkbox"
                    value="1"
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  Primärer Anfragekontakt
                </label>
              </div>

              <div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
                >
                  Kontakt anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
        {/* ─── Ende Kontakte ─────────────────────────── */}

        {/* ─── Video ────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Video</h2>

          {sp.video_saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
              Gespeichert.
            </div>
          )}
          {videoErrorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
              {videoErrorMsg}
            </div>
          )}
          {!videoLoaded && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-amber-700 text-sm">
              Fehler beim Laden des Video-Links. Zum Schutz vor Datenverlust kann das Feld nicht gespeichert werden. Bitte Seite neu laden.
            </div>
          )}

          <form action={updateBandVideoAction}>
            <input type="hidden" name="band_id" value={band.id} />
            {videoLoaded && <input type="hidden" name="video_loaded" value="1" />}

            <div>
              <label htmlFor="youtube_url" className="block text-sm font-medium text-gray-700 mb-1">
                YouTube Video Link
              </label>
              <input
                id="youtube_url"
                name="youtube_url"
                type="url"
                defaultValue={existingVideoUrl}
                placeholder="https://www.youtube.com/watch?v=…"
                disabled={!videoLoaded}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-400">
                Konkreter YouTube-Video-Link für die Banddetailseite. Bitte keinen Kanal- oder Playlist-Link eintragen.
              </p>
            </div>

            <div className="mt-4">
              <button
                type="submit"
                disabled={!videoLoaded}
                className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Speichern
              </button>
            </div>
          </form>
        </div>
        {/* ─── Ende Video ─────────────────────────────── */}

        {/* Aehnliche Bands pflegen */}
        <SimilarBandsSection
          bandId={band.id}
          slots={similarSlots}
          candidates={candidateBands}
          loadError={similarBandsLoadError}
          successMsg={sp.similar_saved ? 'Ähnliche Bands gespeichert.' : undefined}
          errorMsg={similarErrorMsg ?? undefined}
        />

        {/* Edit form */}
        <form action={updateBandAction} className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <input type="hidden" name="id" value={band.id} />

          {/* Section: Kerndaten */}
          <fieldset>
            <legend className="text-base font-semibold text-gray-900 mb-4">Kerndaten</legend>
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Bandname <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={band.name}
                  maxLength={200}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <FieldError msg={sp.e_name} />
              </div>

              {/* Slug */}
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  defaultValue={band.slug}
                  pattern="[a-z0-9-]+"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <FieldError msg={sp.e_slug} />
              </div>

              {/* Status + is_published */}
              <div className="flex flex-wrap gap-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={band.status}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <FieldError msg={sp.e_status} />
                </div>

                <div className="flex items-end gap-2 pb-0.5">
                  <input
                    id="is_published"
                    name="is_published"
                    type="checkbox"
                    value="1"
                    defaultChecked={band.is_published}
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <label htmlFor="is_published" className="text-sm text-gray-700">
                    Veröffentlicht
                  </label>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Section: Besetzung */}
          <fieldset className="border-t border-gray-100 pt-5">
            <legend className="text-base font-semibold text-gray-900 mb-4">Besetzung</legend>
            <div className="flex flex-wrap gap-4">
              <div>
                <label htmlFor="lineup_flexibility" className="block text-sm font-medium text-gray-700 mb-1">
                  Besetzungsflexibilität
                </label>
                <select
                  id="lineup_flexibility"
                  name="lineup_flexibility"
                  defaultValue={band.lineup_flexibility}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {FLEXIBILITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <FieldError msg={sp.e_lineup_flexibility} />
              </div>

              <div>
                <label htmlFor="default_member_count" className="block text-sm font-medium text-gray-700 mb-1">
                  Standardgröße (Personen)
                </label>
                <input
                  id="default_member_count"
                  name="default_member_count"
                  type="number"
                  min={1}
                  max={30}
                  defaultValue={band.default_member_count ?? ''}
                  placeholder="–"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <FieldError msg={sp.e_default_member_count} />
              </div>
            </div>
          </fieldset>

          {/* Section: Links */}
          <fieldset className="border-t border-gray-100 pt-5">
            <legend className="text-base font-semibold text-gray-900 mb-4">Links</legend>
            <div>
              <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                id="website_url"
                name="website_url"
                type="url"
                defaultValue={band.website_url ?? ''}
                placeholder="https://"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <FieldError msg={sp.e_website_url} />
            </div>
          </fieldset>

          {/* Section: Profil */}
          <fieldset className="border-t border-gray-100 pt-5">
            <legend className="text-base font-semibold text-gray-900 mb-4">Profil</legend>
            <div className="space-y-4">
              {/* Slogan */}
              <div>
                <label htmlFor="slogan" className="block text-sm font-medium text-gray-700 mb-1">
                  Slogan / Original-Claim der Band
                  <span className="ml-1 text-xs text-gray-400 font-normal">max. 200 Zeichen</span>
                </label>
                <input
                  id="slogan"
                  name="slogan"
                  type="text"
                  defaultValue={profile?.slogan ?? ''}
                  maxLength={200}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-400">Optional. Nur nutzen, wenn die Band einen eigenen prägnanten Spruch oder Claim hat.</p>
                <FieldError msg={sp.e_slogan} />
              </div>

              {/* Short description */}
              <div>
                <label htmlFor="short_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Hero-Zeile / Kurzbeschreibung
                  <span className="ml-1 text-xs text-gray-400 font-normal">max. 300 Zeichen</span>
                </label>
                <textarea
                  id="short_description"
                  name="short_description"
                  defaultValue={profile?.short_description ?? ''}
                  maxLength={300}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
                <p className="mt-1 text-xs text-gray-400">Öffentliche Zeile unter dem Bandnamen. Kann ein kurzer Beschreibungssatz oder ein starker Claim sein.</p>
                <FieldError msg={sp.e_short_description} />
              </div>

              {/* Meta description */}
              <div>
                <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Meta-Beschreibung (SEO)
                  <span className="ml-1 text-xs text-gray-400 font-normal">max. 160 Zeichen</span>
                </label>
                <textarea
                  id="meta_description"
                  name="meta_description"
                  defaultValue={profile?.meta_description ?? ''}
                  maxLength={160}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
                <FieldError msg={sp.e_meta_description} />
              </div>

              {/* Price tier */}
              <div>
                <label htmlFor="price_tier" className="block text-sm font-medium text-gray-700 mb-1">
                  Allgemeines Preis-Tier
                </label>
                <select
                  id="price_tier"
                  name="price_tier"
                  defaultValue={profile?.price_tier ?? ''}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {PRICE_TIER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">Optional. Nur nutzen, wenn ein belastbarer allgemeiner Preisrahmen unabhängig vom Anlass bekannt ist. Sonst leer lassen.</p>
                <FieldError msg={sp.e_price_tier} />
              </div>

              {/* Price range */}
              <div>
                <label htmlFor="price_range" className="block text-sm font-medium text-gray-700 mb-1">
                  Allgemeine Preisspanne (Freitext)
                </label>
                <input
                  id="price_range"
                  name="price_range"
                  type="text"
                  defaultValue={profile?.price_range ?? ''}
                  placeholder="z. B. ab 2.500 €"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-400">Optionaler allgemeiner Richtwert. Nicht für Hochzeitspreise verwenden.</p>
              </div>

              {/* Main text */}
              <div>
                <label htmlFor="main_text" className="block text-sm font-medium text-gray-700 mb-1">
                  Haupttext
                </label>
                <textarea
                  id="main_text"
                  name="main_text"
                  defaultValue={profile?.main_text ?? ''}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y"
                />
              </div>
            </div>
          </fieldset>

          {/* Section: Hochzeit & Ablauf */}
          <fieldset className="border-t border-gray-100 pt-5">
            <legend className="text-base font-semibold text-gray-900 mb-4">Hochzeit &amp; Ablauf</legend>
            <div className="space-y-4">
              {/* Hochzeits-Claim */}
              <div>
                <label htmlFor="wedding_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Hochzeits-Claim
                  <span className="ml-1 text-xs text-gray-400 font-normal">max. 100 Zeichen</span>
                </label>
                <input
                  id="wedding_description"
                  name="wedding_description"
                  type="text"
                  defaultValue={profile?.wedding_description ?? ''}
                  maxLength={100}
                  placeholder="z. B. authentisch – spontan – mitreißend"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-400">Kurzer Claim für den Hochzeitsbereich.</p>
              </div>

              {/* Mögliche Spieldauer */}
              <div>
                <label htmlFor="wedding_possible_playtimes" className="block text-sm font-medium text-gray-700 mb-1">
                  Mögliche Spieldauer
                </label>
                <input
                  id="wedding_possible_playtimes"
                  name="wedding_possible_playtimes"
                  type="text"
                  defaultValue={profile?.wedding_possible_playtimes ?? ''}
                  placeholder="z. B. ganzer Hochzeitstag oder Party am Abend"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Besetzungsvarianten */}
              <div>
                <label htmlFor="wedding_constellation" className="block text-sm font-medium text-gray-700 mb-1">
                  Konstellation bei Hochzeiten
                </label>
                <input
                  id="wedding_constellation"
                  name="wedding_constellation"
                  type="text"
                  defaultValue={profile?.wedding_constellation ?? ''}
                  placeholder="z. B. Duo | Trio | Quartett"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-400">Optionales Pflegefeld. Nicht identisch mit der Standardgröße der Band.</p>
              </div>

              {/* Gagenniveau */}
              <div>
                <label htmlFor="wedding_fee_range" className="block text-sm font-medium text-gray-700 mb-1">
                  Interner Richtwert Hochzeit
                </label>
                <input
                  id="wedding_fee_range"
                  name="wedding_fee_range"
                  type="text"
                  defaultValue={profile?.wedding_fee_range ?? ''}
                  placeholder="z. B. Gage über 3.000 €"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-400">Grober interner Richtwert für Hochzeitsanfragen. Keine verbindliche Gage. Im neuen proudleut aktuell nicht öffentlich ausgespielt.</p>
              </div>

              {/* Brautentführung + Moderation */}
              <div className="flex flex-wrap gap-4">
                <div>
                  <label htmlFor="wedding_kidnapping_bride" className="block text-sm font-medium text-gray-700 mb-1">
                    Brautentführung
                  </label>
                  <select
                    id="wedding_kidnapping_bride"
                    name="wedding_kidnapping_bride"
                    defaultValue={
                      profile?.wedding_kidnapping_bride == null
                        ? ''
                        : String(profile.wedding_kidnapping_bride)
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {NULLABLE_BOOLEAN_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="wedding_moderation" className="block text-sm font-medium text-gray-700 mb-1">
                    Moderation
                  </label>
                  <select
                    id="wedding_moderation"
                    name="wedding_moderation"
                    defaultValue={
                      profile?.wedding_moderation == null
                        ? ''
                        : String(profile.wedding_moderation)
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {NULLABLE_BOOLEAN_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Submit */}
          <div className="border-t border-gray-100 pt-5 flex gap-3">
            <button
              type="submit"
              className="px-5 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
            >
              Speichern
            </button>
            <a
              href="/admin/bands"
              className="px-5 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Zurück zur Liste
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
