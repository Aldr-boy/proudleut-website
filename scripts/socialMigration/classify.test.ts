import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalize,
  classifyValue,
  classifyPlatform,
  mapBandBySlug,
  classifySocialRow,
  classifyAfterRace,
} from './classify.mjs'

test('mapBandBySlug: exakter Slug-Match -> EXACT', () => {
  const bandsBySlug = new Map([['letsfetz-band', [{ id: 'b1', slug: 'letsfetz-band', status: 'active' }]]])
  const result = mapBandBySlug('letsfetz-band', bandsBySlug)
  assert.equal(result.classification, 'EXACT')
  assert.equal(result.band.id, 'b1')
})

test('mapBandBySlug: fehlender Slug -> MISSING_TARGET_BAND, kein Fuzzy-Fallback', () => {
  const bandsBySlug = new Map([['letsfetz-band', [{ id: 'b1', slug: 'letsfetz-band' }]]])
  // Naheliegender, aber nicht identischer Slug darf NICHT matchen
  const result = mapBandBySlug('lets-fetz-band', bandsBySlug)
  assert.equal(result.classification, 'MISSING_TARGET_BAND')
})

test('mapBandBySlug: leerer/undefined Slug -> MISSING_TARGET_BAND', () => {
  const bandsBySlug = new Map()
  assert.equal(mapBandBySlug('', bandsBySlug).classification, 'MISSING_TARGET_BAND')
  assert.equal(mapBandBySlug(undefined, bandsBySlug).classification, 'MISSING_TARGET_BAND')
})

test('mapBandBySlug: mehrere Treffer -> AMBIGUOUS_BAND (defensiv)', () => {
  const bandsBySlug = new Map([['dup-slug', [{ id: 'b1' }, { id: 'b2' }]]])
  assert.equal(mapBandBySlug('dup-slug', bandsBySlug).classification, 'AMBIGUOUS_BAND')
})

test('normalize: trim() ist die einzige Normalisierung, Inhalt bleibt unveraendert', () => {
  assert.equal(normalize('  https://instagram.com/letsfetz  '), 'https://instagram.com/letsfetz')
  assert.equal(normalize('https://instagram.com/letsfetz'), 'https://instagram.com/letsfetz')
  assert.equal(normalize(''), null)
  assert.equal(normalize('   '), null)
  assert.equal(normalize(null), null)
  assert.equal(normalize(undefined), null)
})

test('normalize: erfindet keine URL aus Handle/Text', () => {
  assert.equal(normalize('@letsfetz'), '@letsfetz')
  assert.equal(normalize('letsfetz'), 'letsfetz')
  assert.equal(normalize('instagram.com/letsfetz'), 'instagram.com/letsfetz')
})

test('classifyValue: leerer Wert -> EMPTY', () => {
  assert.equal(classifyValue(undefined).valueClass, 'EMPTY')
  assert.equal(classifyValue(null).valueClass, 'EMPTY')
  assert.equal(classifyValue('').valueClass, 'EMPTY')
})

test('classifyValue: valide https-URL erkannt', () => {
  const info = classifyValue('https://www.instagram.com/letsfetzband/')
  assert.equal(info.valueClass, 'VALID_HTTPS_URL')
})

test('classifyValue: valide http-URL erkannt', () => {
  assert.equal(classifyValue('http://www.instagram.com/letsfetzband/').valueClass, 'VALID_HTTP_URL')
})

test('classifyValue: Handle-only wird nicht als URL fehlinterpretiert', () => {
  assert.equal(classifyValue('@letsfetz').valueClass, 'HANDLE_ONLY')
})

test('classifyValue: nackter Domainpfad ohne Schema -> MALFORMED_URL', () => {
  assert.equal(classifyValue('instagram.com/letsfetz').valueClass, 'MALFORMED_URL')
})

test('classifyValue: mehrere URLs in einem Feld -> MULTIPLE_VALUES', () => {
  assert.equal(classifyValue('https://a.com/x, https://b.com/y').valueClass, 'MULTIPLE_VALUES')
})

test('classifyPlatform: Instagram-URL auf instagram.com -> PLATFORM_OK', () => {
  const info = classifyValue('https://www.instagram.com/letsfetzband/')
  assert.equal(classifyPlatform('instagram', info), 'PLATFORM_OK')
})

test('classifyPlatform: Instagram-Feld mit Facebook-URL -> PLATFORM_MISMATCH', () => {
  const info = classifyValue('https://www.facebook.com/letsfetzband/')
  assert.equal(classifyPlatform('instagram', info), 'PLATFORM_MISMATCH')
})

test('classifySocialRow: Band-Mapping nicht EXACT -> kein Insert', () => {
  const bandMapping = { classification: 'MISSING_TARGET_BAND', band: null, reason: 'x' }
  const result = classifySocialRow({ platform: 'instagram', sourceValue: 'https://instagram.com/x', bandMapping, targetRow: null })
  assert.equal(result.dryRunClass, 'MISSING_TARGET_BAND')
})

test('classifySocialRow: leerer Quellwert -> SKIP_EMPTY', () => {
  const bandMapping = { classification: 'EXACT', band: { id: 'b1' }, reason: 'x' }
  const result = classifySocialRow({ platform: 'spotify', sourceValue: '', bandMapping, targetRow: null })
  assert.equal(result.dryRunClass, 'SKIP_EMPTY')
})

test('classifySocialRow: valide URL, keine bestehende Row -> INSERT', () => {
  const bandMapping = { classification: 'EXACT', band: { id: 'b1' }, reason: 'x' }
  const result = classifySocialRow({
    platform: 'instagram',
    sourceValue: 'https://www.instagram.com/letsfetzband/',
    bandMapping,
    targetRow: null,
  })
  assert.equal(result.dryRunClass, 'INSERT')
  assert.equal(result.normalizedCandidate, 'https://www.instagram.com/letsfetzband/')
})

test('classifySocialRow: bestehende Row mit identischer URL -> ALREADY_EQUAL, kein Insert', () => {
  const bandMapping = { classification: 'EXACT', band: { id: 'b1' }, reason: 'x' }
  const result = classifySocialRow({
    platform: 'instagram',
    sourceValue: 'https://www.instagram.com/letsfetzband/',
    bandMapping,
    targetRow: { url: 'https://www.instagram.com/letsfetzband/' },
  })
  assert.equal(result.dryRunClass, 'ALREADY_EQUAL')
})

test('classifySocialRow: bestehende Row mit abweichender URL -> TARGET_CONFLICT, kein Insert/Update', () => {
  const bandMapping = { classification: 'EXACT', band: { id: 'b1' }, reason: 'x' }
  const result = classifySocialRow({
    platform: 'youtube',
    sourceValue: 'https://www.youtube.com/channel/UCuK2Pm1TrAueie8AvS7bD0g',
    bandMapping,
    targetRow: { url: 'https://www.youtube.com/channel/donnaweda' },
  })
  assert.equal(result.dryRunClass, 'TARGET_CONFLICT')
})

test('classifySocialRow: ungueltiges Format -> INVALID_SOURCE, niemals aus Handle eine URL erfinden', () => {
  const bandMapping = { classification: 'EXACT', band: { id: 'b1' }, reason: 'x' }
  const result = classifySocialRow({ platform: 'instagram', sourceValue: '@letsfetz', bandMapping, targetRow: null })
  assert.equal(result.dryRunClass, 'INVALID_SOURCE')
  assert.equal(result.normalizedCandidate, '@letsfetz')
})

test('classifySocialRow: Plattform-Mismatch blockiert Insert', () => {
  const bandMapping = { classification: 'EXACT', band: { id: 'b1' }, reason: 'x' }
  const result = classifySocialRow({
    platform: 'instagram',
    sourceValue: 'https://www.facebook.com/letsfetzband/',
    bandMapping,
    targetRow: null,
  })
  assert.equal(result.dryRunClass, 'PLATFORM_MISMATCH')
})

test('classifyAfterRace: Conflict, gleiche URL -> ALREADY_EQUAL_AFTER_RACE', () => {
  const result = classifyAfterRace('https://x.com/a', { url: 'https://x.com/a' })
  assert.equal(result, 'ALREADY_EQUAL_AFTER_RACE')
})

test('classifyAfterRace: Conflict, andere URL -> TARGET_CONFLICT_AFTER_RACE, kein Update-Pfad', () => {
  const result = classifyAfterRace('https://x.com/a', { url: 'https://x.com/b' })
  assert.equal(result, 'TARGET_CONFLICT_AFTER_RACE')
})
