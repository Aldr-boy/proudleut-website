'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type BandEntry = {
  slug: string;
  name: string;
  eventTypes: string[];
};

type Props = {
  bands: BandEntry[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  allowBandRemoval?: boolean;
  onRemoveBand?: (slug: string) => void;
};

type AnfrageFormState = {
  eventtyp: string;
  eventtyp_custom: string;
  datum: string;
  ort: string;
  veranstaltungsort: string;
  gaestezahl: string;
  spielzeit: string;
  nachricht: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  datenschutz: boolean;
};

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

const EMPTY_FORM: AnfrageFormState = {
  eventtyp: '',
  eventtyp_custom: '',
  datum: '',
  ort: '',
  veranstaltungsort: '',
  gaestezahl: '',
  spielzeit: '',
  nachricht: '',
  vorname: '',
  nachname: '',
  email: '',
  telefon: '',
  datenschutz: false,
};

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const letters =
    parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
      style={{ background: 'var(--pl-accent)', color: 'var(--pl-text-on-accent)' }}
    >
      {letters}
    </span>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const inputClass =
  'w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors ' +
  'bg-[#111] border border-[rgba(196,168,216,0.2)] text-[#ede8e3] ' +
  'placeholder-[#6b5f65] ' +
  'focus:border-[var(--pl-accent)] focus:ring-1 focus:ring-[var(--pl-accent)]';

const labelClass = 'block text-xs font-semibold text-[#8a7e84] uppercase tracking-wide mb-1.5';

export function AnfrageModal({ bands, isOpen, onClose, onSuccess, allowBandRemoval, onRemoveBand }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const openedAtRef = useRef<number>(0);
  const [form, setForm] = useState<AnfrageFormState>(EMPTY_FORM);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [submitError, setSubmitError] = useState('');
  const [datenschutzError, setDatenschutzError] = useState('');

  const uniqueEventTypes = (types: string[]) =>
    Array.from(new Set(types.map((t) => t.trim()).filter(Boolean)));

  const availableEventTypes = useMemo(() => {
    if (bands.length === 0) return [];
    if (bands.length === 1) return uniqueEventTypes(bands[0].eventTypes);
    const firstBandTypes = uniqueEventTypes(bands[0].eventTypes);
    return firstBandTypes.filter((type) =>
      bands.every((band) => uniqueEventTypes(band.eventTypes).includes(type))
    );
  }, [bands]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      openedAtRef.current = Date.now();
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setForm(EMPTY_FORM);
      setSubmitStatus('idle');
      setSubmitError('');
      setDatenschutzError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (form.eventtyp && form.eventtyp !== 'sonstiges') {
      if (!availableEventTypes.includes(form.eventtyp)) {
        setForm((prev) => ({ ...prev, eventtyp: '' }));
      }
    }
  }, [availableEventTypes, form.eventtyp]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  function handleCancel(e: React.SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault();
    onClose();
  }

  function set<K extends keyof AnfrageFormState>(key: K, value: AnfrageFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: { currentTarget: HTMLFormElement; preventDefault(): void }) {
    e.preventDefault();

    // Honeypot-Felder direkt aus DOM-FormData lesen (Bots befüllen das DOM, nicht den React-State)
    const fd = new FormData(e.currentTarget);
    const firmaHidden = String(fd.get('firma_hidden') ?? '');
    const websiteHidden = String(fd.get('website_hidden') ?? '');

    // Datenschutz-Check
    if (!form.datenschutz) {
      setDatenschutzError('Bitte bestätige die Datenschutzerklärung, bevor du die Anfrage sendest.');
      return;
    }
    setDatenschutzError('');

    // 3-Sekunden-Check im Frontend: schützt echte Nutzer vor versehentlichem Doppelklick
    // und hält automatisierte Submissions ab. Die API prüft serverseitig nochmal (Bot-Täuschung).
    if (Date.now() - openedAtRef.current < 3000) {
      setSubmitError('Einen kleinen Moment noch – dann kannst du die Anfrage absenden.');
      return;
    }
    setSubmitError('');
    setSubmitStatus('loading');

    try {
      const res = await fetch('/api/anfrage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bands: bands.map(({ slug, name }) => ({ slug, name })),
          eventtyp: form.eventtyp === 'sonstiges' ? 'Sonstiges' : form.eventtyp,
          eventtyp_custom: form.eventtyp === 'sonstiges' ? form.eventtyp_custom : '',
          datum: form.datum,
          ort: form.ort,
          veranstaltungsort: form.veranstaltungsort,
          gaestezahl: form.gaestezahl,
          spielzeit: form.spielzeit,
          nachricht: form.nachricht,
          vorname: form.vorname,
          nachname: form.nachname,
          email: form.email,
          telefon: form.telefon,
          firma_hidden: firmaHidden,
          website_hidden: websiteHidden,
          datenschutz: form.datenschutz,
          openedAt: openedAtRef.current,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError((data as { error?: string }).error ?? 'Etwas ist schiefgelaufen – bitte versuche es erneut.');
        setSubmitStatus('error');
        return;
      }

      setSubmitStatus('success');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch {
      setSubmitError('Keine Verbindung – bitte überprüfe deine Internetverbindung und versuche es erneut.');
      setSubmitStatus('error');
    }
  }

  const bandDisplayName = bands.length === 1 ? bands[0].name : `${bands.length} Bands`;

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className="fixed inset-0 m-auto
                 w-[min(92vw,640px)]
                 max-sm:w-full max-sm:max-w-full
                 max-sm:top-auto max-sm:right-0 max-sm:bottom-0 max-sm:left-0 max-sm:m-0
                 p-0 border-0 bg-transparent
                 backdrop:bg-black/70"
    >
      {/* Wrapper übernimmt Layout und visuelle Gestaltung – nicht das <dialog> selbst,
          damit display:none beim Schließen nicht von flex-Klassen überschrieben wird */}
      <div
        className="flex flex-col overflow-hidden
                   max-h-[90dvh] max-sm:max-h-[92dvh]
                   rounded-2xl max-sm:rounded-t-2xl max-sm:rounded-b-none
                   shadow-2xl"
        style={{ background: '#1a1818', color: 'var(--pl-text-on-stage)' }}
      >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[rgba(196,168,216,0.12)] shrink-0">
        <h2 className="text-base font-bold text-[#ede8e3]">Bandanfrage</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="text-[#8a7e84] hover:text-[#ede8e3] transition-colors rounded-md p-1 -mr-1"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Scrollbarer Formular-Body */}
      <div className="overflow-y-auto flex-1">
        <form ref={formRef} onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-6">

            {/* Block 1 – Ausgewählte Band(s) */}
            <div>
              <p className={labelClass}>
                {bands.length === 1 ? 'Ausgewählte Band' : 'Ausgewählte Bands'}
              </p>
              <div className="flex flex-wrap gap-2">
                {bands.map((b) => (
                  <span
                    key={b.slug}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ background: 'rgba(117,81,139,0.2)', color: '#c4a8d8' }}
                  >
                    <Initials name={b.name} />
                    {b.name}
                    {allowBandRemoval && (
                      <button
                        type="button"
                        onClick={() => {
                          onRemoveBand?.(b.slug);
                          if (bands.length === 1) onClose();
                        }}
                        aria-label={`${b.name} entfernen`}
                        className="ml-0.5 text-[#8a7e84] hover:text-[#ede8e3] transition-colors"
                      >
                        <XIcon />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Block 2 – Dein Event */}
            <div className="space-y-4">
              <p className={labelClass}>Dein Event</p>

              <div>
                <label htmlFor="af-eventtyp" className="block text-sm text-[#ede8e3] mb-1">
                  Veranstaltungstyp
                </label>
                <select
                  id="af-eventtyp"
                  value={form.eventtyp}
                  onChange={(e) => set('eventtyp', e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>Bitte wählen…</option>
                  {availableEventTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="sonstiges">Sonstiges</option>
                </select>
              </div>

              {form.eventtyp === 'sonstiges' && (
                <div>
                  <label htmlFor="af-eventtyp-custom" className="block text-sm text-[#ede8e3] mb-1">
                    Welche Art von Veranstaltung?
                  </label>
                  <input
                    id="af-eventtyp-custom"
                    type="text"
                    value={form.eventtyp_custom}
                    onChange={(e) => set('eventtyp_custom', e.target.value)}
                    placeholder="z.B. Kirchweih, Vereinsfest, Betriebsjubiläum…"
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label htmlFor="af-datum" className="block text-sm text-[#ede8e3] mb-1">
                  Datum
                </label>
                <input
                  id="af-datum"
                  type="text"
                  value={form.datum}
                  onChange={(e) => set('datum', e.target.value)}
                  placeholder="TT.MM.JJJJ"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="af-ort" className="block text-sm text-[#ede8e3] mb-1">
                  PLZ & Ort
                </label>
                <input
                  id="af-ort"
                  type="text"
                  value={form.ort}
                  onChange={(e) => set('ort', e.target.value)}
                  placeholder="z.B. 80331 München"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="af-veranstaltungsort" className="block text-sm text-[#ede8e3] mb-1">
                  Veranstaltungsort{' '}
                  <span className="text-[#6b5f65] font-normal">(optional)</span>
                </label>
                <input
                  id="af-veranstaltungsort"
                  type="text"
                  value={form.veranstaltungsort}
                  onChange={(e) => set('veranstaltungsort', e.target.value)}
                  placeholder="z.B. Festscheune Müller"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="af-gaestezahl" className="block text-sm text-[#ede8e3] mb-1">
                    Gästezahl ca.
                  </label>
                  <input
                    id="af-gaestezahl"
                    type="text"
                    value={form.gaestezahl}
                    onChange={(e) => set('gaestezahl', e.target.value)}
                    placeholder="z.B. 120"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="af-spielzeit" className="block text-sm text-[#ede8e3] mb-1">
                    Spielzeit{' '}
                    <span className="text-[#6b5f65] font-normal">(optional)</span>
                  </label>
                  <input
                    id="af-spielzeit"
                    type="text"
                    value={form.spielzeit}
                    onChange={(e) => set('spielzeit', e.target.value)}
                    placeholder="z.B. 19–23 Uhr"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Block 3 – Nachricht */}
            <div>
              <label htmlFor="af-nachricht" className="block text-sm text-[#ede8e3] mb-1">
                {bands.length === 1 ? 'Nachricht an die Band' : 'Nachricht an die ausgewählten Bands'}
              </label>
              {bands.length >= 5 && (
                <p className="text-xs text-[#8a7e84] mb-2">
                  Du hast {bands.length} Bands ausgewählt. Das passt –
                  achte nur darauf, dass deine Nachricht für alle Bands sinnvoll ist.
                </p>
              )}
              <textarea
                id="af-nachricht"
                value={form.nachricht}
                onChange={(e) => set('nachricht', e.target.value)}
                rows={4}
                placeholder="Erzähl kurz, was ihr plant: Anlass, Stimmung, Ablauf – und was euch wichtig ist."
                className={inputClass + ' resize-none'}
              />
              <p className="text-xs text-[#6b5f65] mt-1.5">
                Ein paar persönliche Sätze helfen der Band, schneller und passender zu antworten.
              </p>
            </div>

            {/* Block 4 – Kontakt */}
            <div className="space-y-4">
              <p className={labelClass}>Dein Kontakt</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="af-vorname" className="block text-sm text-[#ede8e3] mb-1">
                    Vorname <span className="text-[#c4a8d8]">*</span>
                  </label>
                  <input
                    id="af-vorname"
                    type="text"
                    required
                    value={form.vorname}
                    onChange={(e) => set('vorname', e.target.value)}
                    placeholder="Anna"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="af-nachname" className="block text-sm text-[#ede8e3] mb-1">
                    Nachname{' '}
                    <span className="text-[#6b5f65] font-normal">(optional)</span>
                  </label>
                  <input
                    id="af-nachname"
                    type="text"
                    value={form.nachname}
                    onChange={(e) => set('nachname', e.target.value)}
                    placeholder="Müller"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="af-email" className="block text-sm text-[#ede8e3] mb-1">
                  E-Mail <span className="text-[#c4a8d8]">*</span>
                </label>
                <input
                  id="af-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="anna@beispiel.de"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="af-telefon" className="block text-sm text-[#ede8e3] mb-1">
                  Telefonnummer{' '}
                  <span className="text-[#6b5f65] font-normal">(optional)</span>
                </label>
                <input
                  id="af-telefon"
                  type="tel"
                  value={form.telefon}
                  onChange={(e) => set('telefon', e.target.value)}
                  placeholder="falls die Band dich kurz erreichen darf"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Block 5 – Absenden */}
            <div className="space-y-4 pb-2">
              <div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.datenschutz}
                    onChange={(e) => {
                      set('datenschutz', e.target.checked);
                      if (e.target.checked) setDatenschutzError('');
                    }}
                    className="mt-0.5 shrink-0 w-4 h-4 rounded cursor-pointer accent-[#75518b]"
                  />
                  <span className="text-xs text-[#8a7e84] leading-relaxed group-hover:text-[#ede8e3] transition-colors">
                    Ich bin einverstanden, dass proudleut meine Anfrage an die ausgewählten Bands weiterleitet.{' '}
                    <a
                      href="/datenschutz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-[#c4a8d8]"
                    >
                      Die Datenschutzerklärung habe ich gelesen.
                    </a>
                  </span>
                </label>
                {datenschutzError && (
                  <p role="alert" className="text-xs text-red-400 mt-1.5 ml-7">
                    {datenschutzError}
                  </p>
                )}
              </div>

              {submitError && (
                <p role="alert" className="text-xs text-red-400 px-1">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitStatus === 'loading' || submitStatus === 'success'}
                className={[
                  'w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full',
                  'text-sm font-semibold transition-colors',
                  submitStatus === 'success'
                    ? 'bg-green-600 text-white cursor-default'
                    : 'bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)] hover:bg-[var(--pl-accent-hover)]',
                  submitStatus === 'loading' || submitStatus === 'success' ? 'opacity-90' : '',
                ].join(' ')}
              >
                {submitStatus === 'loading' && <SpinnerIcon />}
                {submitStatus === 'idle' && (bands.length === 1 ? `Anfrage an ${bandDisplayName} senden` : `Anfrage an ${bands.length} Bands senden`)}
                {submitStatus === 'loading' && 'Wird gesendet…'}
                {submitStatus === 'success' && 'Anfrage gesendet ✓'}
                {submitStatus === 'error' && (bands.length === 1 ? `Anfrage an ${bandDisplayName} senden` : `Anfrage an ${bands.length} Bands senden`)}
              </button>

              <p className="text-xs text-[#6b5f65] text-center">
                {bands.length === 1
                  ? 'Deine Anfrage wird an die Band gesendet. Du erhältst eine Kopie per E-Mail.'
                  : 'Deine Anfrage wird an jede ausgewählte Band gesendet. Du erhältst eine Kopie per E-Mail.'}
              </p>
            </div>
          </div>

          {/* Honeypot-Felder – innerhalb des <form> damit FormData sie erfasst */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
            <input type="text" name="firma_hidden" tabIndex={-1} autoComplete="off" />
            <input type="text" name="website_hidden" tabIndex={-1} autoComplete="off" />
          </div>
        </form>
      </div>
      </div>
    </dialog>
  );
}
