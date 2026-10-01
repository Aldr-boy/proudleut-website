import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { hasParagraphBreak, normalizeLineEndings, splitLines, splitParagraphs } from './bandTextParagraphs.ts'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const descriptionSource = readFileSync(path.join(root, 'components', 'band', 'BandDescription.tsx'), 'utf8')
const markdownSource = readFileSync(path.join(root, 'components', 'MarkdownText.tsx'), 'utf8')

test('CRLF wird zu LF normalisiert, auch einzelne \\r', () => {
  assert.equal(normalizeLineEndings('a\r\nb\rc\nd'), 'a\nb\nc\nd')
})

test('Leerzeile als \\r\\n\\r\\n zaehlt jetzt als echter Absatz (vorher ein einziger Block)', () => {
  assert.deepEqual(splitParagraphs('Eins\r\n\r\nZwei'), ['Eins', 'Zwei'])
  assert.equal(hasParagraphBreak('Eins\r\n\r\nZwei'), true)
})

test('echte Absaetze mit \\n\\n bleiben unveraendert (inkl. mehrere Leerzeilen und trim)', () => {
  assert.deepEqual(splitParagraphs('  Eins\n\n\nZwei\n\nDrei  '), ['Eins', 'Zwei', 'Drei'])
})

test('einfache Umbrueche sind kein Absatz: ein Block, hasParagraphBreak false (Einklapp-Grenze bleibt)', () => {
  const text = 'Zeile 1\r\nZeile 2\r\nZeile 3'
  assert.deepEqual(splitParagraphs(text), ['Zeile 1\nZeile 2\nZeile 3'])
  assert.equal(hasParagraphBreak(text), false)
})

test('splitLines entfernt leere Zeilen, behaelt den Text der Zeilen', () => {
  assert.deepEqual(splitLines('a\n \nb\n\nc'), ['a', 'b', 'c'])
})

test('MarkdownText: Default bleibt "break" (einfache Umbrueche als <br />), "spaced" ist Opt-in mit kleinerem Abstand (space-y-3)', () => {
  assert.match(markdownSource, /lineBreaks = 'break'/)
  assert.match(markdownSource, /className="space-y-3"/)
  assert.match(markdownSource, /<br key=/)
})

test('BandDescription: Einklapp-Grenze richtet sich nur nach echten Absaetzen; "spaced" nur ohne Absatzumbruch', () => {
  assert.match(descriptionSource, /const paragraphs = band\.description \? splitParagraphs\(band\.description\) : \[\];/)
  assert.match(descriptionSource, /const hasMore = restParagraphs\.length > 0;/)
  assert.match(descriptionSource, /!hasParagraphBreak\(band\.description\) \? 'spaced' : 'break'/)
  assert.equal((descriptionSource.match(/lineBreaks=\{lineBreaks\}/g) ?? []).length, 2)
})
