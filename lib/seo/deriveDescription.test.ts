import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveDescriptionFromText } from './deriveDescription.ts'

// Paket 3 (Musiker-Description): echte Ausfuehrungstests fuer die reine
// Ableitungslogik, inkl. der vom Auftrag ausdruecklich verlangten
// Randfaelle (leer, kurz, ohne Satzzeichen, laenger) sowie ein Fixture mit
// Dominik Palmers tatsaechlicher, bereits vorhandener Bio (real gegen
// Produktion gelesen) als konkreter Referenzfall.

test('leerer/undefined/null Text liefert undefined, kein Crash', () => {
  assert.equal(deriveDescriptionFromText(undefined), undefined)
  assert.equal(deriveDescriptionFromText(null), undefined)
  assert.equal(deriveDescriptionFromText(''), undefined)
  assert.equal(deriveDescriptionFromText('   '), undefined)
})

test('kurzer Text (unter dem Limit) wird unveraendert zurueckgegeben', () => {
  assert.equal(deriveDescriptionFromText('Kurzer Satz.'), 'Kurzer Satz.')
})

test('Whitespace wird normalisiert (Zeilenumbrueche, doppelte Leerzeichen)', () => {
  assert.equal(deriveDescriptionFromText('Erster Satz.\n\n  Zweiter   Satz.'), 'Erster Satz. Zweiter Satz.')
})

test('Text ohne Satzzeichen wird an einer Wortgrenze mit Ellipse gekuerzt, kein Abschneiden mitten im Wort', () => {
  const longNoPunctuation = 'Wort '.repeat(60).trim() // 300 Zeichen, keine Satzzeichen
  const result = deriveDescriptionFromText(longNoPunctuation, 50)!
  assert.ok(result.length <= 51, `Ergebnis zu lang: ${result.length}`)
  assert.ok(result.endsWith('…'))
  assert.ok(!result.slice(0, -1).endsWith(' '), 'kein Leerzeichen direkt vor der Ellipse')
  // Kein abgeschnittenes Teilwort: jedes Zeichen vor der Ellipse gehoert zu einem vollstaendigen "Wort"-Token
  assert.match(result, /^(Wort ?)+…$/)
})

test('laengerer Text mit Satzzeichen wird an der letzten vollstaendigen Satzgrenze innerhalb des Limits gekuerzt, ohne Ellipse', () => {
  const text = 'Erster Satz mit Inhalt. Zweiter Satz mit mehr Inhalt und Kontext. Dritter Satz, der das Limit sprengen wuerde und daher nicht mehr auftauchen darf.'
  const result = deriveDescriptionFromText(text, 70)!
  assert.equal(result, 'Erster Satz mit Inhalt. Zweiter Satz mit mehr Inhalt und Kontext.')
  assert.ok(!result.includes('…'))
  assert.ok(result.length <= 70)
})

test('Dominik Palmer Referenzfall: reale, bereits vorhandene Bio ergibt die ersten beiden vollstaendigen Saetze', () => {
  const dominikBio =
    'Dominik ist Bassist mit Leib und Seele. Groove, Timing und das Zusammenspiel in der Band sind für ihn das, was ihn reizt und Spaß macht. Wenn es sein Terminkalender zulässt, steht er mit seiner eigenen Band More Candy als Bassist und Bandleader auf der Bühne. Dazwischen ist er mit ganz unterschiedlichen Künstlern und Produktionen in Deutschland und Europa unterwegs. Musikalisch lässt er sich dabei nur ungern in eine Schublade stecken: Rock, Pop, Soul, Singer-Songwriter, Jazz oder große Live- und Crossoverproduktionen. Hauptsache, es groovt und funktioniert als Band.'

  const result = deriveDescriptionFromText(dominikBio)
  assert.equal(
    result,
    'Dominik ist Bassist mit Leib und Seele. Groove, Timing und das Zusammenspiel in der Band sind für ihn das, was ihn reizt und Spaß macht.'
  )
  assert.ok(result!.length <= 155)
  assert.ok(!result!.includes('…'), 'endet an einer echten Satzgrenze, keine Ellipse noetig')
})
