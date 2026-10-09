import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchTransport } from '../transport'

const originalFetch = globalThis.fetch

afterEach(() => {
  vi.restoreAllMocks()
  globalThis.fetch = originalFetch
})

describe('fetchTransport', () => {
  it('parses json responses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errCode: '0', errMessage: '', data: { ok: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await fetchTransport({
      url: 'https://example.com/api',
      method: 'GET',
    })

    expect(response.ok).toBe(true)
    expect(response.body).toEqual({ errCode: '0', errMessage: '', data: { ok: true } })
  })

  it('parses text responses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('plain text', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      }),
    )

    const response = await fetchTransport({
      url: 'https://example.com/text',
      method: 'GET',
    })

    expect(response.body).toBe('plain text')
  })

  it('returns a blob when responseType is blob', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(bytes, {
        status: 200,
        headers: { 'content-type': 'application/octet-stream' },
      }),
    )

    const response = await fetchTransport({
      url: 'https://example.com/file',
      method: 'GET',
      responseType: 'blob',
    })

    expect(response.body).toBeInstanceOf(Blob)
    expect(await (response.body as Blob).arrayBuffer()).toEqual(bytes.buffer)
  })
})
