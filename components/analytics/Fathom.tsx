'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { load, trackPageview } from 'fathom-client';

// Fathom Analytics (App-Router-Integration gemaess offizieller Fathom-Doku,
// docs/integrations/next): fathom-client statt des rohen Script-Tags, weil
// Next.js' clientseitige Navigation (next/link, kein Reload) sonst keine
// zusaetzlichen Pageviews auslöst. load(..., { auto: false }) deaktiviert
// den automatischen ersten Pageview des Scripts -- stattdessen feuert genau
// dieser useEffect (Dependency [pathname, searchParams]) bei JEDEM
// Routenwechsel EINSCHLIESSLICH des initialen Mounts einmalig
// trackPageview(), keine Doppelzaehlung.
//
// useSearchParams() zwingt die aufrufende Komponente in eine eigene
// Suspense-Grenze (Next.js-Vorgabe), sonst wuerde die gesamte Seite ihre
// statische Optimierung verlieren -- deshalb der separate innere
// FathomTracker, der Fathom() unten kapselt.
//
// Ob/wann diese Komponente ueberhaupt gerendert wird (Produktion, echte
// proudleut.com-Domain, nicht /admin, nicht /studio), entscheidet
// ausschliesslich der Server in app/layout.tsx -- diese Datei selbst
// enthaelt keine eigene Env-/Host-/Pfad-Pruefung.
function FathomTracker({ siteId }: { siteId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    load(siteId, { auto: false });
  }, [siteId]);

  useEffect(() => {
    if (!pathname) return;
    const query = searchParams?.toString();
    trackPageview({
      url: query ? `${pathname}?${query}` : pathname,
      referrer: document.referrer,
    });
  }, [pathname, searchParams]);

  return null;
}

export function Fathom({ siteId }: { siteId: string }) {
  return (
    <Suspense fallback={null}>
      <FathomTracker siteId={siteId} />
    </Suspense>
  );
}
