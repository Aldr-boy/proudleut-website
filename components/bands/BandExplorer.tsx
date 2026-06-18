'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Band } from '@/lib/types/band';
import { CATEGORIES, bandMatchesCategorySB } from '@/lib/categories';
import { getBandRegionBucket, REGION_ORDER } from '@/lib/regions';
import BandCard from '@/components/BandCard';
import BandCardSkeleton from '@/components/BandCardSkeleton';

type Props = {
  bands: Band[];
  regions: string[];
};

// Modul-Cache: einmal laden, nie erneut fetchen
let plzCoordsCache: Record<string, [number, number]> | null = null;

async function loadPlzCoords(): Promise<Record<string, [number, number]>> {
  if (plzCoordsCache) return plzCoordsCache;
  const res = await fetch('/data/plz-coords-de.json');
  plzCoordsCache = (await res.json()) as Record<string, [number, number]>;
  return plzCoordsCache;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Bevorzugte Anzeigereihenfolge für Bandtyp-Chips
const BANDTYP_PREFERRED_ORDER = [
  'Partyband',
  'Bayerische Partyband',
  'Bayrische Partyband',
  'Blasmusik',
  'Bigband',
  'Jazz & Lounge',
  'Akustik',
  'DJ + Live',
];

function buildUrl(params: {
  anlass: string | null;
  region: string | null;
  suche: string;
  bandtyp: string | null;
}): string {
  const p = new URLSearchParams();
  if (params.anlass) p.set('anlass', params.anlass);
  if (params.region) p.set('region', params.region.toLowerCase());
  if (params.suche) p.set('suche', params.suche);
  if (params.bandtyp) p.set('bandtyp', params.bandtyp.toLowerCase());
  const qs = p.toString();
  return qs ? `/bands?${qs}` : '/bands';
}

const PLZ_RE = /^\d{5}$/;
const RADIUS_OPTIONS = [25, 50, 100] as const;
type RadiusKm = 0 | 25 | 50 | 100;
type OpenPanel = 'anlass' | 'region' | 'bandtyp' | null;

export default function BandExplorer({ bands, regions }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [shuffled, setShuffled] = useState<Band[]>([]);
  const [query, setQuery] = useState<string>(() => searchParams.get('suche') ?? '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    const p = searchParams.get('anlass');
    return p && CATEGORIES.some((c) => c.slug === p) ? p : null;
  });
  const [selectedRegion, setSelectedRegion] = useState<string | null>(() => {
    const p = searchParams.get('region');
    if (!p) return null;
    return REGION_ORDER.find((r) => r.toLowerCase() === p.toLowerCase()) ?? null;
  });
  const [selectedBandtyp, setSelectedBandtyp] = useState<string | null>(() => {
    const raw = searchParams.get('bandtyp');
    if (!raw) return null;
    for (const b of bands) {
      if (b.category && b.category.toLowerCase() === raw.toLowerCase()) return b.category;
    }
    return null;
  });
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(0);
  const [centerCoords, setCenterCoords] = useState<[number, number] | null>(null);
  const [plzLoading, setPlzLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const scrollAfterLoad = useRef(false);
  const prevVisibleRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);

  // Bandtyp-Optionen aus den vorhandenen Banddaten ableiten (band.category = Hauptkategorie/Bandart)
  const bandtypOptions = (() => {
    const seen = new Set<string>();
    for (const b of bands) {
      if (b.category) seen.add(b.category);
    }
    const available = Array.from(seen);
    return [
      ...BANDTYP_PREFERRED_ORDER.filter((p) => available.includes(p)),
      ...available.filter((a) => !BANDTYP_PREFERRED_ORDER.includes(a)).sort(),
    ];
  })();

  useEffect(() => {
    setShuffled(shuffle(bands));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll zur ersten neuen Card nach „Weitere Bands anzeigen"
  useEffect(() => {
    if (!scrollAfterLoad.current || !gridRef.current) return;
    scrollAfterLoad.current = false;
    const firstNew = gridRef.current.children[prevVisibleRef.current] as HTMLElement | undefined;
    firstNew?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [visibleCount]);

  // Bei Filter-Änderung visibleCount zurücksetzen
  useEffect(() => {
    setVisibleCount(24);
  }, [query, selectedCategory, selectedRegion, radiusKm, selectedBandtyp]);

  // PLZ erkennen → Koordinaten lazy laden
  useEffect(() => {
    const plz = query.trim();
    if (!PLZ_RE.test(plz)) {
      setCenterCoords(null);
      setRadiusKm(0);
      setPlzLoading(false);
      return;
    }
    setPlzLoading(true);
    loadPlzCoords()
      .then((data) => {
        const coords = data[plz] ?? null;
        setCenterCoords(coords);
        if (!coords) setRadiusKm(0);
      })
      .catch(() => {
        setCenterCoords(null);
        setRadiusKm(0);
      })
      .finally(() => setPlzLoading(false));
  }, [query]);

  // URL → State bei Back/Forward (nur lesen, nie schreiben)
  const searchParamString = searchParams.toString();
  useEffect(() => {
    const p = new URLSearchParams(searchParamString);

    const nextQuery = p.get('suche') ?? '';
    const nextCatRaw = p.get('anlass');
    const nextCat = nextCatRaw && CATEGORIES.some((c) => c.slug === nextCatRaw) ? nextCatRaw : null;
    const nextRegRaw = p.get('region');
    const nextReg = nextRegRaw
      ? (REGION_ORDER.find((r) => r.toLowerCase() === nextRegRaw.toLowerCase()) ?? null)
      : null;
    const nextBandtypRaw = p.get('bandtyp');
    let nextBandtyp: string | null = null;
    if (nextBandtypRaw) {
      for (const b of bands) {
        if (b.category && b.category.toLowerCase() === nextBandtypRaw.toLowerCase()) {
          nextBandtyp = b.category;
          break;
        }
      }
    }

    setQuery((prev) => (prev !== nextQuery ? nextQuery : prev));
    setSelectedCategory((prev) => (prev !== nextCat ? nextCat : prev));
    setSelectedRegion((prev) => (prev !== nextReg ? nextReg : prev));
    setSelectedBandtyp((prev) => (prev !== nextBandtyp ? nextBandtyp : prev));
    setRadiusKm(0);
  }, [searchParamString]); // eslint-disable-line react-hooks/exhaustive-deps

  // Offenes Panel bei Klick außerhalb der Finder-Bar schließen
  useEffect(() => {
    if (!openPanel) return;
    function handleOutside(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [openPanel]);

  const isPLZ = PLZ_RE.test(query.trim());

  // Filter-Schritt
  const filtered = shuffled.filter((band) => {
    if (query && radiusKm === 0) {
      const q = query.toLowerCase();
      const loc = band.location;
      const matches =
        band.name.toLowerCase().includes(q) ||
        (band.shortDescription?.toLowerCase().includes(q) ?? false) ||
        (band.category?.toLowerCase().includes(q) ?? false) ||
        (loc.city?.toLowerCase().includes(q) ?? false) ||
        (loc.district?.toLowerCase().includes(q) ?? false) ||
        (loc.administrativeRegion?.toLowerCase().includes(q) ?? false) ||
        (loc.postalCode?.includes(q) ?? false);
      if (!matches) return false;
    }

    if (selectedCategory) {
      const cat = CATEGORIES.find((c) => c.slug === selectedCategory);
      if (!cat || !bandMatchesCategorySB(band, cat)) return false;
    }

    if (selectedRegion) {
      if (getBandRegionBucket(band) !== selectedRegion) return false;
    }

    if (selectedBandtyp) {
      if (!band.category || band.category.toLowerCase() !== selectedBandtyp.toLowerCase()) return false;
    }

    if (radiusKm > 0 && centerCoords) {
      const { latitude: lat, longitude: lon } = band.location;
      if (lat == null || lon == null) return false;
      if (haversineKm(centerCoords[0], centerCoords[1], lat, lon) > radiusKm) return false;
    }

    return true;
  });

  // Bei aktivem Radius nach Entfernung sortieren (nächste Band zuerst)
  const displayed =
    radiusKm > 0 && centerCoords
      ? [...filtered].sort((a, b) => {
          const dA = haversineKm(
            centerCoords[0], centerCoords[1],
            a.location.latitude!, a.location.longitude!
          );
          const dB = haversineKm(
            centerCoords[0], centerCoords[1],
            b.location.latitude!, b.location.longitude!
          );
          return dA - dB;
        })
      : filtered;

  const hasFilter = Boolean(query || selectedCategory || selectedRegion || radiusKm > 0 || selectedBandtyp);

  const resetFilters = useCallback(() => {
    setQuery('');
    setSelectedCategory(null);
    setSelectedRegion(null);
    setSelectedBandtyp(null);
    setRadiusKm(0);
    router.push('/bands', { scroll: false });
  }, [router]);

  // Keine Gesamtzahl im ungefilterten Zustand – nur bei aktivem Filter anzeigen
  const countLabel = (() => {
    if (shuffled.length === 0 || !hasFilter) return '';
    const count = displayed.length;
    const plural = count === 1 ? 'Liveband' : 'Livebands';
    if (count === 0) return 'Keine Livebands gefunden';
    if (radiusKm > 0) {
      return `${count} ${plural} im Umkreis von ${radiusKm} km um ${query.trim()} gefunden`;
    }
    if (selectedCategory && !query && !selectedRegion && !selectedBandtyp) {
      const cat = CATEGORIES.find((c) => c.slug === selectedCategory);
      if (cat) return `${count} ${plural} für ${cat.title} gefunden`;
    }
    return `${count} passende ${plural} gefunden`;
  })();

  const emptyMessage =
    radiusKm > 0
      ? `Keine Bands mit Standort im gewählten Umkreis gefunden. Versuch einen größeren Umkreis oder eine Region.`
      : isPLZ && radiusKm === 0
      ? `Keine Band direkt unter dieser PLZ gefunden. Wähle einen Umkreis oder versuch es mit dem Ortsnamen.`
      : `Keine Bands gefunden. Versuch es mit weniger Filtern.`;

  const activeCategoryTitle = selectedCategory
    ? (CATEGORIES.find((c) => c.slug === selectedCategory)?.title ?? null)
    : null;

  return (
    <div>
      {/* ── Finder-Bar ──────────────────────────────────────────── */}
      <div ref={barRef} className="relative mb-6">

        {/* Bar: vier Segmente in einer Zeile (Desktop) / gestapelt (Mobile) */}
        <div className="flex flex-col sm:flex-row rounded-xl border border-pl-soft bg-pl-elevated shadow-sm overflow-hidden">

          {/* Segment 1 – Suche */}
          <div className="flex items-center gap-2.5 px-4 py-3.5 sm:py-4 flex-1 min-w-0 border-b border-pl-soft sm:border-b-0 focus-within:bg-black/[0.03] motion-safe:transition-colors">
            <svg
              className="w-4 h-4 text-pl-text-hint flex-shrink-0"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                router.replace(
                  buildUrl({ anlass: selectedCategory, region: selectedRegion, suche: next, bandtyp: selectedBandtyp }),
                  { scroll: false }
                );
              }}
              placeholder="Bandname, Ort oder PLZ"
              aria-label="Bands suchen"
              className="flex-1 min-w-0 bg-transparent text-pl-text placeholder:text-pl-text-hint text-sm focus:outline-none"
            />
          </div>

          {/* Segment 2 – Wofür? (Anlass) */}
          <button
            type="button"
            aria-expanded={openPanel === 'anlass'}
            aria-haspopup="listbox"
            onClick={() => setOpenPanel(openPanel === 'anlass' ? null : 'anlass')}
            className={`flex items-center justify-between gap-3 px-5 py-3.5 sm:py-4 text-left sm:min-w-[180px] border-b border-pl-soft sm:border-b-0 sm:border-l group motion-safe:transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent/40 focus-visible:ring-inset ${openPanel === 'anlass' ? 'bg-pl-accent-subtle' : ''}`}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-text-hint leading-none mb-1">
                Wofür
              </p>
              <p className={`text-sm truncate leading-snug ${activeCategoryTitle ? 'text-pl-text font-medium' : 'text-pl-text-muted'}`}>
                {activeCategoryTitle ?? 'Anlass wählen'}
              </p>
            </div>
            <svg
              className={`w-4 h-4 flex-shrink-0 motion-safe:transition-all ${openPanel === 'anlass' ? 'text-pl-accent rotate-180' : 'text-pl-text-hint group-hover:text-pl-accent/70'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Segment 3 – Wo? (Region) */}
          <button
            type="button"
            aria-expanded={openPanel === 'region'}
            aria-haspopup="listbox"
            onClick={() => setOpenPanel(openPanel === 'region' ? null : 'region')}
            className={`flex items-center justify-between gap-3 px-5 py-3.5 sm:py-4 text-left sm:min-w-[128px] border-b border-pl-soft sm:border-b-0 sm:border-l group motion-safe:transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent/40 focus-visible:ring-inset ${openPanel === 'region' ? 'bg-pl-accent-subtle' : ''}`}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-text-hint leading-none mb-1">
                Region
              </p>
              <p className={`text-sm truncate leading-snug ${selectedRegion ? 'text-pl-text font-medium' : 'text-pl-text-muted'}`}>
                {selectedRegion ?? 'Region wählen'}
              </p>
            </div>
            <svg
              className={`w-4 h-4 flex-shrink-0 motion-safe:transition-all ${openPanel === 'region' ? 'text-pl-accent rotate-180' : 'text-pl-text-hint group-hover:text-pl-accent/70'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Segment 4 – Bandtyp? */}
          <button
            type="button"
            aria-expanded={openPanel === 'bandtyp'}
            aria-haspopup="listbox"
            onClick={() => setOpenPanel(openPanel === 'bandtyp' ? null : 'bandtyp')}
            className={`flex items-center justify-between gap-3 px-5 py-3.5 sm:py-4 text-left sm:min-w-[172px] sm:border-l border-pl-soft group motion-safe:transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent/40 focus-visible:ring-inset ${openPanel === 'bandtyp' ? 'bg-pl-accent-subtle' : ''}`}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-text-hint leading-none mb-1">
                Bandtyp
              </p>
              <p className={`text-sm truncate leading-snug ${selectedBandtyp ? 'text-pl-text font-medium' : 'text-pl-text-muted'}`}>
                {selectedBandtyp ?? 'Egal'}
              </p>
            </div>
            <svg
              className={`w-4 h-4 flex-shrink-0 motion-safe:transition-all ${openPanel === 'bandtyp' ? 'text-pl-accent rotate-180' : 'text-pl-text-hint group-hover:text-pl-accent/70'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Panel – Anlass */}
        {openPanel === 'anlass' && (
          <div
            role="listbox"
            aria-label="Anlass auswählen"
            className="absolute left-0 right-0 top-full mt-2 z-20 rounded-xl border border-pl-soft bg-pl-elevated shadow-lg p-5"
          >
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      const next = active ? null : cat.slug;
                      setSelectedCategory(next);
                      setOpenPanel(null);
                      router.push(
                        buildUrl({ anlass: next, region: selectedRegion, suche: query, bandtyp: selectedBandtyp }),
                        { scroll: false }
                      );
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-sm border motion-safe:transition-colors ${
                      active
                        ? 'bg-pl-accent text-white border-pl-accent'
                        : 'border-pl-soft text-pl-text-muted hover:border-pl-accent hover:text-pl-text'
                    }`}
                  >
                    {cat.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Panel – Region */}
        {openPanel === 'region' && regions.length > 0 && (
          <div
            role="listbox"
            aria-label="Region auswählen"
            className="absolute left-0 right-0 top-full mt-2 z-20 rounded-xl border border-pl-soft bg-pl-elevated shadow-lg p-5"
          >
            <div className="flex flex-wrap gap-2">
              {regions.map((region) => {
                const active = selectedRegion === region;
                return (
                  <button
                    key={region}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      const next = active ? null : region;
                      setSelectedRegion(next);
                      setOpenPanel(null);
                      router.push(
                        buildUrl({ anlass: selectedCategory, region: next, suche: query, bandtyp: selectedBandtyp }),
                        { scroll: false }
                      );
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-sm border motion-safe:transition-colors ${
                      active
                        ? 'bg-pl-accent text-white border-pl-accent'
                        : 'border-pl-soft text-pl-text-muted hover:border-pl-accent hover:text-pl-text'
                    }`}
                  >
                    {region}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Panel – Bandtyp */}
        {openPanel === 'bandtyp' && bandtypOptions.length > 0 && (
          <div
            role="listbox"
            aria-label="Bandtyp auswählen"
            className="absolute left-0 right-0 top-full mt-2 z-20 rounded-xl border border-pl-soft bg-pl-elevated shadow-lg p-5"
          >
            <div className="flex flex-wrap gap-2">
              {bandtypOptions.map((typ) => {
                const active = selectedBandtyp === typ;
                return (
                  <button
                    key={typ}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      const next = active ? null : typ;
                      setSelectedBandtyp(next);
                      setOpenPanel(null);
                      router.push(
                        buildUrl({ anlass: selectedCategory, region: selectedRegion, suche: query, bandtyp: next }),
                        { scroll: false }
                      );
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-sm border motion-safe:transition-colors ${
                      active
                        ? 'bg-pl-accent text-white border-pl-accent'
                        : 'border-pl-soft text-pl-text-muted hover:border-pl-accent hover:text-pl-text'
                    }`}
                  >
                    {typ}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {/* ── Ende Finder-Bar ─────────────────────────────────────── */}

      {/* PLZ-Hinweis – nur wenn PLZ-Lookup abgeschlossen und keine Koordinaten gefunden */}
      {isPLZ && !plzLoading && !centerCoords && (
        <p className="text-pl-text-hint text-xs mb-4">
          Umkreissuche für diese PLZ nicht verfügbar. Versuch es mit dem Ortsnamen.
        </p>
      )}

      {/* Radius-Chips – nur bei erkannter PLZ mit Koordinaten */}
      {centerCoords && (
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Umkreis auswählen">
          {RADIUS_OPTIONS.map((km) => {
            const active = radiusKm === km;
            return (
              <button
                key={km}
                type="button"
                aria-pressed={active}
                onClick={() => setRadiusKm(active ? 0 : km)}
                className={`px-3.5 py-1.5 rounded-full text-sm border motion-safe:transition-colors ${
                  active
                    ? 'bg-pl-accent text-white border-pl-accent'
                    : 'border-pl-soft text-pl-text-muted hover:border-pl-accent hover:text-pl-text'
                }`}
              >
                {km} km
              </button>
            );
          })}
        </div>
      )}

      {/*
        Zähler + Reset: immer als Spacer gerendert (konsistenter Abstand zum Grid),
        Inhalt nur wenn ein Filter aktiv ist – keine initiale Gesamtzahl.
      */}
      <div className="mb-8">
        {shuffled.length > 0 && hasFilter && (
          <div className="flex items-center gap-4">
            <p className="text-pl-text-hint text-sm">{countLabel}</p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm text-pl-text-muted hover:text-pl-text motion-safe:transition-colors underline underline-offset-2"
            >
              Filter zurücksetzen
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      {shuffled.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 24 }).map((_, i) => (
            <BandCardSkeleton key={i} />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-pl-text-muted mb-4">{emptyMessage}</p>
          <button
            type="button"
            onClick={resetFilters}
            className="text-sm text-pl-accent hover:opacity-80 motion-safe:transition-opacity"
          >
            Alle Bands anzeigen
          </button>
        </div>
      ) : (
        <>
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayed.slice(0, visibleCount).map((band, index) => (
              <BandCard key={band.id} band={band} priority={index < 6} />
            ))}
          </div>
          {visibleCount < displayed.length && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => {
                  prevVisibleRef.current = visibleCount;
                  scrollAfterLoad.current = true;
                  setVisibleCount((n) => n + 24);
                }}
                className="px-6 py-3 rounded-lg border border-pl-soft text-pl-text-muted text-sm hover:border-pl-accent hover:text-pl-text motion-safe:transition-colors"
              >
                Weitere Bands anzeigen
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
