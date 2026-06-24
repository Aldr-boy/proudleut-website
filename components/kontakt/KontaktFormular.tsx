'use client'

import { useState, useRef, FormEvent } from 'react'
import Link from 'next/link'

type Status = 'idle' | 'submitting' | 'success' | 'error'

const ANLASS_OPTIONS = [
  'Ich suche eine Band',
  'Ich möchte meine Band vorstellen',
  'Zusammenarbeit / Kooperation',
  'Allgemeine Nachricht',
] as const

const inputClass =
  'w-full rounded-lg border border-pl-soft bg-pl-elevated px-4 py-2.5 ' +
  'text-pl-text placeholder:text-pl-text-hint ' +
  'focus:outline-none focus:ring-2 focus:ring-pl-accent/30 focus:border-pl-accent ' +
  'motion-safe:transition-colors'

const labelClass = 'block text-sm font-medium text-pl-text mb-1.5'

const cardClass =
  'bg-pl-elevated rounded-xl border border-pl-soft p-6 flex flex-col gap-3 ' +
  'hover:border-pl-medium hover:shadow-pl-photo motion-safe:transition-all group'

export default function KontaktFormular() {
  const [anlass, setAnlass] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [openedAt] = useState(() => Date.now())
  const anlassRef = useRef<HTMLSelectElement>(null)

  function scrollToForm(anlassValue: string) {
    setAnlass(anlassValue)
    setTimeout(() => {
      document.getElementById('formular-anker')?.scrollIntoView({ behavior: 'smooth' })
      anlassRef.current?.focus()
    }, 50)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting')
    setErrorMsg('')

    const data = new FormData(e.currentTarget)
    const str = (key: string) => String(data.get(key) ?? '')

    const payload = {
      anlass,
      vorname: str('vorname'),
      nachname: str('nachname'),
      email: str('email'),
      telefon: str('telefon'),
      nachricht: str('nachricht'),
      datenschutz: data.get('datenschutz') === 'on',
      firma_hidden: str('firma_hidden'),
      website_hidden: str('website_hidden'),
      openedAt,
    }

    try {
      const res = await fetch('/api/kontakt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMsg(json.error ?? 'Unbekannter Fehler')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Nachricht konnte nicht gesendet werden – bitte später erneut versuchen.')
    }
  }

  return (
    <>
      {/* ── Drei Anlass-Karten ─────────────────────────────── */}
      <section className="bg-pl-paper py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Karte 1: Ich suche eine Band */}
            <Link href="/bands" className={cardClass}>
              <span className="text-2xl" aria-hidden="true">🎵</span>
              <p className="font-semibold text-pl-text">Ich suche eine Band</p>
              <p className="text-sm text-pl-text-hint leading-relaxed">
                Für Hochzeit, Festzelt, Firmenfeier, Gala oder besondere Events.
              </p>
              <span className="text-sm text-pl-accent group-hover:text-pl-accent-hover mt-auto motion-safe:transition-colors">
                Bands entdecken →
              </span>
            </Link>

            {/* Karte 2: Ich habe eine Band */}
            <Link href="/fuer-bands" className={cardClass}>
              <span className="text-2xl" aria-hidden="true">🎤</span>
              <p className="font-semibold text-pl-text">Ich habe eine Band</p>
              <p className="text-sm text-pl-text-hint leading-relaxed">
                Du möchtest Deine Band für proudleut vorstellen?
              </p>
              <span className="text-sm text-pl-accent group-hover:text-pl-accent-hover mt-auto motion-safe:transition-colors">
                Für Bands →
              </span>
            </Link>

            {/* Karte 3: Allgemeine Anfrage → scrollt zum Formular */}
            <button
              type="button"
              onClick={() => scrollToForm('Allgemeine Nachricht')}
              className={`${cardClass} text-left w-full`}
            >
              <span className="text-2xl" aria-hidden="true">✉️</span>
              <p className="font-semibold text-pl-text">Allgemeine Anfrage</p>
              <p className="text-sm text-pl-text-hint leading-relaxed">
                Kooperation, Feedback, Presse oder sonstige Fragen.
              </p>
              <span className="text-sm text-pl-accent group-hover:text-pl-accent-hover mt-auto motion-safe:transition-colors">
                Nachricht schreiben →
              </span>
            </button>

          </div>
        </div>
      </section>

      {/* Scroll-Anker */}
      <div id="formular-anker" />

      {/* ── Formular + Persönlicher Kontaktblock ──────────── */}
      <section className="bg-pl-canvas py-16 px-4 sm:px-6">
        <div className="pl-container-shell grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12 items-start">

          {/* Formular */}
          <div>
            <h2 className="text-xl font-semibold text-pl-text mb-8">Schreib uns</h2>

            {status === 'success' ? (
              <div className="rounded-xl bg-pl-elevated border border-green-200 p-8 text-center">
                <p className="text-pl-text font-semibold text-lg">Danke für deine Nachricht!</p>
                <p className="text-pl-text-hint mt-2">
                  Ich melde mich so schnell wie möglich.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Anlass */}
                  <div className="sm:col-span-2">
                    <label htmlFor="anlass" className={labelClass}>
                      Worum geht es? <span className="text-pl-accent" aria-hidden="true">*</span>
                    </label>
                    <select
                      id="anlass"
                      name="anlass"
                      ref={anlassRef}
                      value={anlass}
                      onChange={(e) => setAnlass(e.target.value)}
                      required
                      className={inputClass}
                    >
                      <option value="" disabled>Bitte wählen …</option>
                      {ANLASS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Vorname */}
                  <div>
                    <label htmlFor="vorname" className={labelClass}>
                      Vorname <span className="text-pl-accent" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="vorname"
                      name="vorname"
                      type="text"
                      required
                      autoComplete="given-name"
                      className={inputClass}
                      placeholder="Max"
                    />
                  </div>

                  {/* Nachname */}
                  <div>
                    <label htmlFor="nachname" className={labelClass}>
                      Nachname <span className="text-pl-accent" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="nachname"
                      name="nachname"
                      type="text"
                      required
                      autoComplete="family-name"
                      className={inputClass}
                      placeholder="Mustermann"
                    />
                  </div>

                  {/* E-Mail */}
                  <div className="sm:col-span-2">
                    <label htmlFor="email" className={labelClass}>
                      E-Mail <span className="text-pl-accent" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className={inputClass}
                      placeholder="max@beispiel.de"
                    />
                  </div>

                  {/* Telefon (optional) */}
                  <div className="sm:col-span-2">
                    <label htmlFor="telefon" className={labelClass}>
                      Telefon{' '}
                      <span className="text-pl-text-hint font-normal">(optional)</span>
                    </label>
                    <input
                      id="telefon"
                      name="telefon"
                      type="tel"
                      autoComplete="tel"
                      className={inputClass}
                      placeholder="+49 …"
                    />
                  </div>

                  {/* Nachricht */}
                  <div className="sm:col-span-2">
                    <label htmlFor="nachricht" className={labelClass}>
                      Nachricht <span className="text-pl-accent" aria-hidden="true">*</span>
                    </label>
                    <textarea
                      id="nachricht"
                      name="nachricht"
                      rows={5}
                      required
                      className={`${inputClass} resize-y`}
                      placeholder="Womit kann ich dir helfen?"
                    />
                  </div>

                  {/* Datenschutz */}
                  <div className="sm:col-span-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="datenschutz"
                        required
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--pl-accent)]"
                      />
                      <span className="text-sm text-pl-text-hint leading-relaxed">
                        Ich habe die{' '}
                        <a
                          href="/datenschutz"
                          className="underline hover:text-pl-accent motion-safe:transition-colors"
                        >
                          Datenschutzerklärung
                        </a>{' '}
                        gelesen und akzeptiert.
                      </span>
                    </label>
                  </div>

                  {/* Honeypot-Felder – aus dem Bedienfluss genommen */}
                  <div className="sr-only" aria-hidden="true">
                    <input
                      type="text"
                      name="firma_hidden"
                      tabIndex={-1}
                      autoComplete="off"
                      defaultValue=""
                    />
                    <input
                      type="text"
                      name="website_hidden"
                      tabIndex={-1}
                      autoComplete="off"
                      defaultValue=""
                    />
                  </div>

                  {/* Submit */}
                  <div className="sm:col-span-2 flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={status === 'submitting'}
                      className="inline-flex items-center justify-center px-6 py-3 rounded-full
                                 bg-pl-accent text-pl-on-accent font-semibold
                                 hover:bg-pl-accent-hover motion-safe:transition-colors
                                 disabled:opacity-60 disabled:cursor-not-allowed w-fit"
                    >
                      {status === 'submitting' ? 'Wird gesendet …' : 'Nachricht senden'}
                    </button>
                    {status === 'error' && (
                      <p className="text-red-600 text-sm">{errorMsg}</p>
                    )}
                  </div>

                </div>
              </form>
            )}
          </div>

          {/* Persönlicher Kontaktblock */}
          <div className="bg-pl-paper rounded-xl border border-pl-soft p-6 lg:p-8">
            <p className="font-semibold text-pl-text mb-4">Alex</p>
            <p className="text-sm text-pl-text-hint leading-relaxed mb-6">
              proudleut wird von Alex persönlich betreut. Ich bin im Bandmanagement zuhause
              und baue diese Plattform, damit Veranstalter schneller gute Livebands finden —
              und Bands sichtbarer werden.
            </p>
            <a
              href="mailto:alexander.dressler@proudleut.com"
              className="text-sm text-pl-accent hover:text-pl-accent-hover
                         motion-safe:transition-colors break-all"
            >
              alexander.dressler@proudleut.com
            </a>
          </div>

        </div>
      </section>
    </>
  )
}
