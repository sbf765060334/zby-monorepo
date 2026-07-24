# ProLayout 暂缓功能清单

> 本文记录本次迁移中因 `@zby/router-core` 现有公开 API、产品协议或存储边界不足而暂不实现的功能。页面内权限查询已经由 core 公开只读 `router.hasAuth(code)`；业务 Hook 由业务侧按需实现，不属于 ProLayout 暂缓功能。

## 1. 应用内原生链接与 `_blank`

- Shuzhi 能力：菜单和面包屑可以生成原生 href，并支持新窗口打开。
- 当前缺口：React Router Adapter 内部已经生成 basename-aware `createHref`，但 RouterCore 没有公开读取 Host href 的 API。
- 受影响功能：应用内部 `_blank` 菜单、面包屑 Ctrl/Command/中键新窗口打开。
- 当前处理：普通菜单和面包屑使用 `jumpTo`；完整的 http/https 外部 URL 可以原生打开；应用内部 `_blank` 暂不实现。
- 后续最小方向：只读公开当前 Host 的 `createHref(path)`，不能在 ProLayout 中拼接 `window.location.origin`。

## 2. 菜单收藏及收藏持久化

- Shuzhi 能力：菜单收藏、收藏面板、IndexedDB 和远程 Adapter 保存。
- 当前缺口：RouterStorageState 明确只包含固定页签和动态 pathname；当前也没有确认 ProLayout 收藏的独立远程存储契约。
- 受影响功能：收藏图标、Header 收藏面板、刷新恢复收藏。
- 当前处理：整组功能暂不迁移，不向 router-core Storage Adapter 私自增加字段。
- 后续最小方向：确认收藏只使用本地 IndexedDB，还是定义独立的 ProLayout UI Storage Adapter。

## 3. 跨窗口 navigator 消息

- Shuzhi 能力：接收 `message type=navigator` 后跳转或关闭旧页签并打开新地址。
- 当前缺口：尚未定义可信 `origin/source`，也未定义哪些来源有权使用 `skipBeforeClose`。
- 受影响功能：其它系统通过 postMessage 控制当前平台导航。
- 当前处理：不注册 window message 监听器。
- 后续最小方向：先确定可信来源协议，再由 ProLayout 装配层调用现有 `jumpTo/closeThisTabOpenNewOne`。

## 4. Shuzhi `lifecycle$` 事件兼容

- Shuzhi 能力：页面通过 emitter 订阅显示/隐藏事件。
- 当前缺口：router-core React 层公开的是稳定 `active` 状态，没有同名事件流。
- 受影响功能：直接依赖旧 `lifecycle$.useSubscription` 的页面代码。
- 当前处理：新页面通过 `useRouterPageSelector(state => state.active)` 订阅状态；暂不构造兼容 emitter。
- 后续最小方向：仅在确认存在旧页面兼容需求时，在 ProLayout React 层做适配，不修改 core。
