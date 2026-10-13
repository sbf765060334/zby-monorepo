<!-- 文件职责：面向中文读者说明 request 的用途、完整配置、类型依赖和接入方式。 -->

# @zby/request

[English](./index.en-US.md) | 简体中文

基于 `fetch` 的业务请求客户端，以及 TanStack Query 适配。

**基线：业务成功看响应体里的 `errCode`。** 后端约定接口返回 HTTP 200，成功码默认是 `'0'`。登录失效码默认是 `'100001'` 和 `'100002'`。

## request 是做什么的？

页面发请求时，除了把地址、参数和请求体送出去，还要判断这次是成功、业务失败还是登录失效，决定要不要弹提示、要不要重试，以及下载时拿到的是文件还是错误包。`@zby/request` 把这些规则集中在一个客户端里。

它负责：

- 拼接 `baseURL`、查询参数和请求体。
- 按 `errCode` 判断成功、业务失败和登录失效。
- 处理超时、网络失败和非 2xx。
- 提供全局错误回调，以及单个请求跳过提示的 `silent`。
- 读取文件响应，并从 `Content-Disposition` 取出文件名。
- 把同一次查询或 mutation 的取消和重试绑到同一次请求上。

它不负责：

- 不渲染提示、登录页或表格。跳转和 `message.error` 写在创建客户端时的回调里。
- 不缓存列表数据。缓存和自动重试通过 `@zby/request/react-query` 交给 TanStack Query。
- 不解析业务字段的含义。成功时返回完整业务包，或由 `*Data` 方法返回其中的 `data`。

一次普通请求可以理解成下面四步：

1. 业务调用 `apiClient.post('/order', values)`。
2. 客户端拼好地址、请求头和 body，再用 `fetch` 发出去。
3. 响应是业务包时，用 `errCode` 判断成功、业务失败或登录失效。
4. 成功把业务包返回给调用方。失败先执行回调，再抛出 `ApiError`。

## 支持能力

- `GET`、`POST`、`PUT`、`PATCH`、`DELETE`。
- 完整业务包，以及只取 `data` 的 `*Data` 方法。
- 嵌套查询对象按 JSON 字符串写入查询串。数组重复同一个参数名。
- 普通对象自动补 `Content-Type: application/json`。`FormData` 和 `Blob` 原样发送。
- 单个请求 `silent`，跳过全局错误提示，错误仍然抛出。
- `responseType: 'blob'` 下载文件。JSON 业务包仍按 `errCode` 处理。
- 默认超时 9000 毫秒。业务失败和登录失效默认不重试。

## 包入口

| 入口 | 作用 |
| --- | --- |
| `@zby/request` | 客户端工厂、错误类型、传输层和业务包类型 |
| `@zby/request/react-query` | TanStack Query 的默认重试，以及绑好 `signal` 的 `queryOptions` / `mutationOptions` |
| `@zby/request/internal` | 包内部共享的重试状态。业务代码不要导入 |

## 安装

本包在公司 monorepo 内通过 workspace 引用。应用依赖 `@zby/request`。要用查询缓存时，再安装可选 peer `@tanstack/react-query` `^5.90.0`。

## 快速开始

在模块顶层创建一次客户端。全局请求头里不要写死 `Content-Type: application/json`，否则上传 `FormData` 时浏览器无法补上 boundary。普通对象缺少该头时，客户端会自动补上。

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

成功响应长这样。方法返回这一整份对象，不是只返回 `data`：

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

`GET` 和 `DELETE` 的第二个参数是选项。`POST`、`PUT`、`PATCH` 的第二个参数是 body，第三个参数是选项。

## 查询参数、请求体和文件

### 查询参数

`null` 和 `undefined` 不写入查询串。数组重复同一个参数名。`Date` 使用 ISO 字符串。普通对象使用 `JSON.stringify`。

```tsx
await apiClient.get('/orders', {
  params: {
    page: 1,
    status: ['OPEN', 'CLOSED'],
    filter: { warehouseId: 'A1', ownerId: 'U2' },
  },
})
```

上面的 `filter` 会变成一段 JSON 查询值。后端如果要求 `filter[warehouseId]=A1` 这种括号写法，创建客户端时传入自己的 `paramsSerializer`。

### 请求体

普通对象、数组和业务 interface 会 `JSON.stringify`，并在请求头里还没有 `Content-Type` 时补上 `application/json`。`FormData`、`Blob`、字符串、`URLSearchParams`、`ArrayBuffer` 原样发送。

```tsx
await apiClient.post('/upload', formData)
```

### 跳过全局提示

`silent: true` 不调用 `onAttemptError` 和 `onError`。错误仍然抛出。登录失效和上报照常执行。

```tsx
try {
  await apiClient.post('/order', values, { silent: true })
} catch (error) {
  if (isBusinessError(error)) {
    message.error(error.errMessage || '保存失败')
  }
}
```

页面提示读 `errMessage`。后端没给文案时，`errMessage` 可能是空字符串，`error.message` 会落到英文兜底 `Business request failed`。提示文案写 `error.errMessage || '请求失败'`。

### 下载文件

`responseType` 只有 `'blob'`。不传时按业务 JSON 读取。`*Data` 方法不能传 `responseType`。

```tsx
const file = await apiClient.post('/orders/export', filters, {
  responseType: 'blob',
})

const url = URL.createObjectURL(file.blob)
```

返回值是 `{ blob, fileName }`。`fileName` 来自 `Content-Disposition`，优先 `filename*`。服务端没给时没有这个字段。

下载接口如果仍返回 JSON 业务包，会按 `errCode` 处理：业务失败进 `onError`，登录失效进 `onSessionInvalid`。JSON 且 `errCode` 成功时抛出 `Expected a file response`，这不是业务失败。

## 错误和回调

失败抛出 `ApiError`。调用方取消请求时，原样抛出取消原因，不进 `onError`。

拼接 URL、执行 `headers()`、序列化 body 发生在 `try` 之外。这些错误保持原始的 `Error` 或 `TypeError`，不会包装成 `ApiError`，也不会进 `onError`。

登录失效只在 HTTP 200 的业务包里识别。非 2xx 走 HTTP 错误，`businessError` 为 `false`，`sessionInvalid` 为 `false`。

回调在错误抛出之前执行。直接使用 `apiClient` 时没有重试生命周期，一次失败会先后进入 `onAttemptError` 和 `onError`。全局提示只放在 `onError`。

| 回调 | 何时调用 |
| --- | --- |
| `onAttemptError` | 每一次还会继续处理的失败，包括还会重试的登录失效。不要在这里弹全局提示。 |
| `onError` | 不会再重试的非登录失效失败。全局提示放这里。 |
| `onSessionInvalid` | 登录失效，且不会再重试。此时不调用 `onError` 和 `onReport`。 |
| `onAttemptReport` | 每一次失败的上报。不再重试的登录失效不调用。 |
| `onReport` | 最终失败的上报。登录失效不调用。 |

`silent: true` 只跳过 `onAttemptError` 和 `onError`。

## 和 TanStack Query 一起用

`createClient` 只发请求，不缓存，也不自己重试。缓存和重试使用 `@zby/request/react-query`。

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

`queryFn` 和 `mutationFn` 里使用参数里的 `request`。它已经带上这次查询或 mutation 的 `signal`。回调里再调用外部的 `apiClient`，开发环境会警告一次，重试次数也不会累计到同一次请求。

`createQueryClient` 的默认 `retry` 是 `shouldRetry`：业务失败和登录失效不重试；网络错误、超时和其它非业务失败在 `failureCount < 2` 时继续，一共最多 3 次请求。自己传入的 `retry` 会覆盖这个默认值。

`retry` 写成函数时，是否重试看函数返回值。函数没有固定上限，上报里的 `maxRetries` 和 `maxAttempts` 是 `Infinity`。需要上报有限次数时，把 `retry` 写成数字。

没有包一层 `QueryClientProvider` 时，`apiClient` 的 `onError` 仍然生效，只是不会重试。

## `createClient` 创建参数（Props）

| Prop | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `baseURL` | `string` | 否 | 无 | 相对地址会拼到这个前缀上。绝对地址不拼接。 |
| `headers` | `HeadersInit \| (() => HeadersInit \| Promise<HeadersInit>)` | 否 | 无 | 每个请求都会带上的头。不要写死 JSON 的 `Content-Type`。 |
| `credentials` | `RequestCredentials` | 否 | 浏览器默认 | 例如 `'include'`。 |
| `timeout` | `number` | 否 | `9000` | 超时毫秒数。`0` 表示不设超时。单个请求可以覆盖。 |
| `successCodes` | `string[]` | 否 | `['0']` | 成功的 `errCode`。比较前会把返回值转成字符串。 |
| `sessionInvalidCodes` | `string[]` | 否 | `['100001', '100002']` | 登录失效的 `errCode`。 |
| `isSuccess` | `(response, context) => boolean` | 否 | 无 | 提供后不再使用 `successCodes`。 |
| `isSessionInvalid` | `(response, context) => boolean` | 否 | 无 | 提供后不再使用 `sessionInvalidCodes`。 |
| `onAttemptError` | `(error, context) => void` | 否 | 无 | 每一次还会继续处理的失败。 |
| `onError` | `(error, context) => void` | 否 | 无 | 最终失败。全局提示放这里。 |
| `onSessionInvalid` | `(error, context) => void` | 否 | 无 | 不再重试的登录失效。 |
| `onAttemptReport` | `(payload, context) => void` | 否 | 无 | 每一次失败的上报，不含最终登录失效。 |
| `onReport` | `(payload, context) => void` | 否 | 无 | 最终失败的上报。登录失效不调用。 |
| `transport` | `Transport` | 否 | `fetchTransport` | 替换传输层。测试里用来注入假响应。 |
| `paramsSerializer` | `(params) => string` | 否 | 内置 JSON 规则 | 自定义查询串。 |

### 依赖类型：`RequestOptions`

便捷方法已经把 `url`、`method`、`body` 拆成独立参数。`request(options)` 使用下面这一份。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `url` | `string` | 是 | 无 | 请求地址。 |
| `method` | `HttpMethod` | 否 | `GET` | `'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE'`。 |
| `params` | `RequestParams` | 否 | 无 | 查询参数。普通对象或 `URLSearchParams`。 |
| `body` | `RequestBody` | 否 | 无 | 请求体。`GET` 会丢掉 body。 |
| `headers` | `HeadersInit` | 否 | 无 | 这一次请求的头，覆盖同名全局头。 |
| `credentials` | `RequestCredentials` | 否 | 客户端配置 | 覆盖客户端的 `credentials`。 |
| `timeout` | `number` | 否 | 客户端配置 | 覆盖客户端超时。 |
| `signal` | `AbortSignal` | 否 | 无 | 取消信号。查询和 mutation 由绑定后的 `request` 写入。 |
| `silent` | `boolean` | 否 | `false` | 为 `true` 时不调用两个错误回调。 |
| `responseType` | `'blob'` | 否 | 无 | 按文件读取，返回 `FileResponse`。 |

### `ApiClient` 方法

| API | 参数 / 类型 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `request(options)` | `RequestOptions` | `Promise<ApiResponse \| FileResponse>` | 传 `responseType: 'blob'` 时返回文件。 |
| `requestData(options)` | `JsonRequestOptions` | `Promise<T \| T[] \| undefined>` | 成功后只返回 `data`。不能传 `responseType`。 |
| `get(url, options?)` | `string, MethodOptions?` | `Promise<ApiResponse \| FileResponse>` | 查询。 |
| `post(url, body?, options?)` | `string, RequestBody?, MethodOptions?` | `Promise<ApiResponse \| FileResponse>` | 创建或提交。 |
| `put(url, body?, options?)` | 同上 | 同上 | 整体更新。 |
| `patch(url, body?, options?)` | 同上 | 同上 | 局部更新。 |
| `delete(url, options?)` | `string, MethodOptions?` | `Promise<ApiResponse \| FileResponse>` | 删除。选项在第二个参数。 |
| `getData` / `postData` / `putData` / `patchData` / `deleteData` | 与对应方法相同，选项里没有 `responseType` | `Promise<T \| T[] \| undefined>` | 只返回 `data`。 |

### 依赖类型：`FileResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `blob` | `Blob` | 文件内容。 |
| `fileName` | `string \| undefined` | 响应头里的文件名。服务端没给时没有这个值。 |

### 依赖类型：`ErrorRetryContext`

传给错误回调和上报回调。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `attempt` | `number` | 第几次请求，从 1 开始。 |
| `retryCount` | `number` | 已经失败的次数，从 0 开始。 |
| `maxRetries` | `number` | 允许的重试次数。函数形式的 `retry` 是 `Infinity`。 |
| `maxAttempts` | `number` | `maxRetries + 1`。没有上限时是 `Infinity`。 |
| `willRetry` | `boolean` | 这次失败后还会不会再请求。 |

### 依赖类型：`ApiReportPayload`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `api` | `string` | 请求地址。 |
| `success` | `boolean` | 失败上报时为 `false`。 |
| `time` | `number` | 耗时，毫秒。 |
| `code` | `string \| number` | `errCode`。没有时用 HTTP 状态，再没有时是 `'UNKNOWN'`。 |
| `msg` | `string` | `errMessage`。没有时用 `error.message`。 |
| `begin` | `number` | 开始时间戳。 |
| `traceId` | `string` | 后端 trace。没有时是空字符串。 |
| `status` | `number \| undefined` | HTTP 状态码。 |

### 依赖类型：`ApiError`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `message` | `string` | `Error.message`。`errMessage` 为空时使用英文兜底。 |
| `errCode` | `string \| undefined` | 后端错误码。超时是 `'TIMEOUT'`。 |
| `errMessage` | `string \| undefined` | 后端原文，可能是空字符串。页面提示读这个字段。 |
| `traceId` | `string \| undefined` | 后端 trace。 |
| `response` | `ApiResponse \| undefined` | 原始业务包。HTTP 错误没有业务包时没有这个值。 |
| `status` | `number \| undefined` | HTTP 状态码。 |
| `url` | `string \| undefined` | 请求地址。 |
| `method` | `HttpMethod \| undefined` | 请求方法。 |
| `begin` | `number \| undefined` | 开始时间戳。 |
| `duration` | `number \| undefined` | 耗时，毫秒。 |
| `businessError` | `boolean` | `errCode` 失败，且不是登录失效。 |
| `sessionInvalid` | `boolean` | 登录失效。 |
| `timeout` | `boolean` | 超时。 |

## 根入口工具

| 工具 | 参数 | 返回值 / 说明 |
| --- | --- | --- |
| `createClient(config?)` | `ClientConfig` | 创建 `ApiClient`。 |
| `ApiError` | `ApiErrorOptions` | 请求失败错误。 |
| `isApiError(error)` | `unknown` | 是不是 `ApiError`。 |
| `isBusinessError(error)` | `unknown` | 业务失败。 |
| `isSessionInvalidError(error)` | `unknown` | 登录失效。 |
| `isTimeoutError(error)` | `unknown` | 超时。 |
| `fetchTransport` | `TransportRequest` | 默认的 `fetch` 传输层。 |
| `selectData(response)` | `ApiResponse<T>` | 取出业务包的 `data`。 |

## `@zby/request/react-query`

| API | 参数 / 类型 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `createQueryClient(config?)` | `QueryClientConfig` | `QueryClient` | 查询和 mutation 默认使用 `shouldRetry`。调用方自己的 `retry` 会覆盖。 |
| `createRequestQuery(apiClient)` | `ApiClient` | `RequestQuery` | 返回 `{ queryOptions, mutationOptions }`。 |
| `shouldRetry(failureCount, error)` | `number, unknown` | `boolean` | 业务失败和登录失效返回 `false`。其它失败在次数小于 2 时返回 `true`。 |
| `DEFAULT_MAX_RETRIES` | 无 | `2` | 默认最多再试 2 次。 |

`queryOptions` 的参数与 TanStack 的 `queryOptions` 相同。`queryFn` 的上下文多一个 `request: ApiClient`。

`mutationOptions` 的 `mutationFn` 签名是 `(variables, context) => Promise<TData>`。`context` 在 TanStack 的 mutation 上下文上增加了 `signal` 和 `request`。TanStack 自己的 mutation 上下文没有 `signal`，这里为同一次执行生成一个，重试时复用。

## 开发命令

```bash
pnpm --filter @zby/request typecheck
pnpm --filter @zby/request test
pnpm --filter @zby/request build
```
