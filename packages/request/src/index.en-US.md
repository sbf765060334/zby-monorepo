<!-- File responsibility: document request usage, complete options, dependent types, and integration in English. -->

# @zby/request

English | [简体中文](./index.zh-CN.md)

A `fetch` client for this project's business API, plus a TanStack Query adapter.

**Baseline: success is decided by `errCode` in the response body.** The backend returns HTTP 200. The default success code is `'0'`. The default invalid-session codes are `'100001'` and `'100002'`.

## What does request do?

Sending a request also means deciding whether the result is success, a business failure, or an invalid session, whether to toast, whether to retry, and whether a download is a file or an error envelope. `@zby/request` keeps those rules in one client.

It is responsible for:

- Joining `baseURL`, query params, and the body.
- Classifying success, business failure, and an invalid session from `errCode`.
- Handling timeout, network failure, and non-2xx responses.
- Providing global error callbacks, plus per-request `silent` to skip the toast.
- Reading a file response and taking the file name from `Content-Disposition`.
- Binding cancellation and retries of one query or mutation to the same request.

It is not responsible for:

- Rendering toasts, the login page, or tables. Redirects and `message.error` belong in the callbacks passed to `createClient`.
- Caching list data. Caching and automatic retries go through `@zby/request/react-query` into TanStack Query.
- Interpreting business fields. A successful call returns the whole envelope, or the `*Data` methods return `data`.

One ordinary request can be read as four steps:

1. Business code calls `apiClient.post('/order', values)`.
2. The client joins the URL, headers, and body, then sends them with `fetch`.
3. When the response is an envelope, `errCode` decides success, business failure, or an invalid session.
4. Success returns the envelope. Failure runs the callbacks, then throws `ApiError`.

## Features

- `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`.
- The full envelope, plus `*Data` methods that return `data` only.
- Nested query objects are written as JSON strings. Arrays repeat the same key.
- A plain object gets `Content-Type: application/json` when that header is missing. `FormData` and `Blob` are sent as-is.
- Per-request `silent`, which skips the global error toast while still throwing.
- `responseType: 'blob'` for file downloads. A JSON envelope still follows `errCode`.
- A default timeout of 9000 milliseconds. Business failures and invalid sessions are not retried by default.

## Entry Points

| Entry | Purpose |
| --- | --- |
| `@zby/request` | Client factory, error type, transport, and envelope types |
| `@zby/request/react-query` | Default TanStack Query retries, plus `queryOptions` / `mutationOptions` with a bound `signal` |
| `@zby/request/internal` | Shared retry state inside the package. Application code should not import it |

## Installation

This package is consumed inside the company monorepo through the workspace. Applications depend on `@zby/request`. Install the optional peer `@tanstack/react-query` `^5.90.0` when you need the query cache.

## Quick Start

Create the client once at module scope. Do not hardcode `Content-Type: application/json` in the global headers, or the browser cannot add the multipart boundary for `FormData`. A plain object gets that header when it is missing.

```tsx
import { createClient, isBusinessError } from '@zby/request'
import { message } from 'antd'

export const apiClient = createClient({
  baseURL: '/api',
  credentials: 'include',
  headers: () => ({
    Authorization: `Bearer ${token}`,
  }),
  onError(error) {
    if (isBusinessError(error)) {
      message.error(error.errMessage || '请求失败')
    }
  },
  onSessionInvalid() {
    window.location.assign('/login')
  },
})
```

A successful body looks like this. The method returns the whole object, not `data` alone:

```json
{
  "errCode": "0",
  "errMessage": "",
  "data": {},
  "total": 0,
  "traceId": ""
}
```

```tsx
const order = await apiClient.get<Order>('/order/1')
const created = await apiClient.post<Order>('/order', values)
const list = await apiClient.getData<Order>('/orders', {
  params: { page: 1, pageSize: 20 },
})
```

`GET` and `DELETE` take the options object as the second argument. `POST`, `PUT`, and `PATCH` take the body second and the options third.

## Query Params, Body, And Files

### Query params

`null` and `undefined` are omitted. Arrays repeat the key. `Date` becomes an ISO string. A plain object is `JSON.stringify`'d.

```tsx
await apiClient.get('/orders', {
  params: {
    page: 1,
    status: ['OPEN', 'CLOSED'],
    filter: { warehouseId: 'A1', ownerId: 'U2' },
  },
})
```

`filter` is one JSON query value. If a backend expects `filter[warehouseId]=A1`, pass your own `paramsSerializer` to `createClient`.

### Body

Plain objects, arrays, and business interfaces are `JSON.stringify`'d. `Content-Type: application/json` is added when that header is absent. `FormData`, `Blob`, strings, `URLSearchParams`, and `ArrayBuffer` are sent as-is.

```tsx
await apiClient.post('/upload', formData)
```

### Skip the global toast

`silent: true` skips `onAttemptError` and `onError`. The error is still thrown. Session-invalid and report callbacks still run.

```tsx
try {
  await apiClient.post('/order', values, { silent: true })
} catch (error) {
  if (isBusinessError(error)) {
    message.error(error.errMessage || '保存失败')
  }
}
```

Read `errMessage` for UI copy. When the backend sends an empty message, `errMessage` stays empty and `error.message` falls back to `Business request failed`. Use `error.errMessage || '请求失败'`.

### Download a file

The only `responseType` is `'blob'`. Omitting it reads a business JSON envelope. The `*Data` methods do not accept `responseType`.

```tsx
const file = await apiClient.post('/orders/export', filters, {
  responseType: 'blob',
})

const url = URL.createObjectURL(file.blob)
```

The result is `{ blob, fileName }`. `fileName` comes from `Content-Disposition`, preferring `filename*`. It is absent when the server does not send one.

A JSON envelope on a blob request still follows `errCode`. A business failure calls `onError`. An invalid session calls `onSessionInvalid`. A successful JSON envelope throws `Expected a file response`, and that error is not a business error.

## Errors And Callbacks

Failures throw `ApiError`. A caller abort is rethrown as-is and does not call `onError`.

URL joining, `headers()`, and body serialization run before `try`. Those failures stay raw `Error` or `TypeError` values. They are not wrapped as `ApiError` and do not enter `onError`.

Session codes are recognized on HTTP 200 envelopes. A non-2xx response is an HTTP error with `businessError: false` and `sessionInvalid: false`.

Callbacks run before the error is thrown. A direct `apiClient` call has no retry lifecycle, so one failure enters `onAttemptError` and then `onError`. Put the global toast in `onError` only.

| Callback | When it runs |
| --- | --- |
| `onAttemptError` | Every failure that is still in progress, including a session failure that will be retried. Do not put the global toast here. |
| `onError` | A non-session failure that will not be retried. Put the global toast here. |
| `onSessionInvalid` | An invalid session that will not be retried. `onError` and `onReport` do not run. |
| `onAttemptReport` | A report for every failure except a final invalid session. |
| `onReport` | The report for the final failure. An invalid session does not call it. |

`silent: true` skips only `onAttemptError` and `onError`.

## TanStack Query

`createClient` does not cache or retry. Caching and retries come from `@zby/request/react-query`.

```tsx
import { QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query'
import { createQueryClient, createRequestQuery } from '@zby/request/react-query'

const queryClient = createQueryClient()
const requestQuery = createRequestQuery(apiClient)

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OrderPage />
    </QueryClientProvider>
  )
}

function OrderPage() {
  const order = useQuery(requestQuery.queryOptions({
    queryKey: ['order', id],
    queryFn: ({ request }) => request.get(`/order/${id}`),
  }))

  const save = useMutation(requestQuery.mutationOptions({
    mutationFn: (values, { request }) => request.post('/order', values),
  }))
}
```

Use the `request` argument inside `queryFn` and `mutationFn`. It already carries that attempt's `signal`. Calling the outer `apiClient` from those callbacks warns once in development, and the retry count is not shared with that attempt.

`createQueryClient` defaults `retry` to `shouldRetry`: business failures and invalid sessions are not retried; network errors, timeouts, and other non-business failures continue while `failureCount < 2`, for 3 attempts in total. Your own `retry` replaces that default.

A `retry` function decides each attempt from its return value. A function has no declared cap, so reported `maxRetries` and `maxAttempts` are `Infinity`. Use a numeric `retry` when the report needs a finite count.

Without `QueryClientProvider`, `apiClient`'s `onError` still runs. Those calls are not retried.

## `createClient` Options (Props)

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `baseURL` | `string` | no | none | Relative URLs are joined to this prefix. Absolute URLs are left alone. |
| `headers` | `HeadersInit \| (() => HeadersInit \| Promise<HeadersInit>)` | no | none | Headers sent with every request. Do not hardcode a JSON `Content-Type`. |
| `credentials` | `RequestCredentials` | no | browser default | For example `'include'`. |
| `timeout` | `number` | no | `9000` | Timeout in milliseconds. `0` disables it. A single request can override it. |
| `successCodes` | `string[]` | no | `['0']` | Successful `errCode` values. The returned code is compared as a string. |
| `sessionInvalidCodes` | `string[]` | no | `['100001', '100002']` | Invalid-session `errCode` values. |
| `isSuccess` | `(response, context) => boolean` | no | none | Replaces `successCodes`. |
| `isSessionInvalid` | `(response, context) => boolean` | no | none | Replaces `sessionInvalidCodes`. |
| `onAttemptError` | `(error, context) => void` | no | none | Every failure that is still in progress. |
| `onError` | `(error, context) => void` | no | none | The final failure. Put the global toast here. |
| `onSessionInvalid` | `(error, context) => void` | no | none | An invalid session that will not be retried. |
| `onAttemptReport` | `(payload, context) => void` | no | none | A report for every failure except a final invalid session. |
| `onReport` | `(payload, context) => void` | no | none | The report for the final failure. An invalid session does not call it. |
| `transport` | `Transport` | no | `fetchTransport` | Replacement transport. Tests use it to inject a fake response. |
| `paramsSerializer` | `(params) => string` | no | built-in JSON rules | Custom query string. |

### Dependent type: `RequestOptions`

The shortcut methods already split `url`, `method`, and `body` into their own arguments. `request(options)` uses the shape below.

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `url` | `string` | yes | none | Request URL. |
| `method` | `HttpMethod` | no | `GET` | `'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE'`. |
| `params` | `RequestParams` | no | none | Query params. A plain object or `URLSearchParams`. |
| `body` | `RequestBody` | no | none | Request body. `GET` drops it. |
| `headers` | `HeadersInit` | no | none | Headers for this call. They override global headers with the same name. |
| `credentials` | `RequestCredentials` | no | client config | Overrides the client `credentials`. |
| `timeout` | `number` | no | client config | Overrides the client timeout. |
| `signal` | `AbortSignal` | no | none | Abort signal. Query and mutation helpers set this on the bound `request`. |
| `silent` | `boolean` | no | `false` | `true` skips both error callbacks. |
| `responseType` | `'blob'` | no | none | Read the body as a file and return `FileResponse`. |

### `ApiClient` methods

| API | Arguments / type | Return value | Description |
| --- | --- | --- | --- |
| `request(options)` | `RequestOptions` | `Promise<ApiResponse \| FileResponse>` | Returns a file when `responseType` is `'blob'`. |
| `requestData(options)` | `JsonRequestOptions` | `Promise<T \| T[] \| undefined>` | Returns `data` after success. `responseType` is not accepted. |
| `get(url, options?)` | `string, MethodOptions?` | `Promise<ApiResponse \| FileResponse>` | Read. |
| `post(url, body?, options?)` | `string, RequestBody?, MethodOptions?` | `Promise<ApiResponse \| FileResponse>` | Create or submit. |
| `put(url, body?, options?)` | same as `post` | same as `post` | Replace. |
| `patch(url, body?, options?)` | same as `post` | same as `post` | Partial update. |
| `delete(url, options?)` | `string, MethodOptions?` | `Promise<ApiResponse \| FileResponse>` | Delete. Options are the second argument. |
| `getData` / `postData` / `putData` / `patchData` / `deleteData` | Same as the matching method, without `responseType` | `Promise<T \| T[] \| undefined>` | Return `data` only. |

### Dependent type: `FileResponse`

| Field | Type | Description |
| --- | --- | --- |
| `blob` | `Blob` | File bytes. |
| `fileName` | `string \| undefined` | Name from the response header, when the server sends one. |

### Dependent type: `ErrorRetryContext`

Passed to the error and report callbacks.

| Field | Type | Description |
| --- | --- | --- |
| `attempt` | `number` | Request number, starting at 1. |
| `retryCount` | `number` | Failures so far, starting at 0. |
| `maxRetries` | `number` | Allowed retries. `Infinity` for a function `retry`. |
| `maxAttempts` | `number` | `maxRetries + 1`, or `Infinity` when there is no cap. |
| `willRetry` | `boolean` | Whether another request will follow this failure. |

### Dependent type: `ApiReportPayload`

| Field | Type | Description |
| --- | --- | --- |
| `api` | `string` | Request URL. |
| `success` | `boolean` | `false` for a failure report. |
| `time` | `number` | Duration in milliseconds. |
| `code` | `string \| number` | `errCode`, otherwise the HTTP status, otherwise `'UNKNOWN'`. |
| `msg` | `string` | `errMessage`, otherwise `error.message`. |
| `begin` | `number` | Start timestamp. |
| `traceId` | `string` | Backend trace, or `''`. |
| `status` | `number \| undefined` | HTTP status. |

### Dependent type: `ApiError`

| Field | Type | Description |
| --- | --- | --- |
| `message` | `string` | `Error.message`. Falls back to English copy when `errMessage` is empty. |
| `errCode` | `string \| undefined` | Backend error code. Timeout uses `'TIMEOUT'`. |
| `errMessage` | `string \| undefined` | Backend copy, which may be an empty string. UI text should read this field. |
| `traceId` | `string \| undefined` | Backend trace. |
| `response` | `ApiResponse \| undefined` | Raw envelope. Absent when an HTTP error has no envelope. |
| `status` | `number \| undefined` | HTTP status. |
| `url` | `string \| undefined` | Request URL. |
| `method` | `HttpMethod \| undefined` | Request method. |
| `begin` | `number \| undefined` | Start timestamp. |
| `duration` | `number \| undefined` | Duration in milliseconds. |
| `businessError` | `boolean` | `errCode` failed and the session is still valid. |
| `sessionInvalid` | `boolean` | The session is invalid. |
| `timeout` | `boolean` | The request timed out. |

## Root Utilities

| Utility | Arguments | Return value / description |
| --- | --- | --- |
| `createClient(config?)` | `ClientConfig` | Creates an `ApiClient`. |
| `ApiError` | `ApiErrorOptions` | The failure error. |
| `isApiError(error)` | `unknown` | Whether the value is an `ApiError`. |
| `isBusinessError(error)` | `unknown` | Business failure. |
| `isSessionInvalidError(error)` | `unknown` | Invalid session. |
| `isTimeoutError(error)` | `unknown` | Timeout. |
| `fetchTransport` | `TransportRequest` | The default `fetch` transport. |
| `selectData(response)` | `ApiResponse<T>` | Returns the envelope `data`. |

## `@zby/request/react-query`

| API | Arguments / type | Return value | Description |
| --- | --- | --- | --- |
| `createQueryClient(config?)` | `QueryClientConfig` | `QueryClient` | Queries and mutations default to `shouldRetry`. Your own `retry` replaces it. |
| `createRequestQuery(apiClient)` | `ApiClient` | `RequestQuery` | Returns `{ queryOptions, mutationOptions }`. |
| `shouldRetry(failureCount, error)` | `number, unknown` | `boolean` | `false` for business and session failures. `true` for other failures while the count is below 2. |
| `DEFAULT_MAX_RETRIES` | none | `2` | At most 2 extra attempts by default. |

`queryOptions` matches TanStack `queryOptions`. The `queryFn` context adds `request: ApiClient`.

`mutationOptions` uses `mutationFn(variables, context)`. `context` is the TanStack mutation context plus `signal` and `request`. TanStack's own mutation context has no `signal`, so this helper creates one for a single execution and reuses it across retries.

## Development Commands

```bash
pnpm --filter @zby/request typecheck
pnpm --filter @zby/request test
pnpm --filter @zby/request build
```
