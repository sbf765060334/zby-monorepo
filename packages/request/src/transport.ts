import type { Transport, TransportRequest, TransportResponse } from './types'

export const fetchTransport: Transport = async (
  request: TransportRequest,
): Promise<TransportResponse> => {
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    credentials: request.credentials,
    signal: request.signal,
  })

  return {
    ok: response.ok,
    status: response.status,
    url: response.url || request.url,
    headers: response.headers,
    body: request.responseType === 'blob'
      ? await response.blob()
      : await parseFetchBody(response),
  }
}

async function parseFetchBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}
