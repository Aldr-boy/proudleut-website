import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bandChannelEventName, musikerLinkEventName, toEventSlug } from './outboundEventName.ts'

test('Band: "band <slug> <kanal>"', () => {
  assert.equal(bandChannelEventName('tegernseer-tanzlmusi', 'instagram'), 'band tegernseer-tanzlmusi instagram')
})

test('Musiker: "musiker <slug> <label>"', () => {
  assert.equal(musikerLinkEventName('dominik-palmer', 'website'), 'musiker dominik-palmer website')
})

test('Label: klein, Umlaute umgeschrieben, Bindestriche, keine Sonderzeichen/Emojis', () => {
  assert.equal(toEventSlug('Größe Äpfel & Öl – Übung 🎵'), 'groesse-aepfel-oel-uebung')
  assert.equal(toEventSlug('  Mein Blog (neu)! '), 'mein-blog-neu')
  assert.equal(toEventSlug('Café'), 'cafe')
})
