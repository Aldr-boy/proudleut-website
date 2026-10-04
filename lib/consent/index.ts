// Einziger Zugriffspunkt auf das Consent-Management (aktuell Usercentrics CMP).
// Komponenten rufen nur diese Funktionen auf, nie window.__ucCmp direkt -- so
// laesst sich der Anbieter spaeter an genau einer Stelle austauschen.
//
// Nur im Browser aufrufen (Event-Handler, useEffect).

export type ConsentService = 'youtube';

// Dienste werden im CMP ueber den Namen erkannt (enthaelt "YouTube").
const SERVICE_NAME_MATCH: Record<ConsentService, string> = {
  youtube: 'youtube',
};

type UcService = { name?: string; consent?: { given?: boolean } };

type UcCmp = {
  getConsentDetails?: () => Promise<{ services?: Record<string, UcService> | UcService[] }>;
  showSecondLayer?: () => void | Promise<void>;
};

declare global {
  interface Window {
    __ucCmp?: UcCmp;
  }
}

const READY_EVENT = 'UC_CMP_API_READY';
const CONSENT_EVENT = 'UC_CONSENT';
const VIEW_EVENT = 'UC_UI_VIEW_CHANGED';

function api(): UcCmp | null {
  const cmp = typeof window === 'undefined' ? undefined : window.__ucCmp;
  return cmp && typeof cmp.getConsentDetails === 'function' ? cmp : null;
}

// Wartet, bis die CMP-Methoden verfuegbar sind (Loader laedt async).
function whenReady(): Promise<UcCmp> {
  const ready = api();
  if (ready) return Promise.resolve(ready);
  return new Promise((resolve) => {
    const onReady = () => {
      const cmp = api();
      if (!cmp) return;
      window.removeEventListener(READY_EVENT, onReady);
      resolve(cmp);
    };
    window.addEventListener(READY_EVENT, onReady);
  });
}

// true nur bei erteilter Einwilligung. Fehlt der Dienst im CMP, bleibt es false
// (Video gesperrt) und es gibt eine Konsolenwarnung.
export async function hasConsent(service: ConsentService): Promise<boolean> {
  const cmp = await whenReady();
  const details = await cmp.getConsentDetails!();
  const list = Object.values(details?.services ?? {});
  const match = list.find((s) => s.name?.toLowerCase().includes(SERVICE_NAME_MATCH[service]));
  if (!match) {
    console.warn(`[consent] Dienst "${service}" ist im CMP nicht angelegt -- bleibt gesperrt.`);
    return false;
  }
  return match.consent?.given === true;
}

// Einzelne Dienste lassen sich ueber die dokumentierte API nicht direkt
// akzeptieren: die zweite Ebene oeffnen. Resolvt, sobald die Ebene wieder
// geschlossen ist (UC_CONSENT kommt vorher, hasConsent liefert dann den neuen
// Stand) -- egal ob der Besucher entschieden oder nur geschlossen hat.
export async function requestConsent(service: ConsentService): Promise<void> {
  void service; // Dienst-Auswahl derzeit nicht per API moeglich, siehe oben
  const cmp = await whenReady();
  await new Promise<void>((resolve) => {
    const onView = (e: Event) => {
      const { view, previousView } = (e as CustomEvent<{ view?: string; previousView?: string }>).detail ?? {};
      if (previousView !== 'SECOND_LAYER' || view === 'SECOND_LAYER') return;
      window.removeEventListener(VIEW_EVENT, onView);
      resolve();
    };
    window.addEventListener(VIEW_EVENT, onView);
    void cmp.showSecondLayer?.();
  });
}

// Wird bei jeder Aenderung im CMP aufgerufen (UC_CONSENT: Initialstand beim
// Start, Akzeptieren, Ablehnen, Speichern, Widerruf). Der Stand selbst kommt
// ueber hasConsent. Liefert die Abmeldefunktion.
export function onConsentChange(cb: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, cb);
  return () => window.removeEventListener(CONSENT_EVENT, cb);
}

// Oeffnet die Einstellungsebene (z. B. fuer den Footer-Link).
export async function openSettings(): Promise<void> {
  const cmp = await whenReady();
  await cmp.showSecondLayer?.();
}
