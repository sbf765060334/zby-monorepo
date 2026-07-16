import { describe, expect, it } from 'vitest'

import {
  buildUrlForTab,
  normalizeHash,
  normalizeSearchParams,
  parseUrl,
} from '../url'

describe('proLayout URL utilities', () => {
  it('parses application URLs in browser-independent environments', () => {
    const relativeUrl = parseUrl('/orders/42?tab=detail#summary')
    const customBaseUrl = parseUrl('orders/42', 'https://example.com/app/')

    expect(relativeUrl.origin).toBe('https://zby.local')
    expect(relativeUrl.pathname).toBe('/orders/42')
    expect(relativeUrl.search).toBe('?tab=detail')
    expect(relativeUrl.hash).toBe('#summary')
    expect(customBaseUrl.href).toBe('https://example.com/app/orders/42')
  })

  it('normalizes search parameters without rewriting their contents', () => {
    expect(normalizeSearchParams('?status=open&status=pending')).toBe(
      'status=open&status=pending',
    )
    expect(normalizeSearchParams('keyword=a%20b')).toBe('keyword=a%20b')
    expect(normalizeSearchParams('')).toBe('')
    expect(normalizeSearchParams(null)).toBe('')
  })

  it('normalizes hash values with a single required prefix', () => {
    expect(normalizeHash('detail')).toBe('#detail')
    expect(normalizeHash('#detail')).toBe('#detail')
    expect(normalizeHash('')).toBe('')
    expect(normalizeHash(undefined)).toBe('')
  })

  it('builds a tab URL from structured pathname, search and hash fields', () => {
    expect(
      buildUrlForTab({
        pathname: '/orders/42',
        searchParams: '?tab=detail&tab=history',
        hash: 'summary',
      }),
    ).toBe('/orders/42?tab=detail&tab=history#summary')
    expect(buildUrlForTab({ pathname: '/orders/42' })).toBe('/orders/42')
  })
})
