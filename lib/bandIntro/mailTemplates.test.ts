import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolvePreferredName,
  renderBandIntroConfirmationMail,
  renderBandIntroConfirmationMailHtml,
  renderBandIntroInternalNotification,
  renderBandIntroInternalNotificationHtml,
} from './mailTemplates.ts'

function internalContent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'intro-1',
    idempotencyKey: 'web-abc',
    bandName: 'Testband',
    region: 'München',
    websiteUrl: 'https://testband.de',
    additionalLinks: ['https://instagram.com/testband'],
    description: 'Wir spielen Rock und Pop seit vielen Jahren auf Hochzeiten.',
    firstName: 'Anna',
    lastName: 'Müller',
    nickname: 'Ann',
    email: 'anna@beispiel.de',
    phone: '0151 1234567',
    createdAtDisplay: '01.01.2026, 12:00',
    confirmationMailFailed: false,
    ...overrides,
  }
}

// ── Anrede-Logik (Auftrag Abschnitt 13) ───────────────────────────────────

test('resolvePreferredName: mit Spitzname -> Spitzname verwenden', () => {
  assert.equal(resolvePreferredName({ firstName: 'Benedikt', nickname: 'Bene' }), 'Bene')
})

test('resolvePreferredName: ohne Spitzname -> Vorname verwenden', () => {
  assert.equal(resolvePreferredName({ firstName: 'Benedikt', nickname: null }), 'Benedikt')
})

test('resolvePreferredName: leerer/nur-Leerzeichen-Spitzname faellt auf Vorname zurueck', () => {
  assert.equal(resolvePreferredName({ firstName: 'Benedikt', nickname: '   ' }), 'Benedikt')
})

test('renderBandIntroConfirmationMail: verwendet Spitzname in der Anrede', () => {
  const { bodyText } = renderBandIntroConfirmationMail({ bandName: 'Testband', firstName: 'Benedikt', nickname: 'Bene' })
  assert.ok(bodyText.startsWith('Servus Bene,'))
})

test('renderBandIntroConfirmationMail: verwendet Vornamen ohne Spitzname', () => {
  const { bodyText } = renderBandIntroConfirmationMail({ bandName: 'Testband', firstName: 'Benedikt', nickname: null })
  assert.ok(bodyText.startsWith('Servus Benedikt,'))
})

// ── Terminabstimmung ausschliesslich per Antwortmail (V1-Produktentscheidung,
// Nachfass-Paket "Terminabstimmung per Antwort" -- ersetzt die fruehere
// optionale meetergo-Logik vollstaendig) ──────────────────────────────────

test('renderBandIntroConfirmationMail: fordert zu Antwort mit 2-3 Terminvorschlaegen auf', () => {
  const { bodyText } = renderBandIntroConfirmationMail({ bandName: 'Testband', firstName: 'Anna', nickname: null })
  assert.ok(bodyText.includes('Antworte mir dafür einfach auf diese Mail'))
  assert.ok(bodyText.includes('zwei oder drei Terminen'))
})

test('renderBandIntroConfirmationMail: fordert die beste Rueckruf-Telefonnummer an', () => {
  const { bodyText } = renderBandIntroConfirmationMail({ bandName: 'Testband', firstName: 'Anna', nickname: null })
  assert.ok(bodyText.includes('der Telefonnummer, unter der ich dich am besten erreiche'))
})

test('renderBandIntroConfirmationMail: enthaelt keinen meetergo-Link, keinen Terminplaner, keine Online-Terminbuchung', () => {
  const { bodyText } = renderBandIntroConfirmationMail({ bandName: 'Testband', firstName: 'Anna', nickname: null })
  assert.ok(!/meetergo/i.test(bodyText))
  assert.ok(!bodyText.includes('Termin auswählen'))
  assert.ok(!/terminplaner|online.?termin/i.test(bodyText))
})

test('renderBandIntroConfirmationMailHtml: enthaelt keinen meetergo-Link, keinen Terminplaner-Button', () => {
  const html = renderBandIntroConfirmationMailHtml({ bandName: 'Testband', firstName: 'Anna', nickname: null })
  assert.ok(!/meetergo/i.test(html))
  assert.ok(!html.includes('Termin auswählen'))
  assert.ok(html.includes('Antworte mir dafür einfach auf diese Mail'))
})

test('renderBandIntroConfirmationMailHtml: escaped HTML-Sonderzeichen in Bandname/Namen', () => {
  const html = renderBandIntroConfirmationMailHtml({ bandName: '<script>alert(1)</script>', firstName: 'Anna', nickname: null })
  assert.ok(!html.includes('<script>alert(1)</script>'))
  assert.ok(html.includes('&lt;script&gt;'))
})

// ── Interne Benachrichtigung (Auftrag Abschnitt 31) ───────────────────────

test('renderBandIntroInternalNotification: enthaelt alle uebergebenen Felder', () => {
  const { subject, bodyText } = renderBandIntroInternalNotification(internalContent())

  assert.ok(subject.includes('Testband'))
  assert.ok(bodyText.includes('München'))
  assert.ok(bodyText.includes('https://testband.de'))
  assert.ok(bodyText.includes('https://instagram.com/testband'))
  assert.ok(bodyText.includes('Wir spielen Rock und Pop'))
  assert.ok(bodyText.includes('Anna Müller'))
  assert.ok(bodyText.includes('Ann'))
  assert.ok(bodyText.includes('anna@beispiel.de'))
  assert.ok(bodyText.includes('0151 1234567'))
  assert.ok(bodyText.includes('intro-1'))
})

test('renderBandIntroInternalNotificationHtml: Links sind als <a href> anklickbar', () => {
  const html = renderBandIntroInternalNotificationHtml(
    internalContent({ additionalLinks: ['https://instagram.com/testband', 'https://youtube.com/testband'] })
  )

  assert.ok(html.includes('<a href="https://testband.de"'))
  assert.ok(html.includes('<a href="https://instagram.com/testband"'))
  assert.ok(html.includes('<a href="https://youtube.com/testband"'))
})

test('renderBandIntroInternalNotification: keine automatische Erzeugung von Band/Profil-Text (nur Rohdaten)', () => {
  const { bodyText } = renderBandIntroInternalNotification(internalContent({ description: 'Kurzbeschreibung.' }))
  assert.ok(!/kategorie|mood|repertoire|eventtyp/i.test(bodyText))
})

// ── Warnung bei fehlgeschlagener Bestaetigungsmail (Nachfass-Paket
// Abschnitt 10) ────────────────────────────────────────────────────────────

test('renderBandIntroInternalNotification: confirmationMailFailed=false -> kein Warnhinweis, normaler Betreff', () => {
  const { subject, bodyText } = renderBandIntroInternalNotification(internalContent({ confirmationMailFailed: false }))
  assert.equal(subject, 'Neue Bandvorstellung: Testband')
  assert.ok(!/achtung|fehlgeschlagen/i.test(bodyText))
})

test('renderBandIntroInternalNotification: confirmationMailFailed=true -> sichtbarer Warnhinweis im Betreff UND Body', () => {
  const { subject, bodyText } = renderBandIntroInternalNotification(internalContent({ confirmationMailFailed: true }))
  assert.ok(subject.startsWith('[Bestätigung fehlgeschlagen]'))
  assert.ok(subject.includes('Testband'))
  assert.ok(/ACHTUNG/.test(bodyText))
  assert.ok(bodyText.includes('vermutlich NICHT erhalten'))
})

test('renderBandIntroInternalNotificationHtml: confirmationMailFailed=true -> Warnbox im HTML', () => {
  const html = renderBandIntroInternalNotificationHtml(internalContent({ confirmationMailFailed: true }))
  assert.ok(/ACHTUNG/.test(html))
  assert.ok(html.includes('vermutlich NICHT erhalten'))
})

test('renderBandIntroInternalNotificationHtml: confirmationMailFailed=false -> keine Warnbox im HTML', () => {
  const html = renderBandIntroInternalNotificationHtml(internalContent({ confirmationMailFailed: false }))
  assert.ok(!/ACHTUNG/.test(html))
})
