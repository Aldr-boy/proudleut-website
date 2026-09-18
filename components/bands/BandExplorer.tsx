'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Band } from '@/lib/types/band';
import { FINDER_OCCASIONS, bandMatchesFinderOccasion } from '@/lib/finderOccasions';
import { getBandRegionBucket, REGION_ORDER } from '@/lib/regions';
import { resolveMoodSlugParam, bandMatchesMood } from '@/lib/moods/bandMoodFilter';
import { buildFinderFilterUrl, buildOccasionNavUrl } from '@/lib/bands/finderRouting';
import { resolveBandFinderThemeNav } from '@/lib/bands/bandFinderThemes';
import type { BandFinderThemeKey } from '@/lib/bands/bandFinderThemes';
import type { BandFinderThemeImage } from '@/lib/bands/bandFinderThemeImages';
import { useAnfrageStore } from '@/stores/anfrageStore';
import { MerklisteFlow } from '@/components/band/MerklisteFlow';
import BandCard from '@/components/BandCard';
import BandCardSkeleton from '@/components/BandCardSkeleton';

type Props = {
  bands: Band[];
  regions: string[];
  // Gesetzt, wenn BandExplorer innerhalb einer /veranstaltung/[slug]-Seite
  // mit bereits feststehendem Seiten-Anlass eingebunden wird (Paket
  // "Finder auf Veranstaltungsseiten wiederverwenden"). Der Slug ist dann
  // Source of Truth fuer "Wofuer" -- siehe R4 im Auftrag: ein
  // konkurrierender ?anlass=-Query-Param wird ignoriert, "Wofuer" wird zur
  // Navigation (buildOccasionNavUrl) statt zum In-Place-Filter, und
  // suche/region/bandtyp/mood-URLs bleiben auf der aktuellen
  // Veranstaltungsroute statt auf /bands zu wechseln. Auf /bands (Prop
  // nicht gesetzt) bleibt das gesamte bisherige Verhalten unveraendert.
  lockedOccasion?: string;
  // Sechs Themen-Bilder fuer den neuen kompakten Suchkopf (Auftrag
  // "Bandfinder-Redesign"), serverseitig einmal pro Seite aufgeloest
  // (lib/bands/bandFinderThemeImages.ts) und hier nur noch gerendert --
  // BandExplorer selbst startet keine eigene Bildabfrage.
  themeImages: Record<BandFinderThemeKey, BandFinderThemeImage>;
};

// Modul-Cache: einmal laden, nie erneut fetchen
let plzCoordsCache: Record<string, [number, number]> | null = null;

async function loadPlzCoords(): Promise<Record<string, [number, number]>> {
  if (plzCoordsCache) return plzCoordsCache;
  const res = await fetch('/data/plz-coords.json');
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
  mood: string | null;
}): string {
  const p = new URLSearchParams();
  if (params.anlass) p.set('anlass', params.anlass);
  if (params.region) p.set('region', params.region.toLowerCase());
  if (params.suche) p.set('suche', params.suche);
  if (params.bandtyp) p.set('bandtyp', params.bandtyp.toLowerCase());
  if (params.mood) p.set('mood', params.mood);
  const qs = p.toString();
  return qs ? `/bands?${qs}` : '/bands';
}

const PLZ_RE = /^\d{4,5}$/;
const RADIUS_OPTIONS = [25, 50, 100] as const;
type RadiusKm = 0 | 25 | 50 | 100;
type OpenPanel = 'anlass' | 'region' | 'bandtyp' | 'mood' | null;

export default function BandExplorer({ bands, regions, lockedOccasion, themeImages }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const baseRoute = lockedOccasion ? `/veranstaltung/${lockedOccasion}` : '/bands';

  // Merkliste -- bestehender, globaler Store (stores/anfrageStore.ts),
  // bereits ueber components/band/MerklisteBar.tsx (in app/layout.tsx)
  // sitenweit angebunden. Hier keine zweite parallele Merkliste, nur ein
  // zusaetzlicher, gut auffindbarer Zugang direkt in der Ergebniszeile --
  // oeffnet denselben bestehenden MerklisteFlow (Sammlung ansehen -> bewusst
  // fuer eine Anfrage auswaehlen -> Formular) wie MerklisteBar.
  const anfrageBands = useAnfrageStore((s) => s.bands);
  const [merklisteOpen, setMerklisteOpen] = useState(false);

  // Deterministischer Initial-State: identisch zur eingehenden bands-Prop,
  // damit Server- und erster Client-Render (Hydration) exakt uebereinstimmen
  // -- keine Randomisierung waehrend der State-Initialisierung, da Server
  // und Browser sonst unterschiedliche Reihenfolgen erzeugen koennten
  // (Hydration-Mismatch-Risiko). Die eigentliche Zufallssortierung fuer
  // Nutzer bleibt unveraendert im Mount-Effekt direkt darunter erhalten.
  const [shuffled, setShuffled] = useState<Band[]>(bands);
  const [query, setQuery] = useState<string>(() => searchParams.get('suche') ?? '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    if (lockedOccasion) return lockedOccasion;
    const p = searchParams.get('anlass');
    return p && FINDER_OCCASIONS.some((c) => c.slug === p) ? p : null;
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
  const [selectedMood, setSelectedMood] = useState<string | null>(() => {
    const raw = searchParams.get('mood');
    const availableMoodSlugs = bands.flatMap((b) => b.moods.map((m) => m.slug));
    return resolveMoodSlugParam(raw, availableMoodSlugs);
  });
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(0);
  const [centerCoords, setCenterCoords] = useState<[number, number] | null>(null);
  const [plzLoading, setPlzLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  // Mobiler, kompakter "Filter"-Zugang (Auftrag "Bandfinder-Redesign --
  // Nachgang", Abschnitt 4): Wofuer/Region/Bandtyp/Klingt-nach waren bisher
  // auf Mobil immer als lange gestapelte Liste sichtbar -- kein kompakter
  // Zugang mit Anzahl. Suche bleibt bewusst immer sichtbar, nur die
  // uebrigen vier Segmente klappen dahinter ein. Ab lg (Desktop) bleibt
  // das bestehende Verhalten (alle Segmente immer sichtbar) unveraendert.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const scrollAfterLoad = useRef(false);
  const prevVisibleRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);
  const finderSentinelRef = useRef<HTMLDivElement>(null);
  const explorerEndSentinelRef = useRef<HTMLDivElement>(null);
  const [finderPassed, setFinderPassed] = useState(false);
  const [explorerEndReached, setExplorerEndReached] = useState(false);

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

  // Mood-Optionen ("Klingt nach") aus den aktuell geladenen Banddaten
  // ableiten, analog zu bandtypOptions -- kein statischer Katalog wie bei
  // CATEGORIES, da Moods rein datengetrieben sind (siehe
  // lib/moods/bandMoodFilter.ts).
  const moodOptions = (() => {
    const seen = new Map<string, string>();
    for (const b of bands) {
      for (const m of b.moods) {
        if (!seen.has(m.slug)) seen.set(m.slug, m.name);
      }
    }
    return Array.from(seen, ([slug, name]) => ({ slug, name })).sort((a, b) =>
      a.name.localeCompare(b.name, 'de')
    );
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
  }, [query, selectedCategory, selectedRegion, radiusKm, selectedBandtyp, selectedMood]);

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
    // R4: der Seiten-Anlass (lockedOccasion) ist Source of Truth -- ein
    // konkurrierender ?anlass=-Param wird im Veranstaltungsseiten-Kontext
    // beim URL->State-Sync ignoriert (auch bei Back/Forward).
    const nextCat = lockedOccasion
      ? lockedOccasion
      : (() => {
          const nextCatRaw = p.get('anlass');
          return nextCatRaw && FINDER_OCCASIONS.some((c) => c.slug === nextCatRaw) ? nextCatRaw : null;
        })();
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
    const nextMoodRaw = p.get('mood');
    const availableMoodSlugs = bands.flatMap((b) => b.moods.map((m) => m.slug));
    const nextMood = resolveMoodSlugParam(nextMoodRaw, availableMoodSlugs);

    setQuery((prev) => (prev !== nextQuery ? nextQuery : prev));
    setSelectedCategory((prev) => (prev !== nextCat ? nextCat : prev));
    setSelectedRegion((prev) => (prev !== nextReg ? nextReg : prev));
    setSelectedBandtyp((prev) => (prev !== nextBandtyp ? nextBandtyp : prev));
    setSelectedMood((prev) => (prev !== nextMood ? nextMood : prev));
    setRadiusKm(0);
  }, [searchParamString, lockedOccasion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sticky-Zugang "Auswahl verfeinern" -- Sichtbarkeit ausschliesslich
  // ueber zwei IntersectionObserver auf dedizierten 1px-Sentinels
  // (kein Scroll-Listener), sinngemaess identisches Muster wie
  // components/band/BandFloatingCta.tsx (PR #55):
  //   finderPassed        -- der Finder-Sentinel (unmittelbar NACH der
  //                           Finder-Bar) liegt bereits oberhalb der
  //                           Observer-Grenze
  //   explorerEndReached  -- der Explorer-Ende-Sentinel ist sichtbar
  //                           oder bereits passiert
  //   stickyVisible = finderPassed && !explorerEndReached
  // Ein Sentinel mit isIntersecting === false kann entweder noch
  // unterhalb des Viewports liegen oder bereits oberhalb passiert sein --
  // beide Faelle werden hier bewusst unterschieden (ueber
  // rootBounds.top bzw. den dokumentierten Fallback), statt naiv
  // "!isIntersecting" gleichzusetzen.
  useEffect(() => {
    const finderSentinel = finderSentinelRef.current;
    const endSentinel = explorerEndSentinelRef.current;
    if (!finderSentinel || !endSentinel) return;

    // rootMargin '-8px 0px 0px 0px' gilt ausschliesslich fuer den
    // Finder-Observer -- bewusst kein pixelgenauer Nachbau der
    // Navigationshoehe, nur eine kleine deterministische Toleranz
    // (identisch zu BandFloatingCta).
    const finderObserver = new IntersectionObserver(([entry]) => {
      const boundary = entry.rootBounds ? entry.rootBounds.top : 8;
      const isAboveBoundary = entry.boundingClientRect.top < boundary;
      setFinderPassed(!entry.isIntersecting && isAboveBoundary);
    }, { rootMargin: '-8px 0px 0px 0px' });

    // End-Observer nutzt den Default-rootMargin.
    const endObserver = new IntersectionObserver(([entry]) => {
      const boundary = entry.rootBounds ? entry.rootBounds.top : 0;
      const isAboveBoundary = entry.boundingClientRect.top < boundary;
      setExplorerEndReached(entry.isIntersecting || isAboveBoundary);
    });

    finderObserver.observe(finderSentinel);
    endObserver.observe(endSentinel);

    return () => {
      finderObserver.disconnect();
      endObserver.disconnect();
    };
  }, []);

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
      const cat = FINDER_OCCASIONS.find((c) => c.slug === selectedCategory);
      if (!cat || !bandMatchesFinderOccasion(band, cat)) return false;
    }

    if (selectedRegion) {
      if (getBandRegionBucket(band) !== selectedRegion) return false;
    }

    if (selectedBandtyp) {
      if (!band.category || band.category.toLowerCase() !== selectedBandtyp.toLowerCase()) return false;
    }

    if (!bandMatchesMood(band.moods, selectedMood)) return false;

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

  // Im Veranstaltungsseiten-Kontext ist selectedCategory immer ==
  // lockedOccasion -- Seitenkontext, kein vom Nutzer abwaehlbarer Filter
  // (siehe Prop-Kommentar oben) -- zaehlt deshalb dort bewusst NICHT als
  // Filter fuer hasFilter. Auf /bands unveraendert wie bisher.
  const hasFilter = Boolean(
    query || (!lockedOccasion && selectedCategory) || selectedRegion || radiusKm > 0 || selectedBandtyp || selectedMood
  );

  const resetFilters = useCallback(() => {
    setQuery('');
    if (!lockedOccasion) setSelectedCategory(null);
    setSelectedRegion(null);
    setSelectedBandtyp(null);
    setSelectedMood(null);
    setRadiusKm(0);
    router.push(baseRoute, { scroll: false });
  }, [router, lockedOccasion, baseRoute]);

  // Keine Gesamtzahl im ungefilterten Zustand -- ausser im
  // Veranstaltungsseiten-Kontext: dort ist die anlassbezogene Zahl (z. B.
  // "110 Livebands fuer Hochzeit gefunden") bereits im Initialzustand
  // sinnvoll (siehe Auftrag Abschnitt "ERGEBNISZAHL").
  const countLabel = (() => {
    if (shuffled.length === 0 || !(hasFilter || lockedOccasion)) return '';
    const count = displayed.length;
    const plural = count === 1 ? 'Liveband' : 'Livebands';
    if (count === 0) return 'Keine Livebands gefunden';
    if (radiusKm > 0) {
      return `${count} ${plural} im Umkreis von ${radiusKm} km um ${query.trim()} gefunden`;
    }
    if (selectedCategory && !query && !selectedRegion && !selectedBandtyp && !selectedMood) {
      const cat = FINDER_OCCASIONS.find((c) => c.slug === selectedCategory);
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
    ? (FINDER_OCCASIONS.find((c) => c.slug === selectedCategory)?.title ?? null)
    : null;

  // Einzeln entfernbare aktive Filter-Chips (Auftrag "Bandfinder-Redesign --
  // Nachgang", Abschnitt 4): bisher gab es nur "Filter zurücksetzen" fuer
  // alle Filter zusammen. Jeder Chip setzt ausschliesslich seinen eigenen
  // Filter zurueck und nutzt dafuer dieselben bereits bestehenden Setter/
  // URL-Builder wie die Finder-Bar selbst -- keine neue Filterlogik. Der
  // Seiten-Anlass (lockedOccasion) ist bewusst kein entfernbarer Chip
  // (Kontext der Seite, siehe hasFilter-Kommentar oben).
  const activeFilterChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (query) {
    activeFilterChips.push({
      key: 'suche',
      label: `Suche: „${query}"`,
      onRemove: () => {
        setQuery('');
        router.replace(buildFilterUrl({ suche: '' }), { scroll: false });
      },
    });
  }
  if (!lockedOccasion && selectedCategory) {
    activeFilterChips.push({
      key: 'anlass',
      label: activeCategoryTitle ?? selectedCategory,
      onRemove: () => {
        setSelectedCategory(null);
        router.push(
          buildUrl({ anlass: null, region: selectedRegion, suche: query, bandtyp: selectedBandtyp, mood: selectedMood }),
          { scroll: false }
        );
      },
    });
  }
  if (selectedRegion) {
    activeFilterChips.push({
      key: 'region',
      label: selectedRegion,
      onRemove: () => {
        setSelectedRegion(null);
        router.push(buildFilterUrl({ region: null }), { scroll: false });
      },
    });
  }
  if (selectedBandtyp) {
    activeFilterChips.push({
      key: 'bandtyp',
      label: selectedBandtyp,
      onRemove: () => {
        setSelectedBandtyp(null);
        router.push(buildFilterUrl({ bandtyp: null }), { scroll: false });
      },
    });
  }
  if (selectedMood) {
    activeFilterChips.push({
      key: 'mood',
      label: moodOptions.find((m) => m.slug === selectedMood)?.name ?? selectedMood,
      onRemove: () => {
        setSelectedMood(null);
        router.push(buildFilterUrl({ mood: null }), { scroll: false });
      },
    });
  }

  // Sticky-"Auswahl verfeinern": nicht sichtbar, solange BandExplorer noch
  // keine geladene/shuffled Ergebnismenge hat (kein Mount-Flash), sonst
  // ausschliesslich ueber die beiden Sentinel-Observer bestimmt.
  const stickyVisible = shuffled.length > 0 && finderPassed && !explorerEndReached;
  const stickyCount = displayed.length;
  const stickyLabel = `Auswahl verfeinern · ${stickyCount} ${stickyCount === 1 ? 'Band' : 'Bands'}`;

  function scrollToFinder() {
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    barRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  // URL fuer suche/region/bandtyp/mood-Aenderungen: auf /bands unveraendert
  // ueber buildUrl (inkl. anlass), im Veranstaltungsseiten-Kontext bleibt
  // die Route baseRoute (/veranstaltung/<slug>) ohne anlass-Param (R4).
  function buildFilterUrl(overrides: {
    region?: string | null;
    suche?: string;
    bandtyp?: string | null;
    mood?: string | null;
  }): string {
    const region = overrides.region !== undefined ? overrides.region : selectedRegion;
    const suche = overrides.suche !== undefined ? overrides.suche : query;
    const bandtyp = overrides.bandtyp !== undefined ? overrides.bandtyp : selectedBandtyp;
    const mood = overrides.mood !== undefined ? overrides.mood : selectedMood;
    if (lockedOccasion) {
      return buildFinderFilterUrl(baseRoute, { region, suche, bandtyp, mood });
    }
    return buildUrl({ anlass: selectedCategory, region, suche, bandtyp, mood });
  }

  // Sechs Themen-Kacheln des neuen Suchkopfs -- Href/Aktiv-Status kommen
  // aus der ausgelagerten, direkt getesteten resolveBandFinderThemeNav()
  // (lib/bands/bandFinderThemes.ts), die ihrerseits ausschliesslich die
  // bereits bestehenden buildFinderFilterUrl()/buildOccasionNavUrl()
  // nutzt -- keine neue Routing-Logik. "Alle Bands" hat keinen Anlass-
  // Slug und entfernt den Anlass-Filter, die uebrigen Filter (Region/
  // Suche/Bandtyp/Mood) bleiben erhalten.
  const themeNavItems = resolveBandFinderThemeNav(
    lockedOccasion,
    selectedCategory,
    { region: selectedRegion, suche: query, bandtyp: selectedBandtyp, mood: selectedMood },
    buildFinderFilterUrl,
    buildOccasionNavUrl
  ).map((theme) => ({ ...theme, image: themeImages[theme.key] }));

  // Such-Icon + Input als eigene Render-Funktion (Auftrag "Bandfinder-
  // Redesign -- Layout-Nachgang", Suchfeld auf Desktop nach rechts):
  // dieselbe Eingabe wird bewusst zweimal im DOM gerendert -- einmal in
  // ihrer mobilen Position (links neben dem Filter-Zugang, oben in der
  // Bar) und einmal in ihrer Desktop-Position (rechtes Ende der Bar,
  // ab lg). Grund: die sichtbare Reihenfolge unterscheidet sich bewusst
  // je Breakpoint (mobil: Suche vor den vier Filter-Segmenten; Desktop:
  // Suche nach ihnen) -- eine reine CSS-`order`-Verschiebung wuerde dort
  // die Tab-Reihenfolge vom sichtbaren Layout entkoppeln. Da immer genau
  // eine der beiden Varianten ueber Tailwind `hidden`/`lg:hidden` aus dem
  // Layout UND (display:none) aus der Tab-Reihenfolge faellt, gibt es nie
  // zwei gleichzeitig fokussierbare Instanzen -- beide binden denselben
  // `query`-State, bleiben also immer synchron. Keine neue Filterlogik.
  function renderSearchField() {
    return (
      <>
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
              buildFilterUrl({ suche: next }),
              { scroll: false }
            );
          }}
          placeholder="Bandname, Ort oder PLZ"
          aria-label="Bands suchen"
          className="flex-1 min-w-0 bg-transparent text-pl-text placeholder:text-pl-text-hint text-sm focus:outline-none"
        />
      </>
    );
  }

  return (
    <div>
      {/* ── Warm getoenter Suchbereich: Themenraster + Filterleiste ──
          (Auftrag "Bandfinder-Redesign -- Layout-Nachgang"). Aeussere
          Flaeche bg-pl-paper ohne eigene Breitenbegrenzung -- setzt sich
          nahtlos an components/bands/BandFinderPageHead.tsx (identischer
          Farbton, direkt davor auf der Seite) fort, wirkt dadurch wie ein
          einziger zusammenhaengender Bereich, obwohl es zwei Elemente sind.
          Inhalt bleibt im bestehenden 1140px-Container (pl-container-shell).
          pb-6/md:pb-8 sorgt fuer den geforderten Abstand, bevor die Flaeche
          unterhalb der Filterleiste endet -- Ergebniszahl/Chips/Merkliste/
          Bandkarten (siehe zweiter Container weiter unten) stehen bewusst
          wieder auf dem bisherigen Seitenhintergrund, keine Umrandung/
          Schattenkante um den Suchbereich. */}
      <div className="bg-pl-paper pb-6 md:pb-8">
        <div className="pl-container-shell px-4 sm:px-6">
      {/* ── Themen-Suchkopf ─────────────────────────────────────── */}
      {/* Sechs Themen-Einstiege (Auftrag "Bandfinder-Redesign"): echte
          Links (next/link, kein reines onClick) mit aria-current fuer den
          aktiven Einstieg. Desktop 3 Spalten/2 Reihen, Mobil 2 Spalten/3
          Reihen -- Standard-Tailwind-Grid, keine eigene Breakpoint-Logik.
          Schriftgewicht bewusst konstant (font-semibold in jedem Zustand):
          ein gewichtsabhaengiger Wechsel wuerde bei den beiden langen
          Bezeichnungen ("Stadt- & Buergerfest", "Konzert, Club & Festival")
          die Textbreite/den Umbruch veraendern -- die Auswahl wird
          stattdessen ueber Flaeche, Rahmen und Haekchen markiert. */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-5 pt-4 md:pt-5">
        {themeNavItems.map((theme) => (
          <Link
            key={theme.key}
            href={theme.href}
            aria-current={theme.active ? 'page' : undefined}
            className={`relative flex items-center gap-2.5 rounded-xl border px-2.5 py-2 pr-7 md:px-3 md:py-2.5 md:pr-8 text-left
                       motion-safe:transition-colors focus:outline-none focus-visible:outline-2
                       focus-visible:outline-offset-2 focus-visible:outline-[var(--pl-accent)]
                       ${theme.active ? 'border-pl-accent bg-[color-mix(in_srgb,var(--pl-accent)_12%,var(--pl-accent-subtle))]' : 'border-transparent hover:bg-black/[0.03]'}`}
          >
            <span className="relative w-10 h-10 md:w-11 md:h-11 rounded-lg overflow-hidden shrink-0 bg-pl-elevated">
              <Image src={theme.image.url} alt="" fill sizes="44px" className="object-cover" />
            </span>
            <span className={`text-sm font-semibold leading-snug ${theme.active ? 'text-pl-accent-deep' : 'text-pl-text'}`}>
              {theme.label}
            </span>
            {theme.active && (
              <svg
                className="absolute right-2 md:right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pl-accent"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
              </svg>
            )}
          </Link>
        ))}
      </div>

      {/* ── Finder-Bar ──────────────────────────────────────────── */}
      {/* scroll-mt: bestehende --pl-nav-height-CSS-Variable (Header.tsx,
          live gemessen), damit der Finder nach scrollToFinder() nicht
          unter der fixen Navigation verschwindet -- keine eigene
          JS-Navigationshoehenberechnung. */}
      <div ref={barRef} className="relative scroll-mt-[var(--pl-nav-height)]">

        {/* Bar: fuenf Segmente in einer Zeile (Desktop ab lg/1024px) / gestapelt
            (Mobile bis Tablet, < 1024px). Row-Modus erst ab lg, da die vier
            festen Segment-Mindestbreiten (180+128+172+172=652px) zusammen mit
            der Suche bei sm/md (640-1023px) nicht mehr in die verfuegbare
            Breite passen -- overflow-hidden hat das dann abgeschnitten statt
            umzubrechen (Codex P1, siehe Commit-Beschreibung). */}
        <div className="flex flex-col lg:flex-row rounded-xl border border-pl-soft bg-pl-elevated shadow-sm overflow-hidden">

          {/* Mobile Kopfzeile – Suche (links) + Filter-Zugang (rechts),
              nebeneinander. Ab lg vollstaendig ausgeblendet (dort steht die
              Suche als eigenes Segment am rechten Ende der Bar, siehe
              unten) -- damit nie zwei fokussierbare Sucheingaben
              gleichzeitig existieren (siehe renderSearchField-Kommentar). */}
          <div className="flex lg:hidden items-stretch border-b border-pl-soft">
            <div className="flex items-center gap-2.5 px-4 py-3.5 flex-1 min-w-0 focus-within:bg-black/[0.03] motion-safe:transition-colors">
              {renderSearchField()}
            </div>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              aria-expanded={mobileFiltersOpen}
              className="flex items-center justify-between gap-3 px-4 py-3 border-l border-pl-soft motion-safe:transition-colors hover:bg-black/[0.03]"
            >
              <span className="text-sm font-medium text-pl-text">
                Filter{activeFilterChips.length > 0 ? ` · ${activeFilterChips.length}` : ''}
              </span>
              <svg
                className={`w-4 h-4 flex-shrink-0 text-pl-text-hint motion-safe:transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Segment 2 – Wofür? (Anlass) */}
          <button
            type="button"
            aria-expanded={openPanel === 'anlass'}
            aria-haspopup="listbox"
            onClick={() => setOpenPanel(openPanel === 'anlass' ? null : 'anlass')}
            className={`${mobileFiltersOpen ? 'flex' : 'hidden'} lg:flex items-center justify-between gap-3 px-5 py-3.5 lg:py-4 text-left lg:min-w-[180px] border-b border-pl-soft lg:border-b-0 group motion-safe:transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent/40 focus-visible:ring-inset ${openPanel === 'anlass' ? 'bg-pl-accent-subtle' : ''}`}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-text-muted leading-none mb-1">
                Wofür
              </p>
              <p className={`text-sm truncate leading-snug ${activeCategoryTitle ? 'text-pl-text font-medium' : 'text-pl-text-muted'}`}>
                {activeCategoryTitle ?? 'Alle Anlässe'}
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
            className={`${mobileFiltersOpen ? 'flex' : 'hidden'} lg:flex items-center justify-between gap-3 px-5 py-3.5 lg:py-4 text-left lg:min-w-[128px] border-b border-pl-soft lg:border-b-0 lg:border-l group motion-safe:transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent/40 focus-visible:ring-inset ${openPanel === 'region' ? 'bg-pl-accent-subtle' : ''}`}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-text-muted leading-none mb-1">
                Region
              </p>
              <p className={`text-sm truncate leading-snug ${selectedRegion ? 'text-pl-text font-medium' : 'text-pl-text-muted'}`}>
                {selectedRegion ?? 'Alle Regionen'}
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
            className={`${mobileFiltersOpen ? 'flex' : 'hidden'} lg:flex items-center justify-between gap-3 px-5 py-3.5 lg:py-4 text-left lg:min-w-[172px] border-b border-pl-soft lg:border-b-0 lg:border-l group motion-safe:transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent/40 focus-visible:ring-inset ${openPanel === 'bandtyp' ? 'bg-pl-accent-subtle' : ''}`}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-text-muted leading-none mb-1">
                Bandtyp
              </p>
              <p className={`text-sm truncate leading-snug ${selectedBandtyp ? 'text-pl-text font-medium' : 'text-pl-text-muted'}`}>
                {selectedBandtyp ?? 'Alle Bandarten'}
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

          {/* Segment 5 – Klingt nach? */}
          <button
            type="button"
            aria-expanded={openPanel === 'mood'}
            aria-haspopup="listbox"
            onClick={() => setOpenPanel(openPanel === 'mood' ? null : 'mood')}
            className={`${mobileFiltersOpen ? 'flex' : 'hidden'} lg:flex items-center justify-between gap-3 px-5 py-3.5 lg:py-4 text-left lg:min-w-[172px] lg:border-l border-pl-soft group motion-safe:transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent/40 focus-visible:ring-inset ${openPanel === 'mood' ? 'bg-pl-accent-subtle' : ''}`}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-pl-text-muted leading-none mb-1">
                Klingt nach
              </p>
              <p className={`text-sm truncate leading-snug ${selectedMood ? 'text-pl-text font-medium' : 'text-pl-text-muted'}`}>
                {moodOptions.find((m) => m.slug === selectedMood)?.name ?? 'Alle Stimmungen'}
              </p>
            </div>
            <svg
              className={`w-4 h-4 flex-shrink-0 motion-safe:transition-all ${openPanel === 'mood' ? 'text-pl-accent rotate-180' : 'text-pl-text-hint group-hover:text-pl-accent/70'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Segment 6 – Suche (Desktop, rechtes Ende der Bar). Nur ab lg
              sichtbar -- die mobile Instanz (oben, links neben dem
              Filter-Zugang) deckt Mobile/Tablet ab, siehe
              renderSearchField-Kommentar oben. */}
          <div className="hidden lg:flex items-center gap-2.5 px-4 py-4 flex-1 min-w-0 lg:border-l border-pl-soft focus-within:bg-black/[0.03] motion-safe:transition-colors">
            {renderSearchField()}
          </div>
        </div>

        {/* Panel – Anlass */}
        {openPanel === 'anlass' && (
          <div
            role="listbox"
            aria-label="Anlass auswählen"
            className="absolute left-0 right-0 top-full mt-2 z-20 rounded-xl border border-pl-soft bg-pl-elevated shadow-lg p-5"
          >
            <div className="flex flex-wrap gap-2">
              {/* "Alle Anlaesse" -- nur im Veranstaltungsseiten-Kontext (R1):
                  navigiert immer zu /bands, uebrige Filter bleiben erhalten.
                  Auf /bands unveraendert nicht vorhanden -- dort bleibt das
                  bisherige Anlass-Verhalten (Toggle-off der aktiven Pille). */}
              {lockedOccasion && (
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setOpenPanel(null);
                    router.push(
                      buildFinderFilterUrl('/bands', { region: selectedRegion, suche: query, bandtyp: selectedBandtyp, mood: selectedMood }),
                      { scroll: false }
                    );
                  }}
                  className="px-3.5 py-1.5 rounded-full text-sm border motion-safe:transition-colors border-pl-soft text-pl-text-muted hover:border-pl-accent hover:text-pl-text"
                >
                  Alle Anlässe
                </button>
              )}
              {FINDER_OCCASIONS.map((cat) => {
                const active = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      if (lockedOccasion) {
                        // R1: "Wofuer" ist im Veranstaltungsseiten-Kontext
                        // Navigation. Klick auf den bereits aktiven
                        // (gesperrten) Anlass ist bewusst ein No-op -- kein
                        // Abwaehlen moeglich (siehe Prop-Kommentar oben).
                        setOpenPanel(null);
                        if (active) return;
                        router.push(
                          buildOccasionNavUrl(cat.slug, { region: selectedRegion, suche: query, bandtyp: selectedBandtyp, mood: selectedMood }),
                          { scroll: false }
                        );
                        return;
                      }
                      const next = active ? null : cat.slug;
                      setSelectedCategory(next);
                      setOpenPanel(null);
                      router.push(
                        buildUrl({ anlass: next, region: selectedRegion, suche: query, bandtyp: selectedBandtyp, mood: selectedMood }),
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
                        buildFilterUrl({ region: next }),
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
                        buildFilterUrl({ bandtyp: next }),
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

        {/* Panel – Klingt nach */}
        {openPanel === 'mood' && moodOptions.length > 0 && (
          <div
            role="listbox"
            aria-label="Klingt nach auswählen"
            className="absolute left-0 right-0 top-full mt-2 z-20 rounded-xl border border-pl-soft bg-pl-elevated shadow-lg p-5"
          >
            <div className="flex flex-wrap gap-2">
              {moodOptions.map((mood) => {
                const active = selectedMood === mood.slug;
                return (
                  <button
                    key={mood.slug}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      const next = active ? null : mood.slug;
                      setSelectedMood(next);
                      setOpenPanel(null);
                      router.push(
                        buildFilterUrl({ mood: next }),
                        { scroll: false }
                      );
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-sm border motion-safe:transition-colors ${
                      active
                        ? 'bg-pl-accent text-white border-pl-accent'
                        : 'border-pl-soft text-pl-text-muted hover:border-pl-accent hover:text-pl-text'
                    }`}
                  >
                    {mood.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {/* ── Ende Finder-Bar ─────────────────────────────────────── */}
        </div>
      </div>
      {/* ── Ende warm getoenter Suchbereich ─────────────────────── */}

      {/* Ergebniszahl/Chips/Merkliste/Bandkarten stehen bewusst wieder auf
          dem bisherigen Seitenhintergrund (kein eigener Ton), weiterhin im
          bestehenden 1140px-Container. */}
      <div className="pl-container-shell px-4 sm:px-6">
      {/* Sentinel fuer den Sticky-"Auswahl verfeinern"-Zugang: bewusst
          unmittelbar NACH der Finder-Bar (nicht an deren Anfang), da die
          Bar auf Mobile deutlich hoeher ist als auf Desktop -- der Sticky
          soll erst erscheinen, wenn die komplette Bar passiert wurde. */}
      <div ref={finderSentinelRef} aria-hidden="true" className="h-px" />

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
        Zähler + Reset: immer als Spacer gerendert (konsistenter Abstand zum Grid).
        Zähler: nur wenn ein Filter aktiv ist ODER ein Seiten-Anlass gesetzt ist
        (z. B. "110 Livebands für Hochzeit gefunden" bereits im Initialzustand
        einer Veranstaltungsseite) -- keine initiale Gesamtzahl auf /bands.
        Reset: nur bei einem echten zusätzlichen Filter -- der gesetzte
        Seiten-Anlass allein ist Kontext, kein zurücksetzbarer Zusatzfilter
        (siehe hasFilter oben).
      */}
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        {shuffled.length > 0 && (hasFilter || lockedOccasion) ? (
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-pl-text-hint text-sm">{countLabel}</p>
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                title="Filter entfernen"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                           bg-pl-accent-subtle text-pl-accent-deep hover:bg-pl-accent/20
                           motion-safe:transition-colors focus:outline-none focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-[var(--pl-accent)]"
              >
                <span>{chip.label}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ))}
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
        ) : <span />}

        {/* Gut auffindbarer Zugang zur Merkliste direkt in der
            Ergebniszeile -- nur sichtbar, sobald tatsaechlich etwas
            gemerkt ist (identisches Sichtbarkeits-Prinzip wie die
            bestehende, sitenweite MerklisteBar). Oeffnet dasselbe
            bestehende AnfrageModal, keine zweite Merkliste. */}
        {anfrageBands.length > 0 && (
          <button
            type="button"
            onClick={() => setMerklisteOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                       border border-pl-soft text-pl-accent-deep bg-pl-accent-subtle
                       hover:border-pl-accent motion-safe:transition-colors
                       focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-[var(--pl-accent)]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="currentColor"
              />
            </svg>
            <span>Merkliste · {anfrageBands.length}</span>
          </button>
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
          {/* Persoenliche Hilfe -- bestehender Kontaktweg (/kontakt), keine
              neue Seite/kein neues Formular (Auftrag "Bandfinder-Redesign --
              Nachgang", Abschnitt 5 "Null Treffer"). */}
          <p className="text-sm text-pl-text-muted mt-6">
            Nicht die richtige Band dabei?{' '}
            <Link href="/kontakt" className="text-pl-accent hover:opacity-80 motion-safe:transition-opacity underline underline-offset-2">
              Schreib uns kurz
            </Link>
            {' '}– wir helfen persönlich weiter.
          </p>
        </div>
      ) : (
        <>
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayed.slice(0, visibleCount).map((band, index) => (
              <BandCard key={band.id} band={band} priority={index < 6} showMerkButton />
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

      {/* Sentinel fuer den Sticky-"Auswahl verfeinern"-Zugang: markiert das
          Ende des Explorer-Ergebnisbereichs (nach Grid/Empty-State/
          "Weitere Bands anzeigen"). Sobald dieser Sentinel sichtbar oder
          bereits passiert ist, blendet sich der Sticky-Control wieder aus,
          damit er nicht ueber nachfolgendem Seiteninhalt (z. B. "Weitere
          Anlaesse entdecken" auf Veranstaltungsseiten) schwebt. */}
      <div ref={explorerEndSentinelRef} aria-hidden="true" className="h-px" />
      </div>

      {/* Sticky-Zugang "Auswahl verfeinern" -- bewusst kompakt (kein
          zweiter Finder, kein Filter-Drawer), veraendert beim Klick
          ausschliesslich die Scrollposition (kein Filter-/URL-State,
          siehe scrollToFinder). Sinngemaess identisches Sichtbarkeits-/
          Animations-/A11y-Muster wie components/band/BandFloatingCta.tsx
          (PR #55): opacity/translate nur unter motion-safe, pointer-events
          und inert im ausgeblendeten Zustand, kein Tab-Fokus. */}
      <div
        {...(stickyVisible ? {} : { inert: true })}
        aria-hidden={!stickyVisible}
        className={`fixed inset-x-0 z-40 flex justify-center px-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] motion-safe:transition-all motion-safe:duration-300 ${
          stickyVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={scrollToFinder}
          tabIndex={stickyVisible ? 0 : -1}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold
                     bg-pl-elevated text-pl-text shadow-lg border border-pl-soft hover:border-pl-accent
                     motion-safe:transition-colors focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-pl-accent"
        >
          {stickyLabel}
        </button>
      </div>

      <MerklisteFlow isOpen={merklisteOpen} onClose={() => setMerklisteOpen(false)} />
    </div>
  );
}
