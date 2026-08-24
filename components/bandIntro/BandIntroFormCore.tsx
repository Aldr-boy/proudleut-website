'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  // Wird unmittelbar nach bestaetigtem Speichern aufgerufen (bevor/waehrend
  // der Success-State angezeigt wird) -- der Modal-Wrapper nutzt das, um
  // sich nach kurzer Zeit selbst zu schliessen; die Mobile-Seite laesst es
  // ungenutzt und bleibt im Success-State stehen (keine automatische
  // Weiterleitung auf der Formularroute).
  onSuccess?: () => void;
};

type FormState = {
  bandName: string;
  region: string;
  websiteUrl: string;
  additionalLinks: string[];
  description: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  phone: string;
  datenschutz: boolean;
};

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

const EMPTY_FORM: FormState = {
  bandName: '',
  region: '',
  websiteUrl: '',
  additionalLinks: [],
  description: '',
  firstName: '',
  lastName: '',
  nickname: '',
  email: '',
  phone: '',
  datenschutz: false,
};

const MAX_ADDITIONAL_LINKS = 6;
const DESCRIPTION_MIN = 30;
const DESCRIPTION_MAX = 1500;

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `web-${crypto.randomUUID()}`;
  }
  return `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

// Identische Input-/Label-Optik wie components/band/AnfrageModal.tsx --
// bewusst dieselbe (bislang einzige) Formular-Skin des Projekts, keine neue
// Mini-Designsprache.
const inputClass =
  'w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors ' +
  'bg-[#111] border border-[rgba(196,168,216,0.2)] text-[#ede8e3] ' +
  'placeholder-[#6b5f65] ' +
  'focus:border-[var(--pl-accent)] focus:ring-1 focus:ring-[var(--pl-accent)]';

const labelClass = 'block text-xs font-semibold text-[#8a7e84] uppercase tracking-wide mb-1.5';

export function BandIntroFormCore({ onSuccess }: Props) {
  // Date.now()/crypto.randomUUID() duerfen nicht waehrend des Renderns
  // aufgerufen werden (impure) -- gleiches Muster wie
  // components/band/AnfrageModal.tsx: Sentinel-Werte bei useRef, echte
  // Werte einmalig beim Mount per useEffect gesetzt.
  const openedAtRef = useRef<number>(0);
  const idempotencyKeyRef = useRef<string>('');
  useEffect(() => {
    openedAtRef.current = Date.now();
    idempotencyKeyRef.current = generateIdempotencyKey();
  }, []);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [submitError, setSubmitError] = useState('');
  const [datenschutzError, setDatenschutzError] = useState('');
  const [confirmationMailSent, setConfirmationMailSent] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addLink() {
    if (form.additionalLinks.length >= MAX_ADDITIONAL_LINKS) return;
    setForm((prev) => ({ ...prev, additionalLinks: [...prev.additionalLinks, ''] }));
  }

  function updateLink(index: number, value: string) {
    setForm((prev) => ({
      ...prev,
      additionalLinks: prev.additionalLinks.map((l, i) => (i === index ? value : l)),
    }));
  }

  function removeLink(index: number) {
    setForm((prev) => ({ ...prev, additionalLinks: prev.additionalLinks.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: { currentTarget: HTMLFormElement; preventDefault(): void }) {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);
    const firmaHidden = String(fd.get('firma_hidden') ?? '');
    const websiteHidden = String(fd.get('website_hidden') ?? '');

    if (!form.datenschutz) {
      setDatenschutzError('Bitte bestätige die Datenschutzerklärung, bevor du eure Band vorstellst.');
      return;
    }
    setDatenschutzError('');

    if (Date.now() - openedAtRef.current < 3000) {
      setSubmitError('Einen kleinen Moment noch – dann kannst du eure Band vorstellen.');
      return;
    }
    setSubmitError('');
    setSubmitStatus('loading');

    try {
      const res = await fetch('/api/band-introductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: idempotencyKeyRef.current,
          bandName: form.bandName,
          region: form.region,
          websiteUrl: form.websiteUrl,
          additionalLinks: form.additionalLinks,
          description: form.description,
          firstName: form.firstName,
          lastName: form.lastName,
          nickname: form.nickname,
          email: form.email,
          phone: form.phone,
          datenschutz: form.datenschutz,
          firmaHidden,
          websiteHidden,
          openedAt: openedAtRef.current,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError((data as { error?: string }).error ?? 'Etwas ist schiefgelaufen – bitte versuche es erneut.');
        setSubmitStatus('error');
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { confirmationMailSent?: boolean };
      idempotencyKeyRef.current = generateIdempotencyKey();
      setConfirmationMailSent(!!data.confirmationMailSent);
      setSubmitStatus('success');
      onSuccess?.();
    } catch {
      setSubmitError('Keine Verbindung – bitte überprüfe deine Internetverbindung und versuche es erneut.');
      setSubmitStatus('error');
    }
  }

  if (submitStatus === 'success') {
    return (
      <div className="py-10 px-1 text-center" role="status">
        <p className="text-lg font-bold text-[#ede8e3]">
          Danke – eure Bandvorstellung ist angekommen.
        </p>
        <p className="mt-3 text-sm text-[#8a7e84] leading-relaxed max-w-[42ch] mx-auto">
          Ich schaue mir eure Infos in Ruhe an und melde mich bei dir.
        </p>
        {confirmationMailSent && (
          <p className="mt-4 text-xs text-[#6b5f65]">
            Eine Bestätigung ist unterwegs an eure E-Mail-Adresse.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-6">
        {/* Block 1 – Eure Band */}
        <div className="space-y-4">
          <p className={labelClass}>Eure Band</p>

          <div>
            <label htmlFor="bi-bandname" className="block text-sm text-[#ede8e3] mb-1">
              Bandname <span className="text-[#c4a8d8]">*</span>
            </label>
            <input
              id="bi-bandname"
              type="text"
              required
              value={form.bandName}
              onChange={(e) => set('bandName', e.target.value)}
              placeholder="Eure Band"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="bi-region" className="block text-sm text-[#ede8e3] mb-1">
              Heimatort / Region <span className="text-[#c4a8d8]">*</span>
            </label>
            <input
              id="bi-region"
              type="text"
              required
              value={form.region}
              onChange={(e) => set('region', e.target.value)}
              placeholder="z. B. München und Umgebung"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="bi-website" className="block text-sm text-[#ede8e3] mb-1">
              Website{' '}
              <span className="text-[#6b5f65] font-normal">(optional)</span>
            </label>
            <input
              id="bi-website"
              type="url"
              value={form.websiteUrl}
              onChange={(e) => set('websiteUrl', e.target.value)}
              placeholder="https://eure-band.de"
              className={inputClass}
            />
          </div>

          <div>
            <p className="block text-sm text-[#ede8e3] mb-1">
              Social Media &amp; weitere Links{' '}
              <span className="text-[#6b5f65] font-normal">(optional)</span>
            </p>
            <div className="space-y-2">
              {form.additionalLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => updateLink(index, e.target.value)}
                    placeholder="https://instagram.com/eurename"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    aria-label="Link entfernen"
                    className="shrink-0 text-[#8a7e84] hover:text-[#ede8e3] transition-colors p-1.5"
                  >
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>
            {form.additionalLinks.length < MAX_ADDITIONAL_LINKS && (
              <button
                type="button"
                onClick={addLink}
                className="mt-2 text-xs font-semibold text-[#c4a8d8] hover:text-[#ede8e3] transition-colors"
              >
                + Weiteren Link hinzufügen
              </button>
            )}
          </div>

          <div>
            <label htmlFor="bi-description" className="block text-sm text-[#ede8e3] mb-1">
              Was macht euch aus? <span className="text-[#c4a8d8]">*</span>
            </label>
            <textarea
              id="bi-description"
              required
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={4}
              maxLength={DESCRIPTION_MAX}
              placeholder="Ein paar Sätze reichen – was spielt ihr und was sollte ich über euch wissen?"
              className={inputClass + ' resize-none'}
            />
            <p className="text-xs text-[#6b5f65] mt-1">
              Mindestens {DESCRIPTION_MIN} Zeichen · {form.description.length}/{DESCRIPTION_MAX}
            </p>
          </div>
        </div>

        {/* Block 2 – Ansprechpartner */}
        <div className="space-y-4">
          <p className={labelClass}>Ansprechpartner</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="bi-vorname" className="block text-sm text-[#ede8e3] mb-1">
                Vorname <span className="text-[#c4a8d8]">*</span>
              </label>
              <input
                id="bi-vorname"
                type="text"
                required
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                placeholder="Anna"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="bi-nachname" className="block text-sm text-[#ede8e3] mb-1">
                Nachname{' '}
                <span className="text-[#6b5f65] font-normal">(optional)</span>
              </label>
              <input
                id="bi-nachname"
                type="text"
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                placeholder="Müller"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="bi-spitzname" className="block text-sm text-[#ede8e3] mb-1">
              Spitzname (optional)
            </label>
            <input
              id="bi-spitzname"
              type="text"
              value={form.nickname}
              onChange={(e) => set('nickname', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="bi-email" className="block text-sm text-[#ede8e3] mb-1">
              E-Mail <span className="text-[#c4a8d8]">*</span>
            </label>
            <input
              id="bi-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="anna@beispiel.de"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="bi-telefon" className="block text-sm text-[#ede8e3] mb-1">
              Telefon{' '}
              <span className="text-[#6b5f65] font-normal">(optional)</span>
            </label>
            <input
              id="bi-telefon"
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Block 3 – Absenden */}
        <div className="space-y-4 pb-1">
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
                Ich bin einverstanden, dass proudleut meine Angaben zur Bearbeitung meiner Bandvorstellung verarbeitet.{' '}
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
            disabled={submitStatus === 'loading'}
            className={[
              'w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full',
              'text-sm font-semibold transition-colors',
              'bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)] hover:bg-[var(--pl-accent-hover)]',
              submitStatus === 'loading' ? 'opacity-90' : '',
            ].join(' ')}
          >
            {submitStatus === 'loading' && <SpinnerIcon />}
            {submitStatus === 'loading' ? 'Wird gesendet…' : 'Band vorstellen'}
          </button>
        </div>
      </div>

      {/* Honeypot-Felder – innerhalb des <form>, damit FormData sie erfasst */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        <input type="text" name="firma_hidden" tabIndex={-1} autoComplete="off" />
        <input type="text" name="website_hidden" tabIndex={-1} autoComplete="off" />
      </div>
    </form>
  );
}
