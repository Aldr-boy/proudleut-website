'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Band } from '@/lib/types/band';
import { CATEGORIES, bandMatchesCategory } from '@/lib/categories';
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

function buildUrl(params: { anlass: string | null; region: string | null; suche: string }): string {
  const p = new URLSearchParams();
  if (params.anlass) p.set('anlass', params.anlass);
  if (params.region) p.set('region', params.region.toLowerCase());
  if (params.suche) p.set('suche', params.suche);
  const qs = p.toString();
  return qs ? `/bands?${qs}` : '/bands';
}

const PLZ_RE = /^\d{5}$/;
const RADIUS_OPTIONS = [25, 50, 100] as const;
type RadiusKm = 0 | 25 | 50 | 100;

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
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(0);
  const [centerCoords, setCenterCoords] = useState<[number, number] | null>(null);
  const [plzLoading, setPlzLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);

  const gridRef = useRef<HTMLDivElement>(null);
  const scrollAfterLoad = useRef(false);
  const prevVisibleRef = useRef(0);

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
  }, [query, selectedCategory, selectedRegion, radiusKm]);

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

    setQuery((prev) => (prev !== nextQuery ? nextQuery : prev));
    setSelectedCategory((prev) => (prev !== nextCat ? nextCat : prev));
    setSelectedRegion((prev) => (prev !== nextReg ? nextReg : prev));
    setRadiusKm(0);
  }, [searchParamString]);

  const isPLZ = PLZ_RE.test(query.trim());

  // Filter-Schritt
  const filtered = shuffled.filter((band) => {
    // Textsuche – bei aktivem Radius deaktiviert (Radius ist der Filter)
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
      if (!cat || !bandMatchesCategory(band, cat)) return false;
    }

    if (selectedRegion) {
      if (getBandRegionBucket(band) !== selectedRegion) return false;
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

  const hasFilter = Boolean(query || selectedCategory || selectedRegion || radiusKm > 0);

  const resetFilters = useCallback(() => {
    setQuery('');
    setSelectedCategory(null);
    setSelectedRegion(null);
    setRadiusKm(0);
    router.push('/bands');
  }, [router]);

  const countLabel = (() => {
    if (shuffled.length === 0) return '';
    const count = displayed.length;
    const plural = count === 1 ? 'Liveband' : 'Livebands';
    if (count === 0) return 'Keine Livebands gefunden';
    if (radiusKm > 0) {
      return `${count} ${plural} im Umkreis von ${radiusKm} km um ${query.trim()} gefunden`;
    }
    if (selectedCategory && !query && !selectedRegion) {
      const cat = CATEGORIES.find((c) => c.slug === selectedCategory);
      if (cat) return `${count} ${plural} für ${cat.title} gefunden`;
    }
    if (hasFilter) return `${count} passende ${plural} gefunden`;
    return `${count} ${plural} gefunden`;
  })();

  const emptyMessage =
    radiusKm > 0
      ? `Keine Bands mit Standort im gewählten Umkreis gefunden. Versuch einen größeren Umkreis oder eine Region.`
      : isPLZ && radiusKm === 0
      ? `Keine Band direkt unter dieser PLZ gefunden. Wähle einen Umkreis oder versuch es mit dem Ortsnamen.`
      : `Keine Bands gefunden. Versuch es mit weniger Filtern.`;

  return (
    <div>
      {/* Suche */}
      <div className="mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            router.replace(buildUrl({ anlass: selectedCategory, region: selectedRegion, suche: next }));
          }}
          placeholder="Band, Ort oder PLZ suchen…"
          aria-label="Bands suchen"
          className="w-full max-w-md rounded-lg border border-pl-soft bg-pl-elevated px-4 py-2.5 text-pl-text placeholder:text-pl-text-hint text-sm focus:outline-none focus:border-pl-accent"
        />
        {/* Hinweis nur wenn PLZ-Lookup abgeschlossen und keine Koordinaten gefunden */}
        {isPLZ && !plzLoading && !centerCoords && (
          <p className="text-pl-text-hint text-xs mt-2">
            Umkreissuche für diese PLZ nicht verfügbar. Versuch es mit dem Ortsnamen.
          </p>
        )}
      </div>

      {/* Radius-Chips – nur bei erkannter PLZ mit Koordinaten */}
      {centerCoords && (
        <div
          className="flex flex-wrap gap-2 mb-4"
          role="group"
          aria-label="Umkreis auswählen"
        >
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

      {/* Anlass-Chips */}
      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Nach Anlass filtern">
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.slug;
          return (
            <button
              key={cat.slug}
              type="button"
              aria-pressed={active}
              onClick={() => {
                const next = active ? null : cat.slug;
                setSelectedCategory(next);
                router.push(buildUrl({ anlass: next, region: selectedRegion, suche: query }));
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

      {/* Region-Chips */}
      {regions.length > 0 && (
        <div
          className="flex flex-wrap gap-2 mb-8"
          role="group"
          aria-label="Nach Region filtern"
        >
          {regions.map((region) => {
            const active = selectedRegion === region;
            return (
              <button
                key={region}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  const next = active ? null : region;
                  setSelectedRegion(next);
                  router.push(buildUrl({ anlass: selectedCategory, region: next, suche: query }));
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
      )}

      {/* Zähler + Reset – nur bei aktivem Filter */}
      {shuffled.length > 0 && hasFilter && (
        <div className="flex items-center gap-4 mb-8">
          <p className="text-pl-text-hint text-sm">{countLabel}</p>
          {hasFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm text-pl-text-muted hover:text-pl-text motion-safe:transition-colors underline underline-offset-2"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}

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
