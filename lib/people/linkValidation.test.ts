import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidHttpsUrl, isValidLinkLabel, isDuplicateOfWebsite } from './linkValidation.ts'

test('isValidHttpsUrl: https wird akzeptiert', () => {
  assert.equal(isValidHttpsUrl('https://de.wikipedia.org/wiki/Test'), true)
})

test('isValidHttpsUrl: http wird abgelehnt (strenger als isValidUrl)', () => {
  assert.equal(isValidHttpsUrl('http://example.com/'), false)
})

test('isValidHttpsUrl: javascript:/data: werden abgelehnt', () => {
  assert.equal(isValidHttpsUrl('javascript:alert(1)'), false)
  assert.equal(isValidHttpsUrl('data:text/html,<script>alert(1)</script>'), false)
})

test('isValidHttpsUrl: relative/leere URL wird abgelehnt', () => {
  assert.equal(isValidHttpsUrl('/relative/path'), false)
  assert.equal(isValidHttpsUrl(''), false)
})

test('isValidLinkLabel: nicht-leeres Label bis 60 Zeichen gueltig', () => {
  assert.equal(isValidLinkLabel('Wikipedia'), true)
  assert.equal(isValidLinkLabel('a'.repeat(60)), true)
})

test('isValidLinkLabel: leeres/nur-Whitespace-Label ungueltig', () => {
  assert.equal(isValidLinkLabel(''), false)
  assert.equal(isValidLinkLabel('   '), false)
})

test('isValidLinkLabel: Label ueber 60 Zeichen ungueltig', () => {
  assert.equal(isValidLinkLabel('a'.repeat(61)), false)
})

test('isDuplicateOfWebsite: identische URL zur Hauptwebsite wird erkannt', () => {
  assert.equal(isDuplicateOfWebsite('https://dominikpalmer.de/', 'https://dominikpalmer.de/'), true)
})

test('isDuplicateOfWebsite: unterschiedliche URL oder fehlende Website ist kein Duplikat', () => {
  assert.equal(isDuplicateOfWebsite('https://de.wikipedia.org/wiki/Test', 'https://dominikpalmer.de/'), false)
  assert.equal(isDuplicateOfWebsite('https://dominikpalmer.de/', null), false)
})
