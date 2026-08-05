import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashClientIp } from './ipHash.ts'

test('hashClientIp: wirft fail-closed, wenn kein Salt konfiguriert ist', () => {
  const original = process.env.ANFRAGE_RATE_LIMIT_SALT
  delete process.env.ANFRAGE_RATE_LIMIT_SALT
  try {
    assert.throws(() => hashClientIp('203.0.113.5'))
  } finally {
    if (original !== undefined) process.env.ANFRAGE_RATE_LIMIT_SALT = original
  }
})

test('hashClientIp: deterministisch bei gleichem Salt/IP', () => {
  process.env.ANFRAGE_RATE_LIMIT_SALT = 'test-salt'
  assert.equal(hashClientIp('203.0.113.5'), hashClientIp('203.0.113.5'))
})

test('hashClientIp: liefert einen 64-stelligen Hex-String (sha256), nie die rohe IP', () => {
  process.env.ANFRAGE_RATE_LIMIT_SALT = 'test-salt'
  const hash = hashClientIp('203.0.113.5')
  assert.match(hash, /^[0-9a-f]{64}$/)
  assert.doesNotMatch(hash, /203\.0\.113\.5/)
})

test('hashClientIp: unterschiedliche IPs ergeben unterschiedliche Hashes', () => {
  process.env.ANFRAGE_RATE_LIMIT_SALT = 'test-salt'
  assert.notEqual(hashClientIp('203.0.113.5'), hashClientIp('203.0.113.6'))
})
