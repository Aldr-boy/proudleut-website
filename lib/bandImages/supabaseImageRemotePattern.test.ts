import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  deriveSupabaseImageRemotePattern,
  InvalidSupabaseUrlError,
  SUPABASE_STORAGE_PUBLIC_PATH,
} from './supabaseImageRemotePattern.ts'

test('Produktions-URL: https, korrekter Host, leerer Port, korrekter Storage-Pfad', () => {
  const result = deriveSupabaseImageRemotePattern('https://bfyucjjyarvqeftqqihm.supabase.co')
  assert.deepEqual(result, {
    protocol: 'https',
    hostname: 'bfyucjjyarvqeftqqihm.supabase.co',
    port: '',
    pathname: SUPABASE_STORAGE_PUBLIC_PATH,
  })
})

test('anderes Supabase-Projekt: abweichender Host wird uebernommen, kein zusaetzlicher Produktionshost', () => {
  const result = deriveSupabaseImageRemotePattern('https://anderes-projekt.supabase.co')
  assert.equal(result.hostname, 'anderes-projekt.supabase.co')
  assert.notEqual(result.hostname, 'bfyucjjyarvqeftqqihm.supabase.co')
  assert.equal(result.protocol, 'https')
  assert.equal(result.port, '')
})

test('lokale URL (IP): http, 127.0.0.1, Port 54321', () => {
  const result = deriveSupabaseImageRemotePattern('http://127.0.0.1:54321')
  assert.deepEqual(result, {
    protocol: 'http',
    hostname: '127.0.0.1',
    port: '54321',
    pathname: SUPABASE_STORAGE_PUBLIC_PATH,
  })
})

test('lokale URL (localhost) mit Port', () => {
  const result = deriveSupabaseImageRemotePattern('http://localhost:54321')
  assert.deepEqual(result, {
    protocol: 'http',
    hostname: 'localhost',
    port: '54321',
    pathname: SUPABASE_STORAGE_PUBLIC_PATH,
  })
})

test('URL mit abschliessendem Schraegstrich wird korrekt verarbeitet', () => {
  const result = deriveSupabaseImageRemotePattern('https://projekt.supabase.co/')
  assert.deepEqual(result, {
    protocol: 'https',
    hostname: 'projekt.supabase.co',
    port: '',
    pathname: SUPABASE_STORAGE_PUBLIC_PATH,
  })
})

test('gesetzte, aber ungueltige URL: kontrollierter Fehler statt Wildcard-Erlaubnis', () => {
  assert.throws(() => deriveSupabaseImageRemotePattern('nicht-eine-url'), InvalidSupabaseUrlError)
})

test('gesetzte URL mit nicht unterstuetztem Protokoll (z. B. ftp) wird abgelehnt', () => {
  assert.throws(() => deriveSupabaseImageRemotePattern('ftp://projekt.supabase.co'), InvalidSupabaseUrlError)
})

test('fehlende Variable (undefined): dokumentierter enger Produktions-Fallback, kein Wildcard', () => {
  const result = deriveSupabaseImageRemotePattern(undefined)
  assert.deepEqual(result, {
    protocol: 'https',
    hostname: 'bfyucjjyarvqeftqqihm.supabase.co',
    port: '',
    pathname: SUPABASE_STORAGE_PUBLIC_PATH,
  })
})

test('fehlende Variable (leerer String): wird wie fehlend behandelt, derselbe Fallback', () => {
  const result = deriveSupabaseImageRemotePattern('')
  assert.equal(result.hostname, 'bfyucjjyarvqeftqqihm.supabase.co')
})

test('pathname ist in jedem Fall exakt auf den oeffentlichen Storage-Pfad beschraenkt, kein Wildcard-Host', () => {
  const prod = deriveSupabaseImageRemotePattern('https://projekt.supabase.co')
  const local = deriveSupabaseImageRemotePattern('http://127.0.0.1:54321')
  assert.equal(prod.pathname, '/storage/v1/object/public/**')
  assert.equal(local.pathname, '/storage/v1/object/public/**')
  assert.notEqual(prod.hostname, '**')
  assert.notEqual(local.hostname, '**')
})
