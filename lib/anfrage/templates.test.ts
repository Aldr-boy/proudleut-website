import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  renderBandMail,
  renderBandMailV2,
  renderBandMailV2Html,
  renderConfirmationMail,
  renderConfirmationMailV2,
  renderConfirmationMailV2Html,
  renderHtmlFromTextSnapshot,
  buildTelHref,
} from './templates.ts'
import type { BandMailV2Content, ConfirmationMailV2Content } from './templates.ts'
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

// ── Block "Confirmation V2" (Owner-Entscheidung Variante A) ─────────────

const CONFIRMATION_ONE_BAND: ConfirmationMailV2Content = {
  vorname: 'Pia',
  bands: [{ name: 'Donnaweda', slug: 'donnaweda' }],
  anlass: 'Dult',
  datumText: 'Sonntag, den 22.07.2026',
  location: 'Hauptbühne am Markt',
  plzOrt: '92356 Kelheim',
  nachricht: 'Hallo liebe Band,\n\nbitte begleitet uns bei einem wunderbaren Abend.\n\nLiebe Grüße\nDie Stadt',
}

const CONFIRMATION_THREE_BANDS: ConfirmationMailV2Content = {
  ...CONFIRMATION_ONE_BAND,
  bands: [
    { name: 'Donnaweda', slug: 'donnaweda' },
    { name: "Ö'ha", slug: 'oeha-band' },
    { name: 'De Gaudimacha', slug: 'de-gaudimacha' },
  ],
}

test('renderConfirmationMailV2: Betreff bei genau einer Band', () => {
  const { subject } = renderConfirmationMailV2(CONFIRMATION_ONE_BAND)
  assert.equal(subject, 'Deine Anfrage an Donnaweda ist raus')
})

test('renderConfirmationMailV2: Betreff bei mehreren Bands', () => {
  const { subject } = renderConfirmationMailV2(CONFIRMATION_THREE_BANDS)
  assert.equal(subject, 'Deine Anfrage an 3 Bands ist raus')
})

test('renderConfirmationMailV2: korrekter Singular in "Wie geht\'s jetzt weiter"', () => {
  const { bodyText } = renderConfirmationMailV2(CONFIRMATION_ONE_BAND)
  assert.match(bodyText, /Die Band meldet sich direkt bei dir\./)
  assert.doesNotMatch(bodyText, /Die Bands melden sich/)
})

test('renderConfirmationMailV2: korrekter Plural in "Wie geht\'s jetzt weiter"', () => {
  const { bodyText } = renderConfirmationMailV2(CONFIRMATION_THREE_BANDS)
  assert.match(bodyText, /Die Bands melden sich direkt bei dir\./)
  assert.doesNotMatch(bodyText, /Die Band meldet sich/)
})

test('renderConfirmationMailV2: Bandliste enthaelt /band/{slug}-URLs aller Bands', () => {
  const { bodyText } = renderConfirmationMailV2(CONFIRMATION_THREE_BANDS)
  assert.match(bodyText, /https:\/\/proudleut\.com\/band\/donnaweda/)
  assert.match(bodyText, /https:\/\/proudleut\.com\/band\/oeha-band/)
  assert.match(bodyText, /https:\/\/proudleut\.com\/band\/de-gaudimacha/)
})

test('renderConfirmationMailV2: Veranstaltungsdaten und persoenliche Nachricht vorhanden', () => {
  const { bodyText } = renderConfirmationMailV2(CONFIRMATION_ONE_BAND)
  assert.match(bodyText, /Dult/)
  assert.match(bodyText, /Sonntag, den 22\.07\.2026/)
  assert.match(bodyText, /92356 Kelheim/)
  assert.match(bodyText, /Hauptbühne am Markt/)
  assert.match(bodyText, /bitte begleitet uns bei einem wunderbaren Abend\./)
})

test('renderConfirmationMailV2: keine Nachricht vorhanden -> kein Nachrichtenblock, kein Ersatztext', () => {
  const { bodyText } = renderConfirmationMailV2({ ...CONFIRMATION_ONE_BAND, nachricht: null })
  assert.doesNotMatch(bodyText, /Deine Nachricht:/)
  assert.doesNotMatch(bodyText, /Keine persönliche Nachricht/)
})

test('renderConfirmationMailV2: reine Whitespace-Nachricht gilt wie keine Nachricht', () => {
  const { bodyText } = renderConfirmationMailV2({ ...CONFIRMATION_ONE_BAND, nachricht: '   ' })
  assert.doesNotMatch(bodyText, /Deine Nachricht:/)
})

test('renderConfirmationMailV2: enthaelt "Wie geht\'s jetzt weiter?"-Wortlaut', () => {
  const { bodyText } = renderConfirmationMailV2(CONFIRMATION_ONE_BAND)
  assert.match(bodyText, /Mit deiner Anfrage ist noch keine Buchung verbunden/)
  assert.match(bodyText, /Viel Vorfreude auf euer Event!/)
  assert.match(bodyText, /Liebe Grüße\nAlex/)
})

test('renderConfirmationMailV2: Rechtlinks direkt auf /impressum und /datenschutz', () => {
  const { bodyText } = renderConfirmationMailV2(CONFIRMATION_ONE_BAND)
  assert.match(bodyText, new RegExp(LEGAL_LINKS.impressumUrl.replace(/\//g, '\\/')))
  assert.match(bodyText, new RegExp(LEGAL_LINKS.datenschutzUrl.replace(/\//g, '\\/')))
})

test('renderConfirmationMailV2Html: Betreff bei einer Band identisch zu Plain-Text-Betreff', () => {
  const plain = renderConfirmationMailV2(CONFIRMATION_ONE_BAND)
  const html = renderConfirmationMailV2Html(CONFIRMATION_ONE_BAND)
  assert.match(html, new RegExp(`<h1[^>]*>\\s*${plain.subject.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*<\\/h1>`))
})

test('renderConfirmationMailV2Html: Betreff bei mehreren Bands', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_THREE_BANDS)
  assert.match(html, /Deine Anfrage an 3 Bands ist raus/)
})

test('renderConfirmationMailV2Html: mehrere Bandzeilen mit "Band ansehen"-CTA auf /band/{slug}', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_THREE_BANDS)
  assert.match(html, /href="https:\/\/proudleut\.com\/band\/donnaweda"[^>]*>[\s\S]*?Band ansehen/)
  assert.match(html, /href="https:\/\/proudleut\.com\/band\/oeha-band"[^>]*>[\s\S]*?Band ansehen/)
  assert.match(html, /href="https:\/\/proudleut\.com\/band\/de-gaudimacha"[^>]*>[\s\S]*?Band ansehen/)
  assert.equal((html.match(/Band ansehen/g) ?? []).length, 3)
})

test('renderConfirmationMailV2Html: letzte Band-Row ohne border-bottom, vorherige mit border-bottom', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_THREE_BANDS)
  const rowStyles = [...html.matchAll(/<td style="padding:15px 0;([^"]*)">/g)].map((m) => m[1])
  assert.equal(rowStyles.length, 3)
  assert.equal(rowStyles[0], 'border-bottom:1px solid #ece8e4;')
  assert.equal(rowStyles[1], 'border-bottom:1px solid #ece8e4;')
  assert.equal(rowStyles[2], '')
})

// ── Block "Confirmation V2 -- Designtransfer Preview v3" ────────────────

test('renderConfirmationMailV2Html: Eyebrow "Bestätigung" statt "Deine Anfrage"', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_ONE_BAND)
  assert.match(
    html,
    /font-size:11px;line-height:1\.4;font-weight:700;letter-spacing:\.08em;text-transform:uppercase;color:#734b8b;">\s*Bestätigung\s*</
  )
  assert.doesNotMatch(
    html,
    /font-size:11px;line-height:1\.4;font-weight:700;letter-spacing:\.08em;text-transform:uppercase;color:#734b8b;">\s*Deine Anfrage\s*</
  )
})

test('renderConfirmationMailV2Html: "Band ansehen" als dezenter Textlink (Pfeil, Proudleut-Lila), kein Pill-Button mehr', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_ONE_BAND)
  assert.match(html, /Band ansehen &rarr;/)
  assert.match(html, /color:#734b8b;text-decoration:none;font-size:14px;font-weight:600;">\s*Band ansehen &rarr;/)
  // Alter Pill-Stil (Hintergrund/Border/radius:999px) darf beim Bandlink
  // nicht mehr vorkommen.
  assert.doesNotMatch(html, /Band ansehen\s*<\/a>/)
  assert.doesNotMatch(html, /border-radius:999px;padding:9px 15px/)
})

test('renderConfirmationMailV2Html: Bandname groesser/gewichtiger als Bodytext', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_ONE_BAND)
  assert.match(html, /font-size:17px;font-weight:700;line-height:1\.3;color:#1a1a1a;">\s*Donnaweda/)
})

test('renderConfirmationMailV2Html: Deine Veranstaltung als Label\\/Wert-HTML-Tabelle mit den vier Labels', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_ONE_BAND)
  assert.match(html, /<table role="presentation" width="100%"[^>]*>\s*<tr>\s*<td[^>]*>Anlass<\/td>\s*<td[^>]*>Dult<\/td>/)
  assert.match(html, /<td[^>]*>Termin<\/td>\s*<td[^>]*>Sonntag, den 22\.07\.2026<\/td>/)
  assert.match(html, /<td[^>]*>Ort<\/td>\s*<td[^>]*>92356 Kelheim<\/td>/)
  assert.match(html, /<td[^>]*>Location<\/td>\s*<td[^>]*>Hauptbühne am Markt<\/td>/)
})

test('renderConfirmationMailV2Html: Anlass fehlt -> Zeile "Anlass" wird nicht gerendert (bestehende Conditional-Logik erhalten)', () => {
  const html = renderConfirmationMailV2Html({ ...CONFIRMATION_ONE_BAND, anlass: null })
  assert.doesNotMatch(html, /<td[^>]*>Anlass<\/td>/)
  assert.match(html, /<td[^>]*>Termin<\/td>/)
})

test('renderConfirmationMailV2Html: "Die Band(s) melden sich direkt bei dir." typografisch hervorgehoben (Singular und Plural)', () => {
  const htmlSingle = renderConfirmationMailV2Html(CONFIRMATION_ONE_BAND)
  assert.match(htmlSingle, /font-size:17px;font-weight:700;color:#1a1a1a;">\s*Die Band meldet sich direkt bei dir\./)

  const htmlPlural = renderConfirmationMailV2Html(CONFIRMATION_THREE_BANDS)
  assert.match(htmlPlural, /font-size:17px;font-weight:700;color:#1a1a1a;">\s*Die Bands melden sich direkt bei dir\./)
})

test('renderConfirmationMailV2Html: zusaetzlicher Abstand vor "Liebe Grüße" (eigener Absatz statt gleicher Zeile)', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_ONE_BAND)
  assert.match(html, /<p style="margin:0 0 10px 0;">\s*Viel Vorfreude auf euer Event!\s*<\/p>/)
  assert.match(html, /<p style="margin:0;">\s*Liebe Grüße<br>\s*<strong>Alex<\/strong>\s*<\/p>/)
})

test('renderConfirmationMailV2Html: genau EIN Trenner zwischen Alex-Kontaktblock und technischem Footer', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_ONE_BAND)
  const afterPortrait = html.slice(html.indexOf('+49 175 2721331'))
  assert.equal((afterPortrait.match(/border-top:1px solid/g) ?? []).length, 1)
})

test('renderConfirmationMailV2Html: Veranstaltungsdaten sichtbar', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_ONE_BAND)
  assert.match(html, /Deine Veranstaltung/)
  assert.match(html, /Dult/)
  assert.match(html, /Sonntag, den 22\.07\.2026/)
  assert.match(html, /92356 Kelheim/)
  assert.match(html, /Hauptbühne am Markt/)
})

test('renderConfirmationMailV2Html: persoenliche Nachricht vorhanden -> Zeilenumbrueche als <br>, KEIN white-space:pre-line', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_ONE_BAND)
  assert.match(html, /Deine Nachricht/)
  assert.match(html, /bitte begleitet uns bei einem wunderbaren Abend\.<br>/)
  const nachrichtBlockMatch = html.match(/Deine Nachricht[\s\S]*?<\/div>/)
  assert.ok(nachrichtBlockMatch)
  assert.doesNotMatch(nachrichtBlockMatch![0], /white-space:pre-line/)
})

test('renderConfirmationMailV2Html: keine Nachricht -> gesamter Nachrichtenabschnitt fehlt komplett', () => {
  const html = renderConfirmationMailV2Html({ ...CONFIRMATION_ONE_BAND, nachricht: null })
  assert.doesNotMatch(html, /Deine Nachricht/)
})

test('renderConfirmationMailV2Html: reine Whitespace-Nachricht -> gesamter Nachrichtenabschnitt fehlt komplett', () => {
  const html = renderConfirmationMailV2Html({ ...CONFIRMATION_ONE_BAND, nachricht: '   ' })
  assert.doesNotMatch(html, /Deine Nachricht/)
})

test('renderConfirmationMailV2Html: "Wie geht\'s jetzt weiter?"-Abschnitt vorhanden', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_ONE_BAND)
  assert.match(html, /Wie geht's jetzt weiter\?/)
  assert.match(html, /Mit deiner Anfrage ist noch keine Buchung verbunden/)
  assert.match(html, /Viel Vorfreude auf euer Event!/)
})

test('renderConfirmationMailV2Html: Footer-Hinweis exakt', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_ONE_BAND)
  assert.match(html, /Diese Bestätigung wurde automatisch nach deiner Anfrage auf proudleut\.com verschickt\./)
})

test('renderConfirmationMailV2Html: Preheader vorhanden', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_ONE_BAND)
  assert.match(html, /display:none;max-height:0;overflow:hidden;mso-hide:all;/)
  assert.match(html, /Deine Anfrage an Donnaweda ist raus/)
  assert.match(html, /&zwnj;/)
})

test('renderConfirmationMailV2Html: Nutzertexte (Bandname, Anlass, Ort, Nachricht) sicher escaped', () => {
  const html = renderConfirmationMailV2Html({
    ...CONFIRMATION_ONE_BAND,
    bands: [{ name: '<img src=x onerror=alert(1)>', slug: 'x' }],
    anlass: '<b>Anlass</b>',
    location: '<i>Ort</i>',
    plzOrt: '<u>PLZ</u>',
    nachricht: 'Zeile1\nZeile2 mit <script>alert(2)</script>',
  })
  assert.doesNotMatch(html, /<img src=x onerror/)
  assert.doesNotMatch(html, /<b>Anlass<\/b>/)
  assert.doesNotMatch(html, /<i>Ort<\/i>/)
  assert.doesNotMatch(html, /<u>PLZ<\/u>/)
  assert.doesNotMatch(html, /<script>alert\(2\)/)
  assert.match(html, /&lt;script&gt;/)
})

test('renderConfirmationMailV2Html: Container-Innenabstand ueber pl-px-Klasse wie Bandmail v2 (34px Desktop, 22px Mobile)', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_ONE_BAND)
  assert.match(html, /class="pl-px"/)
  assert.match(html, /\.pl-px \{\s*padding-left: 22px !important;\s*padding-right: 22px !important;\s*\}/)
})

test('renderConfirmationMailV2Html: Logo-/Portrait-Assets identisch zur Bandmail v2', () => {
  const html = renderConfirmationMailV2Html(CONFIRMATION_ONE_BAND)
  assert.match(
    html,
    /https:\/\/bfyucjjyarvqeftqqihm\.supabase\.co\/storage\/v1\/object\/public\/band-media\/proudleut\/proudleut_Logo_rgb_72dpi\.png/
  )
  assert.match(
    html,
    /https:\/\/bfyucjjyarvqeftqqihm\.supabase\.co\/storage\/v1\/object\/public\/band-media\/proudleut\/Alexander%20Dressler\.jpg/
  )
})

test('renderConfirmationMailV2Html: Plain Text und HTML inhaltlich aequivalent (gleiche Kernaussagen)', () => {
  const plain = renderConfirmationMailV2(CONFIRMATION_THREE_BANDS)
  const html = renderConfirmationMailV2Html(CONFIRMATION_THREE_BANDS)
  assert.equal(plain.subject, 'Deine Anfrage an 3 Bands ist raus')
  assert.match(html, /Deine Anfrage an 3 Bands ist raus/)
  for (const band of CONFIRMATION_THREE_BANDS.bands) {
    assert.match(plain.bodyText, new RegExp(band.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    const htmlEscapedName = band.name.replace(/'/g, '&#39;').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    assert.match(html, new RegExp(htmlEscapedName))
  }
  assert.match(plain.bodyText, /Mit deiner Anfrage ist noch keine Buchung verbunden/)
  assert.match(html, /Mit deiner Anfrage ist noch keine Buchung verbunden/)
})
