import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  renderBandMail,
  renderBandMailV2,
  renderBandMailV2Html,
  renderConfirmationMail,
  renderHtmlFromTextSnapshot,
  buildTelHref,
} from './templates.ts'
import type { BandMailV2Content } from './templates.ts'
import type { NormalizedAnfrageInput, ResolvedBand } from './types.ts'
import { LEGAL_LINKS } from './constants.ts'

const INPUT: NormalizedAnfrageInput = {
  idempotencyKey: 'web-12345678',
  bandSlugs: ['band-a', 'band-b'],
  anlass: 'Hochzeit',
  datumText: 'September/Oktober 2026',
  location: 'Festscheune Müller',
  plzOrt: '80331 München',
  gaestezahl: '120',
  spielzeit: '19-23 Uhr',
  nachricht: 'Freuen uns sehr auf euch!',
  vorname: 'Anna',
  nachname: 'Müller',
  email: 'anna@beispiel.de',
  telefon: '0151 1234567',
}

const BAND_A: ResolvedBand = { bandId: 'a-id', name: 'Band A', slug: 'band-a', recipientEmail: 'kontakt@band-a.de' }
const BAND_B: ResolvedBand = { bandId: 'b-id', name: 'Band B', slug: 'band-b', recipientEmail: 'kontakt@band-b.de' }

test('renderBandMail: nennt die angefragte Band im Betreff', () => {
  const { subject } = renderBandMail(INPUT, BAND_A)
  assert.match(subject, /Band A/)
})

test('renderBandMail: erwaehnt KEINE andere angefragte Band', () => {
  const { subject, bodyText } = renderBandMail(INPUT, BAND_A)
  assert.doesNotMatch(subject, /Band B/)
  assert.doesNotMatch(bodyText, /Band B/)
})

test('renderBandMail: verwendet datum_text woertlich', () => {
  const { bodyText } = renderBandMail(INPUT, BAND_A)
  assert.match(bodyText, /September\/Oktober 2026/)
})

test('renderBandMail: enthaelt Veranstalterdaten und persoenliche Nachricht', () => {
  const { bodyText } = renderBandMail(INPUT, BAND_A)
  assert.match(bodyText, /Anna Müller/)
  assert.match(bodyText, /anna@beispiel\.de/)
  assert.match(bodyText, /Freuen uns sehr auf euch!/)
})

test('renderBandMail: enthaelt Impressum- und Datenschutz-Verweis', () => {
  const { bodyText } = renderBandMail(INPUT, BAND_A)
  assert.match(bodyText, /Impressum:/)
  assert.match(bodyText, /Datenschutz:/)
})

test('renderConfirmationMail: listet alle ausgewaehlten Bands', () => {
  const { bodyText } = renderConfirmationMail(INPUT, [BAND_A, BAND_B])
  assert.match(bodyText, /Band A/)
  assert.match(bodyText, /Band B/)
})

test('renderConfirmationMail: suggeriert keine Zusage/Verfuegbarkeit', () => {
  const { bodyText } = renderConfirmationMail(INPUT, [BAND_A, BAND_B])
  assert.match(bodyText, /keine Zusage/)
})

test('renderConfirmationMail: enthaelt keine internen Versanddetails (Resend/Message-ID/Status)', () => {
  const { bodyText, subject } = renderConfirmationMail(INPUT, [BAND_A, BAND_B])
  const combined = `${subject}\n${bodyText}`.toLowerCase()
  assert.doesNotMatch(combined, /resend/)
  assert.doesNotMatch(combined, /message-id/)
  assert.doesNotMatch(combined, /fehlgeschlagen/)
})

test('renderConfirmationMail: verwendet datum_text woertlich', () => {
  const { bodyText } = renderConfirmationMail(INPUT, [BAND_A])
  assert.match(bodyText, /September\/Oktober 2026/)
})

test('renderHtmlFromTextSnapshot: escaped HTML-Sonderzeichen sicher', () => {
  const html = renderHtmlFromTextSnapshot('<script>alert(1)</script>', 'Text mit <b>Tag</b> & "Anführung"')
  assert.doesNotMatch(html.slice(html.indexOf('<body>')), /<script>/)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /&amp;/)
})

test('renderHtmlFromTextSnapshot: erhaelt Zeilenumbrueche als <br />', () => {
  const html = renderHtmlFromTextSnapshot('Betreff', 'Zeile1\nZeile2')
  assert.match(html, /Zeile1<br \/>Zeile2/)
})

// ── Block "Bandanfrage-Mail V3": renderBandMailV2 (Plain Text) ──────────

test('renderBandMailV2: verwendet dieselbe Betreff-Logik wie renderBandMail (unveraendert, Abschnitt 13)', () => {
  const v1 = renderBandMail(INPUT, BAND_A)
  const v2 = renderBandMailV2(INPUT, BAND_A)
  assert.equal(v1.subject, v2.subject)
})

test('renderBandMailV2: Servus-Anrede und V3-Einleitung', () => {
  const { bodyText } = renderBandMailV2(INPUT, BAND_A)
  assert.match(bodyText, /^Servus Band A,/)
  assert.match(bodyText, /über eure Bandseite bei proudleut hat euch Anna eine neue Anfrage geschickt\./)
})

// ── Block "Bandmail V3.1": Bandseiten-Link (Plain Text) ─────────────────

test('renderBandMailV2: dezente Bandseiten-URL als eigene Zeile, keine haessliche Inline-URL im Satz', () => {
  const { bodyText } = renderBandMailV2(INPUT, BAND_A)
  assert.doesNotMatch(bodyText, /geschickt\.\s*https:\/\//)
  assert.match(bodyText, /^Bandseite: https:\/\/proudleut\.com\/band\/band-a$/m)
})

test('renderBandMailV2: Bandseiten-URL gehoert zur jeweils angefragten Band', () => {
  const { bodyText: bodyA } = renderBandMailV2(INPUT, BAND_A)
  const { bodyText: bodyB } = renderBandMailV2(INPUT, BAND_B)
  assert.match(bodyA, /https:\/\/proudleut\.com\/band\/band-a/)
  assert.doesNotMatch(bodyA, /https:\/\/proudleut\.com\/band\/band-b/)
  assert.match(bodyB, /https:\/\/proudleut\.com\/band\/band-b/)
})

test('renderBandMailV2: datum_text (konkretes Datum) unveraendert', () => {
  const { bodyText } = renderBandMailV2({ ...INPUT, datumText: '20.06.2027' }, BAND_A)
  assert.match(bodyText, /20\.06\.2027/)
})

test('renderBandMailV2: datum_text (Zeitraum/mehrere Termine) unveraendert', () => {
  const { bodyText } = renderBandMailV2({ ...INPUT, datumText: '20.06.2027 oder 27.06.2027' }, BAND_A)
  assert.match(bodyText, /20\.06\.2027 oder 27\.06\.2027/)
})

test('renderBandMailV2: V3-Abschluss mit Alex', () => {
  const { bodyText } = renderBandMailV2(INPUT, BAND_A)
  assert.match(bodyText, /Bitte gebt Anna möglichst zeitnah direkt Bescheid/)
  assert.match(bodyText, /Liebe Grüße\nAlex/)
})

test('renderBandMailV2: Rechtlinks direkt auf \\/impressum und \\/datenschutz', () => {
  const { bodyText } = renderBandMailV2(INPUT, BAND_A)
  assert.match(bodyText, new RegExp(LEGAL_LINKS.impressumUrl.replace(/\//g, '\\/')))
  assert.match(bodyText, new RegExp(LEGAL_LINKS.datenschutzUrl.replace(/\//g, '\\/')))
})

// ── Block "Bandanfrage-Mail V3": buildTelHref (Owner-Entscheidung A1) ───

test('buildTelHref: reine Ziffern -> tel:-Link', () => {
  assert.equal(buildTelHref('01794839174'), 'tel:01794839174')
})

test('buildTelHref: fuehrendes + bleibt erhalten', () => {
  assert.equal(buildTelHref('+491794839174'), 'tel:+491794839174')
})

test('buildTelHref: entfernt ausschliesslich Leerzeichen/Tabs/Bindestriche/Punkte/Slash/Klammern', () => {
  assert.equal(buildTelHref('0179 483-9174'), 'tel:01794839174')
  assert.equal(buildTelHref('+49 (179) 4839.174'), 'tel:+491794839174')
})

test('buildTelHref: unklares Format (z. B. Buchstaben) -> null, kein Link', () => {
  assert.equal(buildTelHref('siehe Website'), null)
  assert.equal(buildTelHref('0179/48x9174'), null)
})

test('buildTelHref: mehrere + oder + nicht fuehrend -> null', () => {
  assert.equal(buildTelHref('49+1794839174'), null)
  assert.equal(buildTelHref('++491794839174'), null)
})

// ── Block "Bandanfrage-Mail V3": renderBandMailV2Html ───────────────────

const V2_CONTENT: BandMailV2Content = {
  bandName: 'Band A',
  bandSlug: 'band-a',
  vorname: 'Anna',
  nachname: 'Müller',
  email: 'anna@beispiel.de',
  telefon: '0179 4839174',
  anlass: 'Hochzeit',
  datumText: 'September/Oktober 2026',
  location: 'Festscheune Müller',
  plzOrt: '80331 München',
  nachricht: 'Freuen uns sehr auf euch!',
}

test('renderBandMailV2Html: rendert V3-Grundstruktur und freigegebenes Wording', () => {
  const html = renderBandMailV2Html(V2_CONTENT)
  assert.match(html, /Servus <strong>Band A<\/strong>,/)
  assert.match(html, /Neue Anfrage/)
  assert.match(html, /Bandseite bei <strong>proudleut<\/strong>/)
  assert.match(html, /hat euch Anna eine neue Anfrage geschickt\./)
  assert.match(html, /Ihr könnt auch einfach auf diese E-Mail antworten/)
  assert.match(html, /Bands aus und für Bayern entdecken\./)
})

test('renderBandMailV2Html: datum_text (konkretes Datum) unveraendert, nicht interpretiert', () => {
  const html = renderBandMailV2Html({ ...V2_CONTENT, datumText: '30.01.2027' })
  assert.match(html, /30\.01\.2027/)
})

test('renderBandMailV2Html: datum_text (Zeitraum/mehrere Termine) unveraendert', () => {
  const html = renderBandMailV2Html({ ...V2_CONTENT, datumText: '20.06.2027 oder 27.06.2027' })
  assert.match(html, /20\.06\.2027 oder 27\.06\.2027/)
})

test('renderBandMailV2Html: Anlass vorhanden -> H1 = Anlass', () => {
  const html = renderBandMailV2Html({ ...V2_CONTENT, anlass: 'Feuerwehrball' })
  assert.match(html, /<h1[^>]*>\s*Feuerwehrball\s*<\/h1>/)
})

test('renderBandMailV2Html: Anlass fehlt -> H1 = "Anfrage von {Vorname} {Nachname}", kein null/undefined', () => {
  const html = renderBandMailV2Html({ ...V2_CONTENT, anlass: null })
  assert.match(html, /<h1[^>]*>\s*Anfrage von Anna Müller\s*<\/h1>/)
  assert.doesNotMatch(html, /null/)
  assert.doesNotMatch(html, /undefined/)
})

test('renderBandMailV2Html: Anlass fehlt UND Nachname fehlt -> nur Vorname, kein doppeltes Leerzeichen', () => {
  const html = renderBandMailV2Html({ ...V2_CONTENT, anlass: null, nachname: null })
  assert.match(html, /<h1[^>]*>\s*Anfrage von Anna\s*<\/h1>/)
})

test('renderBandMailV2Html: Telefonnummer sicher verlinkbar -> Anruf-Button und tel:-Link, Anzeige bleibt Originaleingabe', () => {
  const html = renderBandMailV2Html({ ...V2_CONTENT, telefon: '0179 4839174' })
  assert.match(html, /href="tel:01794839174"/)
  assert.match(html, /Anna anrufen/)
  assert.match(html, />0179 4839174</)
  // Drei tel:-Links insgesamt: der statische Footer-Link (Alexander), der
  // "Anna anrufen"-Button und der Link im Kontakt-Block -- beide Band-Mail-
  // Links nutzen denselben telHref.
  assert.equal((html.match(/href="tel:/g) ?? []).length, 3)
})

test('renderBandMailV2Html: Telefonnummer vorhanden, aber nicht sicher verlinkbar -> Klartext, kein tel:-Link, kein Anruf-Button', () => {
  const html = renderBandMailV2Html({ ...V2_CONTENT, telefon: 'siehe Website' })
  // Genau EIN tel:-Link im gesamten Dokument -- der statische Footer-Link
  // von Alexander Dressler. Kein zusaetzlicher Link fuer die nicht sicher
  // verlinkbare Veranstalter-Telefonnummer.
  assert.equal((html.match(/href="tel:/g) ?? []).length, 1)
  assert.doesNotMatch(html, /anrufen/)
  assert.match(html, /<br>siehe Website/)
})

test('renderBandMailV2Html: Telefonnummer fehlt -> kein Anruf-Button, keine leere Huelle', () => {
  const html = renderBandMailV2Html({ ...V2_CONTENT, telefon: null })
  assert.doesNotMatch(html, /anrufen/)
  // Weiterhin genau EIN tel:-Link (nur der statische Footer-Link).
  assert.equal((html.match(/href="tel:/g) ?? []).length, 1)
})

test('renderBandMailV2Html: persoenliche Nachricht vorhanden -> sicher escaped, Zeilenumbrueche erhalten (pre-line)', () => {
  const html = renderBandMailV2Html({ ...V2_CONTENT, nachricht: 'Zeile1\nZeile2 mit <script>alert(1)</script>' })
  assert.match(html, /Zeile1\nZeile2/)
  assert.doesNotMatch(html, /<script>alert/)
  assert.match(html, /&lt;script&gt;/)
})

test('renderBandMailV2Html: persoenliche Nachricht fehlt -> Platzhaltertext', () => {
  const html = renderBandMailV2Html({ ...V2_CONTENT, nachricht: null })
  assert.match(html, /Keine persönliche Nachricht hinterlassen\./)
})

test('renderBandMailV2Html: keine Raw-HTML-Injection aus Bandname/Vorname/Anlass/Location/PLZ-Ort', () => {
  const html = renderBandMailV2Html({
    ...V2_CONTENT,
    bandName: '<img src=x onerror=alert(1)>',
    vorname: '"><script>alert(2)</script>',
    anlass: '<b>Anlass</b>',
    location: '<i>Ort</i>',
    plzOrt: '<u>PLZ</u>',
  })
  assert.doesNotMatch(html, /<img src=x onerror/)
  assert.doesNotMatch(html, /<script>alert\(2\)/)
  assert.doesNotMatch(html, /<b>Anlass<\/b>/)
  assert.doesNotMatch(html, /<i>Ort<\/i>/)
  assert.doesNotMatch(html, /<u>PLZ<\/u>/)
})

test('renderBandMailV2Html: Rechtlinks direkt auf /impressum und /datenschutz', () => {
  const html = renderBandMailV2Html(V2_CONTENT)
  assert.match(html, new RegExp(`href="${LEGAL_LINKS.impressumUrl}"`))
  assert.match(html, new RegExp(`href="${LEGAL_LINKS.datenschutzUrl}"`))
})

// ── Block "Bandmail V3.1": Bandseiten-Link (HTML) ───────────────────────

test('renderBandMailV2Html: "Bandseite bei proudleut" verlinkt auf die reale Banddetailseite', () => {
  const html = renderBandMailV2Html({ ...V2_CONTENT, bandSlug: 'oeha-band' })
  assert.match(
    html,
    /<a href="https:\/\/proudleut\.com\/band\/oeha-band" target="_blank" style="color:#262626;text-decoration:underline;">Bandseite bei <strong>proudleut<\/strong><\/a>/
  )
})

test('renderBandMailV2Html: Bandseiten-Link gehoert zur jeweils angefragten Band, nicht zu einer anderen', () => {
  const htmlA = renderBandMailV2Html({ ...V2_CONTENT, bandSlug: 'band-a' })
  const htmlB = renderBandMailV2Html({ ...V2_CONTENT, bandSlug: 'band-b' })
  assert.match(htmlA, /href="https:\/\/proudleut\.com\/band\/band-a"/)
  assert.doesNotMatch(htmlA, /href="https:\/\/proudleut\.com\/band\/band-b"/)
  assert.match(htmlB, /href="https:\/\/proudleut\.com\/band\/band-b"/)
})

test('renderBandMailV2Html: bandSlug fehlt -> kein Link, Wortlaut bleibt sonst unveraendert', () => {
  const html = renderBandMailV2Html({ ...V2_CONTENT, bandSlug: null })
  assert.doesNotMatch(html, /<a href="[^"]*">Bandseite bei/)
  assert.match(html, /Bandseite bei <strong>proudleut<\/strong> hat euch Anna eine neue Anfrage geschickt\./)
})

test('renderBandMailV2Html: bandSlug wird escaped, keine Raw-HTML-Injection ueber den Bandseiten-Link', () => {
  const html = renderBandMailV2Html({ ...V2_CONTENT, bandSlug: '"><script>alert(3)</script>' })
  assert.doesNotMatch(html, /<script>alert\(3\)/)
})

// ── Block "Bandmail V3.1": Design-Feinheiten ────────────────────────────

test('renderBandMailV2Html: Primary-Reply-Button bleibt lila #734b8b unveraendert', () => {
  const html = renderBandMailV2Html(V2_CONTENT)
  assert.match(html, /background:#734b8b;color:#ffffff;[^"]*font-weight:700/)
})

test('renderBandMailV2Html: Secondary-Anruf-Button visuell zurueckgenommen (Border #e6e1dc, Text #5f5a56, geringeres Schriftgewicht)', () => {
  const html = renderBandMailV2Html({ ...V2_CONTENT, telefon: '0179 4839174' })
  assert.match(html, /background:#ffffff;color:#5f5a56;[^"]*font-weight:600;[^"]*border:1px solid #e6e1dc/)
})

test('renderBandMailV2Html: H1 30px Desktop, bestehende Mobile-Reduktion 24px unveraendert', () => {
  const html = renderBandMailV2Html(V2_CONTENT)
  assert.match(html, /<h1 class="pl-h1" style="margin:7px 0 6px 0;font-size:30px;/)
  assert.match(html, /\.pl-h1 \{\s*font-size: 24px !important;\s*\}/)
})

test('renderBandMailV2Html: Meta-Zeile 14px / #77706b', () => {
  const html = renderBandMailV2Html(V2_CONTENT)
  assert.match(html, /font-size:14px;line-height:1\.5;color:#77706b;/)
})

test('renderBandMailV2Html: Container-Innenabstand 34px Desktop ueber pl-px-Klasse, 22px Mobile-Override', () => {
  const html = renderBandMailV2Html(V2_CONTENT)
  assert.match(html, /class="pl-px" style="padding:32px 34px 20px 34px;"/)
  assert.match(html, /\.pl-px \{\s*padding-left: 22px !important;\s*padding-right: 22px !important;\s*\}/)
})

test('renderBandMailV2Html: Logo-URL und Portrait-URL entsprechen den freigegebenen Supabase-Assets', () => {
  const html = renderBandMailV2Html(V2_CONTENT)
  assert.match(
    html,
    /https:\/\/bfyucjjyarvqeftqqihm\.supabase\.co\/storage\/v1\/object\/public\/band-media\/proudleut\/proudleut_Logo_rgb_72dpi\.png/
  )
  assert.match(
    html,
    /https:\/\/bfyucjjyarvqeftqqihm\.supabase\.co\/storage\/v1\/object\/public\/band-media\/proudleut\/Alexander%20Dressler\.jpg/
  )
})
