'use client';

import { openSettings } from '@/lib/consent';

export default function PrivacySettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => void openSettings()} className={className}>
      Datenschutz-Einstellungen
    </button>
  );
}
