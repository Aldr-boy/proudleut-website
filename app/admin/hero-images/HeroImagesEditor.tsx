'use client'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { updateHeroWallSelectionAction } from './actions'
import { resolveHeroFocus, type HeroFocus } from '@/lib/heroWall/resolveHeroFocus'
import {
  isBelowRecommendedMinimum,
  heroWallSelectionsAreEqual,
  type HeroWallSelectionItem,
} from '@/lib/heroWall/heroWallSelectionState'
import { countUsedHeroWallSlots } from '@/lib/heroWall/heroWallComposition'
import type { HeroWallImage } from '@/components/hero/HeroWall'
import { HERO_WALL_PREVIEW_MESSAGE_TYPE } from '@/lib/heroWall/heroWallPreviewMessage'
import type { HeroImageAsset } from './page'

const FOCUS_LABEL: Record<HeroFocus, string> = {
  top: 'Oben',
  center: 'Mitte',
  bottom: 'Unten',
}

// Vorschau-Groessen (Auftrag Abschnitt 2): echte Geraete-Pixelmasse, keine
// Naeherung. Bewusst nur diese drei (nicht der vierte Komposition-
// Breakpoint "tabletWide") -- der Auftrag nennt explizit genau drei
// Ansichten. Die Keys sind direkt gueltige HeroWallBreakpoint-Werte, damit
// countUsedHeroWallSlots() dieselbe Breakpoint-Logik verwendet wie die
// eigentliche Komposition -- keine zweite, admin-eigene Breakpoint-Regel.
type PreviewSize = 'mobile' | 'tablet' | 'desktop'
const PREVIEW_DEVICES: Record<PreviewSize, { width: number; height: number; label: string }> = {
  mobile: { width: 390, height: 844, label: 'Mobile' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  desktop: { width: 1440, height: 900, label: 'Desktop' },
}

// EINE gemeinsame Vorschauflaeche fuer alle drei Geraetegroessen (Nachbesserung
// "Vorschaugroesse"): eine feste, responsiv sinnvolle Hoehe, unabhaengig vom
// Seitenverhaeltnis des gerade gewaehlten Geraets. Vorher war die Aussenbox per
// aspect-ratio an das Geraete-Seitenverhaeltnis gekoppelt und immer 100% der
// Spaltenbreite breit -- das ergab bei schmalen Geraeten (Mobile) einen
// Skalierungsfaktor > 1 (Hochskalierung), weil nur nach Breite skaliert wurde,
// nie nach Hoehe. Jetzt bestimmt CSS (container-type: size + min() aus
// Breiten- UND Hoehenverhaeltnis) den Faktor, gedeckelt auf 1.
const PREVIEW_STAGE_HEIGHT = 'min(52svh, 560px)'

function buildInitialSelection(images: HeroImageAsset[]): HeroWallSelectionItem[] {
  return images
    .filter((img) => img.heroWall)
    .sort((a, b) => (a.heroWallPosition ?? 0) - (b.heroWallPosition ?? 0))
    .map((img) => ({ id: img.id, heroFocus: resolveHeroFocus(img.heroFocus) }))
}

// Admin-Editor "Hero-Bilder" (Paket 1, SCHRITT 1C,
// docs/spezifikation-hero-bildwand.md Abschnitt 7). Nach dem Vorbild der
// bestehenden staged-Bulk-Editoren aufgebaut (siehe
// app/admin/event-types/[slug]/bands/EventTypeBandsEditor.tsx): lokal
// staged, ein Save ueberschreibt den kompletten Zielzustand atomar per
// RPC (siehe actions.ts) -- anders als dort aber mit echter, vom
// Redakteur frei sortierbarer Reihenfolge (kein Drag&Drop-Package im
// Repo vorhanden, siehe Recherche -- Reorder ueber Auf/Ab-Buttons wie
// beim bestehenden Galerie-Editor, GalleryEditorSection.tsx).
export function HeroImagesEditor({ images }: { images: HeroImageAsset[] }) {
  const router = useRouter()

  const [originalSelection, setOriginalSelection] = useState<HeroWallSelectionItem[]>(() => buildInitialSelection(images))
  const [selection, setSelection] = useState<HeroWallSelectionItem[]>(() => buildInitialSelection(images))
  const [bandFilter, setBandFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedBanner, setSavedBanner] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [previewSize, setPreviewSize] = useState<PreviewSize>('desktop')
  const previewIframeRef = useRef<HTMLIFrameElement>(null)
  const [previewIframeReady, setPreviewIframeReady] = useState(false)

  const imageById = useMemo(() => new Map(images.map((img) => [img.id, img])), [images])
  const selectedIds = useMemo(() => new Set(selection.map((s) => s.id)), [selection])
  const hasStagedChanges = !heroWallSelectionsAreEqual(originalSelection, selection)

  // Live-Vorschau (Paket 2, SCHRITT 2B): reiner Mapping-Schritt vom
  // bereits vorhandenen, sortierten lokalen Auswahl-State auf die
  // Prop-Form von HeroWall -- keine zweite Slot-/Grid-Implementierung,
  // keine eigene Layoutlogik. Jede Aenderung an `selection` (Auswahl,
  // Reorder, Fokus) spiegelt sich hierueber unmittelbar in der Vorschau,
  // schon vor einem Save.
  const previewImages: HeroWallImage[] = useMemo(
    () =>
      selection.flatMap((s) => {
        const img = imageById.get(s.id)
        return img ? [{ id: img.id, url: img.url, heroFocus: s.heroFocus }] : []
      }),
    [selection, imageById]
  )

  useEffect(() => {
    if (!hasStagedChanges) return
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasStagedChanges])

  // Erkennt zuverlaessig, wann das Vorschau-Iframe geladen hat: React's
  // onLoad-Prop feuert fuer <iframe> in der Praxis nicht zuverlaessig
  // (load ist ein nicht-blasendes Event) -- ein direkt am DOM-Knoten
  // registrierter nativer Listener ist der robuste, empfohlene Weg.
  useEffect(() => {
    const node = previewIframeRef.current
    if (!node) return
    function handleLoad() {
      setPreviewIframeReady(true)
    }
    node.addEventListener('load', handleLoad)
    // Ein lokales Iframe kann so schnell laden, dass "load" schon vor
    // dem addEventListener-Aufruf oben gefeuert hat (Effect-Attach
    // laeuft erst nach Commit/Paint) -- readyState-Fallback faengt genau
    // dieses Race ab.
    if (node.contentDocument?.readyState === 'complete') {
      setPreviewIframeReady(true)
    }
    return () => node.removeEventListener('load', handleLoad)
  }, [])

  // Ueberträgt den aktuellen (auch ungespeicherten) Auswahl-Stand an die
  // Vorschau-Route im Iframe -- per postMessage, kein zweiter
  // Datenspeicher. Laeuft bei jeder Aenderung von previewImages erneut,
  // sobald das Iframe einmal geladen hat; ein Wechsel der Vorschau-
  // Groesse aendert nur die Iframe-Abmessungen (siehe JSX), nicht die
  // Iframe-src -- daher kein erneutes Laden und kein Datenverlust beim
  // Umschalten.
  useEffect(() => {
    if (!previewIframeReady) return
    previewIframeRef.current?.contentWindow?.postMessage(
      { type: HERO_WALL_PREVIEW_MESSAGE_TYPE, images: previewImages },
      window.location.origin
    )
  }, [previewImages, previewIframeReady])

  const bandOptions = useMemo(() => [...new Set(images.map((img) => img.bandName))].sort((a, b) => a.localeCompare(b)), [images])
  // Filteroptionen ausschliesslich aus tatsaechlich vorhandenen role-Werten
  // ableiten (Auftrag: keine hartkodierte Annahme, welche der sechs
  // Schema-Rollen aktuell belegt sind).
  const roleOptions = useMemo(() => [...new Set(images.map((img) => img.role))].sort((a, b) => a.localeCompare(b)), [images])

  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      if (bandFilter && img.bandName !== bandFilter) return false
      if (roleFilter && img.role !== roleFilter) return false
      return true
    })
  }, [images, bandFilter, roleFilter])

  const belowMinimum = isBelowRecommendedMinimum(selection.length)
  // Transparenz-Anforderung Startseiten-Hero-Redesign, jetzt Breakpoint-
  // parametrisiert (Admin-Adaption Abschnitt 3): die neue Split-
  // Komposition verwendet Bildplatz n = Poolbild n ohne Wrap/Wiederholung
  // (siehe heroWallComposition.ts) -- ueberzaehlige Auswahl bleibt fuer
  // diese Darstellung schlicht ungenutzt. "used"/"total" beziehen sich
  // auf die AKTUELL im Vorschau-Umschalter gewaehlte Ansicht, nicht mehr
  // pauschal auf Desktop -- dieselbe Regel wie die Homepage-Komposition
  // selbst, keine zweite hartkodierte Zahl.
  const slotUsage = countUsedHeroWallSlots(selection.length, previewSize)

  function toggleImage(id: string) {
    setSavedBanner(false)
    setSelection((prev) => {
      if (prev.some((s) => s.id === id)) return prev.filter((s) => s.id !== id)
      return [...prev, { id, heroFocus: 'center' }]
    })
  }

  function removeFromSelection(id: string) {
    setSavedBanner(false)
    setSelection((prev) => prev.filter((s) => s.id !== id))
  }

  function moveSelection(id: string, direction: 'up' | 'down') {
    setSavedBanner(false)
    setSelection((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx === -1) return prev
      const swapWith = direction === 'up' ? idx - 1 : idx + 1
      if (swapWith < 0 || swapWith >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[swapWith]] = [next[swapWith], next[idx]]
      return next
    })
  }

  function setFocus(id: string, focus: HeroFocus) {
    setSavedBanner(false)
    setSelection((prev) => prev.map((s) => (s.id === id ? { ...s, heroFocus: focus } : s)))
  }

  function handleDiscard() {
    setSelection(originalSelection)
    setSaveError(null)
    setSavedBanner(false)
  }

  function handleSave() {
    setSaveError(null)
    startTransition(async () => {
      const result = await updateHeroWallSelectionAction(
        selection.map((s) => ({ id: s.id, heroFocus: s.heroFocus }))
      )
      if (result.success) {
        setOriginalSelection(selection)
        setSavedBanner(true)
        router.refresh()
      } else {
        setSaveError(result.message)
      }
    })
  }

  return (
    <div className={hasStagedChanges ? 'pb-32' : ''}>
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h1 className="text-2xl font-semibold text-gray-900">Hero-Bilder</h1>
        <p className="text-xs text-gray-600 mt-1">
          Kuratierter globaler Bildpool für die Homepage-Hero-Bildwand. {images.length}{' '}
          {images.length === 1 ? 'Bild' : 'Bilder'} insgesamt, {selection.length} aktuell ausgewählt.
        </p>
      </div>

      {savedBanner && !hasStagedChanges && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
          Auswahl gespeichert.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Linke Spalte -- Bildauswahl. Auf Desktop darf diese Spalte durch
            die gesamte Bildbibliothek (alle Bands) scrollen; die rechte
            Spalte bleibt daneben als Curation-Workspace sichtbar (siehe
            unten). */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Alle Bilder</h2>
          <p className="text-xs text-gray-600 mb-4">Klick auf ein Bild nimmt es in die Auswahl auf oder entfernt es.</p>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={bandFilter}
              onChange={(e) => setBandFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Alle Bands</option>
              {bandOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Alle Bildtypen</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <span className="text-xs text-gray-500">{filteredImages.length} sichtbar</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3">
            {filteredImages.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-10">Keine Bilder gefunden.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {filteredImages.map((img) => (
                  <ImageGridCard
                    key={img.id}
                    image={img}
                    isSelected={selectedIds.has(img.id)}
                    onToggle={() => toggleImage(img.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rechte Spalte -- Curation-Workspace: Live-Vorschau + Reihenfolge
            als EINE zusammenhaengende sticky Einheit (nicht zwei
            unabhaengige sticky Elemente). Das aeussere Grid-Item bekommt
            bewusst KEINE eigene Hoehenbegrenzung: CSS Grid streckt es per
            Default auf die Hoehe der linken Spalte (die durch alle Bilder
            scrollt) -- das gibt dem inneren sticky-Workspace genug Raum,
            um waehrend der gesamten Scrolldistanz der Bildbibliothek
            angeheftet zu bleiben (gleiches Prinzip wie zuvor: ein sticky
            Element braucht einen ausreichend hohen Block-Vorfahren).
            Sticky/Hoehenbegrenzung nur ab lg (Desktop) -- auf kleinen
            Screens faellt das Grid ohnehin auf eine Spalte zurueck und
            Vorschau/Pool sollen dort normal untereinander erscheinen. */}
        <div>
          <div className="flex flex-col gap-4 lg:sticky lg:top-0 lg:max-h-[100svh] lg:overflow-hidden">
            {/* Live-Vorschau -- eigene Route (app/admin/hero-images/preview),
                dieselben Komponenten wie auf der Homepage
                (components/hero/HeroWall.tsx + HeroContent.tsx), keine
                zweite Hero-Implementierung. Läuft in einem <iframe> mit
                ECHTER Geraetebreite/-hoehe (width/height-Attribute +
                exakt passende CSS-Box) -- dadurch loesen Tailwinds
                Breakpoints (md/lg/xl) innerhalb des Iframes tatsaechlich
                aus, unabhaengig vom Browserfenster des Admins. Nur die
                AUSSENBOX (gemeinsame Buehne fester Hoehe, siehe
                PREVIEW_STAGE_HEIGHT unten) wird per scale() proportional
                eingepasst (nie hochskaliert); das innere Iframe behaelt
                seine echte Pixelgroesse (scale() aendert nur die
                Darstellung, nicht das Layout-Viewport). Der unsaved
                Auswahl-Stand geht
                per postMessage hinein (siehe Effect oben) -- kein Save als
                Vorbedingung, kein zweiter Datenspeicher.
                pointerEvents: 'none' verhindert, dass ein Klick in der
                Vorschau (z. B. der CTA-Link) irgendetwas auslöst. */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="text-base font-semibold text-gray-900">Live-Vorschau</h2>
                <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-0.5">
                  {(Object.keys(PREVIEW_DEVICES) as PreviewSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPreviewSize(size)}
                      aria-pressed={previewSize === size}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        previewSize === size ? 'bg-violet-700 text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {PREVIEW_DEVICES[size].label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                Zeigt den aktuellen Bearbeitungsstand in Echtzeit, auch vor dem Speichern -- dieselbe
                Bildwand-Komponente wie auf der Homepage, mit einem echten {PREVIEW_DEVICES[previewSize].width}×
                {PREVIEW_DEVICES[previewSize].height}-Viewport ({PREVIEW_DEVICES[previewSize].label}).
              </p>

              {selection.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-600">
                  Noch keine Bilder ausgewählt. Die Vorschau erscheint, sobald mindestens ein Bild ausgewählt ist.
                </div>
              ) : (
                // Gemeinsame Buehne: feste, geraeteunabhaengige Hoehe
                // (PREVIEW_STAGE_HEIGHT) + volle Spaltenbreite. container-type:
                // size macht BEIDE Achsen (cqw UND cqh) fuer die
                // Skalierungsberechnung im Kind verfuegbar -- dafuer braucht die
                // Buehne eine definite Hoehe (gegeben) UND Breite (gegeben durch
                // den Blockkontext).
                <div
                  className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                  style={{ containerType: 'size', height: PREVIEW_STAGE_HEIGHT }}
                >
                  {/* Zentrierter, skalierter Geraete-Ausschnitt: absolute +
                      50%/50% + negativer Rand (halbe UNSKALIERTE Breite/Hoehe)
                      zentriert den Ausschnitt exakt in der Buehne, unabhaengig
                      vom Skalierungsfaktor -- transform-origin bleibt der
                      CSS-Default "center", der Skalierungspunkt faellt damit
                      genau auf den bereits zentrierten Mittelpunkt.
                      scale = min(1, Buehnenbreite/Geraetebreite,
                      Buehnenhoehe/Geraetehoehe) -- nie groesser als 1, also nie
                      Hochskalierung. Division jeweils Laenge/Laenge (px-Suffix
                      im Divisor), nicht Laenge/Zahl -- Laenge/Zahl ergibt selbst
                      wieder eine Laenge und macht scale() ungueltig (siehe
                      vorherige Fehlfunktion). */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: PREVIEW_DEVICES[previewSize].width,
                      height: PREVIEW_DEVICES[previewSize].height,
                      marginTop: -PREVIEW_DEVICES[previewSize].height / 2,
                      marginLeft: -PREVIEW_DEVICES[previewSize].width / 2,
                      transform: `scale(min(1, calc(100cqw / ${PREVIEW_DEVICES[previewSize].width}px), calc(100cqh / ${PREVIEW_DEVICES[previewSize].height}px)))`,
                    }}
                  >
                    <iframe
                      ref={previewIframeRef}
                      src="/admin/hero-images/preview"
                      title={`Hero-Vorschau ${PREVIEW_DEVICES[previewSize].label}`}
                      style={{
                        width: PREVIEW_DEVICES[previewSize].width,
                        height: PREVIEW_DEVICES[previewSize].height,
                        border: 0,
                        display: 'block',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Ausgewaehlter Hero-Pool -- Teil derselben sticky Einheit wie
                die Vorschau; nur diese Liste scrollt bei Bedarf intern
                (min-h-0 + flex-1 + overflow-y-auto), damit der gesamte
                Workspace innerhalb max-h-[100svh] bleibt. */}
            <div className="flex min-h-0 flex-1 flex-col">
              <h2 className="text-base font-semibold text-gray-900 mb-1 shrink-0">Ausgewählter Hero-Pool</h2>
              <p className="text-xs text-gray-600 mb-1 shrink-0">
                Reihenfolge bestimmt die Bildplatz-Belegung der Hero-Bildwand (Bildplatz 1 = erstes Bild, Bildplatz n
                = n-tes Bild, ohne Wiederholung).
              </p>
              <p className="text-xs text-gray-600 mb-4 shrink-0">
                {selection.length} ausgewählt · {slotUsage.used} im {PREVIEW_DEVICES[previewSize].label}-Hero
                verwendet
                {slotUsage.unused > 0
                  ? ` · ${slotUsage.unused} weitere ausgewählt`
                  : slotUsage.used < slotUsage.total
                  ? ' · restliche Plätze zeigen einen Platzhalter'
                  : ''}
              </p>

              {belowMinimum && (
                <div className="shrink-0 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
                  Weniger als 10 Bilder ausgewählt ({selection.length}). Für eine überzeugende Bildwand werden
                  in der Regel 15–25 Bilder empfohlen.
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {selection.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-10">Noch keine Bilder ausgewählt.</p>
                ) : (
                  selection.map((item, index) => {
                    const img = imageById.get(item.id)
                    if (!img) return null
                    return (
                      <SelectedRow
                        key={item.id}
                        image={img}
                        position={index + 1}
                        heroFocus={item.heroFocus}
                        isUsedInView={index < slotUsage.total}
                        viewLabel={PREVIEW_DEVICES[previewSize].label}
                        isFirst={index === 0}
                        isLast={index === selection.length - 1}
                        onMoveUp={() => moveSelection(item.id, 'up')}
                        onMoveDown={() => moveSelection(item.id, 'down')}
                        onFocusChange={(focus) => setFocus(item.id, focus)}
                        onRemove={() => removeFromSelection(item.id)}
                      />
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {hasStagedChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] px-6 py-4 z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Ungespeicherte Änderungen</p>
                <p className="text-xs text-gray-500">{selection.length} Bilder aktuell ausgewählt</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={isPending}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Änderungen verwerfen
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Speichert …' : 'Änderungen speichern'}
                </button>
              </div>
            </div>

            {saveError && (
              <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {saveError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ImageGridCard({
  image,
  isSelected,
  onToggle,
}: {
  image: HeroImageAsset
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-left border rounded-lg overflow-hidden transition-colors ${
        isSelected ? 'border-violet-600 ring-2 ring-violet-200' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="relative w-full aspect-square bg-gray-100">
        <Image src={image.url} alt="" fill className="object-cover" sizes="150px" />
        <span
          className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
            isSelected ? 'bg-violet-700 border-violet-700 text-white' : 'bg-white/80 border-white text-transparent'
          }`}
        >
          ✓
        </span>
        <span className="absolute bottom-1.5 right-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-white">
          {image.role}
        </span>
      </div>
      <div className="px-2 py-1.5">
        <p className="text-xs font-medium text-gray-900 truncate">{image.bandName}</p>
      </div>
    </button>
  )
}

function SelectedRow({
  image,
  position,
  heroFocus,
  isUsedInView,
  viewLabel,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onFocusChange,
  onRemove,
}: {
  image: HeroImageAsset
  position: number
  heroFocus: HeroFocus
  isUsedInView: boolean
  viewLabel: string
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onFocusChange: (focus: HeroFocus) => void
  onRemove: () => void
}) {
  return (
    <div className="px-3 py-2.5 flex items-center gap-3">
      <span className="text-xs font-mono text-gray-600 w-6 text-right shrink-0">{position}</span>

      <div className="relative w-12 h-12 shrink-0 rounded-md overflow-hidden bg-gray-100">
        <Image src={image.url} alt="" fill className="object-cover" sizes="48px" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-medium text-gray-900 truncate">{image.bandName}</p>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">{image.role}</span>
          {isUsedInView ? (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 shrink-0">
              In {viewLabel}-Ansicht verwendet
            </span>
          ) : (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
              In {viewLabel}-Ansicht ungenutzt
            </span>
          )}
        </div>
      </div>

      <select
        value={heroFocus}
        onChange={(e) => onFocusChange(e.target.value as HeroFocus)}
        className="px-2 py-1 border border-gray-300 rounded-md text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 shrink-0"
      >
        {(Object.keys(FOCUS_LABEL) as HeroFocus[]).map((f) => (
          <option key={f} value={f}>
            {FOCUS_LABEL[f]}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label="Nach oben verschieben"
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label="Nach unten verschieben"
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Aus Auswahl entfernen"
          className="w-6 h-6 flex items-center justify-center text-red-500 hover:text-red-700"
        >
          ×
        </button>
      </div>
    </div>
  )
}
