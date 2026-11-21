'use client';

import type { AnchorHTMLAttributes } from 'react';
import { trackEvent } from 'fathom-client';

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'onClick' | 'target' | 'rel'> & {
  href: string;
  // Fertiger Fathom-Ereignisname (siehe lib/analytics/outboundEventName.ts).
  eventName: string;
};

// Externer Link, der pro Klick genau ein Fathom-Ereignis ausloest. Der Link
// selbst bleibt ein normales <a target="_blank"> -- das Ereignis wird nur
// angestossen, nie abgewartet, und ein Messfehler darf das Oeffnen nie
// verhindern. Ob tatsaechlich gesendet wird, entscheidet allein das Gating
// in app/layout.tsx: nur dort wird Fathom geladen (nur Produktion auf der
// Hauptdomain). Ohne geladenes Fathom sendet trackEvent nichts.
export function TrackedExternalLink({ eventName, children, ...rest }: Props) {
  return (
    <a
      {...rest}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        try {
          trackEvent(eventName);
        } catch {
          // Messung ist optional
        }
      }}
    >
      {children}
    </a>
  );
}
