import { describe, it, expect } from 'vitest'
import { resources } from '../src/renderer/src/i18n'

/**
 * `vi` and `en` are meant to stay in lockstep. Nothing enforced that, so a key
 * added to one and forgotten in the other silently fell back to English (or to
 * the raw key) at runtime, with no build or test failure.
 */
function keyPaths(node: unknown, prefix = ''): string[] {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return [prefix]
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    keyPaths(value, prefix ? `${prefix}.${key}` : key)
  )
}

describe('i18n resources', () => {
  const en = new Set(keyPaths(resources.en.translation))
  const vi = new Set(keyPaths(resources.vi.translation))

  it('defines the same key set in both locales', () => {
    expect([...en].filter((k) => !vi.has(k))).toEqual([])
    expect([...vi].filter((k) => !en.has(k))).toEqual([])
  })

  it('has no empty translation strings', () => {
    for (const [locale, bundle] of Object.entries(resources)) {
      const empties = keyPaths(bundle.translation).filter((path) => {
        const value = path
          .split('.')
          .reduce<any>((node, key) => (node == null ? node : node[key]), bundle.translation)
        return typeof value === 'string' && value.trim() === ''
      })
      expect(empties, `empty strings in "${locale}"`).toEqual([])
    }
  })
})
