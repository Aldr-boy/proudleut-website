import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PERSON_HERO_IMAGE_PRESENTATION,
  resolvePersonHeroImagePresentation,
} from './heroImagePresentation.ts'

test('resolvePersonHeroImagePresentation: ohne Eintrag -> neutraler Default "center 30%" auf beiden Breakpoints', () => {
  const result = resolvePersonHeroImagePresentation('irgendein-neuer-musiker')
  assert.deepEqual(result, {
    desktopObjectPosition: 'center 30%',
    mobileObjectPosition: 'center 30%',
  })
  assert.deepEqual(result, DEFAULT_PERSON_HERO_IMAGE_PRESENTATION)
})

test('resolvePersonHeroImagePresentation: dominik-palmer behaelt die bisherigen, visuell abgestimmten Werte', () => {
  const result = resolvePersonHeroImagePresentation('dominik-palmer')
  assert.deepEqual(result, {
    desktopObjectPosition: 'center 10%',
    mobileObjectPosition: '32% center',
  })
})

test('resolvePersonHeroImagePresentation: injizierbare Konfiguration bleibt unabhaengig von der zentralen Tabelle testbar', () => {
  const result = resolvePersonHeroImagePresentation('custom-slug', {
    'custom-slug': { desktopObjectPosition: 'center 50%', mobileObjectPosition: 'center 50%' },
  })
  assert.deepEqual(result, { desktopObjectPosition: 'center 50%', mobileObjectPosition: 'center 50%' })
})
