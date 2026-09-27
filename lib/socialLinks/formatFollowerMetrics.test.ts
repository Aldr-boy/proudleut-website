import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatFollowerCount, formatStandDate, formatStandMonthYear } from './formatFollowerMetrics.ts'

test('formatFollowerCount: deutsche Tausendertrennung, keine Abkuerzung wie "5,2k"', () => {
  assert.equal(formatFollowerCount(5200), '5.200')
  assert.equal(formatFollowerCount(12686), '12.686')
  assert.equal(formatFollowerCount(999), '999')
})

test('formatStandDate: TT.MM.JJJJ, feste UTC-Zeitzone', () => {
  assert.equal(formatStandDate('2026-09-26T00:00:00+00:00'), '26.09.2026')
})

test('formatStandMonthYear: ausgeschriebener Monat + Jahr, feste UTC-Zeitzone', () => {
  assert.equal(formatStandMonthYear('2026-09-26T00:00:00+00:00'), 'September 2026')
})
