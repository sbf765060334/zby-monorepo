# ProLayout 渐进式迁移基线

## 1. 文档目的

本文档是将 Shuzhi ProLayout 迁移到 `@zby/pro` 的执行基线，用于约束后续实现、评审和测试。

- 目标仓库：`C:\Users\Lenovo\Desktop\demo\zby-monorepo`
- 参考仓库：`D:\zby\shuzhi-monorepo`
- 参考组件：`packages/shuzhi-pro/components/pro-layout`
- 目标包：`packages/zby-pro`

除本文档明确记录的已批准差异外，迁移应保持 Shuzhi ProLayout 已存在的产品行为。发现新的行为差异、设计缺陷或无法等价迁移的能力时，必须先说明并等待确认。

## 2. 已确认的总体约束

1. 不迁移 Next.js 相关代码、入口、类型、测试和依赖。
2. 不迁移 AI 主题和主题 preset。
3. 主题模式保留跟随系统、浅色主题和暗黑主题三种；对外值沿用参考实现的 `auto`、`light` 和 `dark`。
4. 主题切换动画复用 `packages/zby-pro/src/hooks/useThemeModeTransition.ts`；跟随系统模式先解析实际的 Light/Dark 外观，再把解析结果交给该 Hook。
5. 普通 UI 组件使用 antd，不引入整套 `shuzhi-ui`。
6. ScrollArea 使用 `@zby/ui` 已有实现。
7. 允许按需引入 `ahooks`、`zustand`、`clsx`、`@dnd-kit/*` 等直接依赖。
8. 不在运行时代码或普通类型中直接依赖 `antd/es/**` 等 antd 内部模块；Component Token 的纯类型声明合并可以沿用 ZBY 现有组件方案。
9. UI 产品行为和交互结构按 Shuzhi 迁移，组件 API 做 antd 等价适配，样式注册机制按 ZBY 现有 CSS-in-JS 模式重写。
10. 每个迁移步骤必须独立完成验证并汇报，不自动进入下一步。

## 3. 已批准的实现差异

以下差异已经确认，可在保持产品语义的前提下修复参考实现的问题。

### 3.1 保留跨窗口消息能力

保留现有消息协议表达的能力：

- `type: 'navigator'`
- `url`
- `destroy`
- `skipBeforeClose`

消息来源校验策略尚未确认。在确认前，只迁移协议类型和测试基线，不擅自决定同源限制、可信 origin 列表或自定义校验器 API。

### 3.2 修复持久化并发覆盖

ZBY 实现不得复用“先读取完整状态，再在独立事务中写回完整状态”的非原子更新方式。

最低验收要求：

- 收藏、固定页签和参数路径同时保存时互不覆盖。
- 同一字段连续快速更新时，最终持久化结果与最后一次已提交的内存状态一致。
- IndexedDB 默认 adapter 的读取与字段更新必须处于可证明不会丢失更新的事务或串行流程中。
- 自定义远程 adapter 的调用顺序必须有明确契约。

第四步实现结论：

- 默认 adapter 使用 `idb-keyval.update` 在单个 readwrite transaction 中读取最新记录、合并字段并写回。
- 默认 adapter 和远程 adapter 都按 `storageKey` 串行保存；单次失败不阻塞后续提交。
- `idb-keyval` 是 `@zby/pro` 运行时依赖，`fake-indexeddb` 只用于真实事务测试。
- 不迁移仅被参考测试使用的 `createStorageKeys` 和完全未使用的可变空状态常量。
- `getInitialTabsFromStorage` 属于 Store 初始化逻辑，延后到第五步迁移。

### 3.3 权限支持运行时变化

运行时权限变化通过显式 `authVersion` 提交。`hasAuth` 函数引用本身不是权限版本，
避免调用方在 JSX 中传入内联函数时，普通渲染反复重建 Route Registry。

最低验收要求：

- 新获得权限后，对应菜单和页面可以访问。
- 权限被撤销后，对应菜单消失，当前页面不再继续展示受限内容。
- 已打开页签、KeepAlive 页面和持久化页签不会绕过最新权限结果。
- `hasAuth` 从函数变为 `undefined` 或从 `undefined` 变为函数时，必须同时改变
  `authVersion`，并得到一致的新权限快照。
- 未传 `authVersion` 时，整个挂载期固定使用首次提交的 `hasAuth`；后续只改变
  `hasAuth` 不生效。
- `authVersion` 支持字符串和数字，不要求连续递增，只使用 `Object.is` 判断变化；
  切换到或切出 `undefined` 也属于一次版本变化。

### 3.4 修复 Route Registry 与公开契约不一致

- 未提供 `hasAuth` 时，带 `auth` 的路由按有权限处理，与公开文档和页面内权限 Hook 保持一致。
- 包含末尾 `*` 的路由模式进入动态路由索引，并在面包屑和 selected path 中还原真实通配符路径。
- 重叠动态路由按照 React Router 的路径具体程度评分解析，分数相同时保留路由树声明顺序，精确路径始终优先。

### 3.5 统一 `ignore` 的路由语义

- `ignore` 只表示从菜单、菜单抽屉等可见导航结构中隐藏当前路由。
- 带有 `element` 的 `ignore` 路由仍是可访问页面，可以通过 URL 和程序导航正常打开。
- `ignore` 不参与权限路由过滤、页签身份、默认页面和页面渲染判断；菜单层必须显式过滤该字段。

### 3.6 补全路由预加载异常处理

- 页面组件的 `preload` 在 Promise 微任务中执行，同步 throw 和异步 rejection 统一转换为静默失败。
- 推测性预加载失败不得打断 hover、focus 或页签交互；真正导航时仍由正常页面加载流程处理错误。
- 保持 `preloadRouteElement` 的 `void` 返回值，不增加错误回调或其它公开 API。

### 3.7 拆分 Store 并修复状态竞争

第五步实现结论：

- Store 使用 `zustand/vanilla`，按类型、初始化、持久化、导航、页签模型、页签动作和 KeepAlive 拆分，不照搬参考仓库 938 行单文件。
- Store 使用自己的 `ProLayoutTab`、国际化和消息最小接口，不依赖 antd Tabs 类型、`antd/es/**` 或 `shuzhi-ui`。
- Store 只持有一个 Route Registry；原始路由树、权限路由树和两套路由映射统一从 Registry 读取，不在 Zustand 快照中保存重复引用。
- generation、字段修改版本、页面 emitter 和关闭前 Hook Map 由每个 Store 独享的闭包 runtime 保存；这些命令协调数据不参与 Zustand 订阅和 UI 更新。
- hydration 使用 collection、fixedTabs、fixedParamsPathMap 三个字段各自的修改版本；只保护加载期间真正发生本地修改的字段。
- 当前会话已经确认的动态 pathname 覆盖旧持久化值，避免首屏 `/project/99` 在加载后退回旧的 `/project/42`。
- `storageKey` 或 `storageAdapter` 变化时重新加载新来源，并通过 generation 阻止旧来源晚到结果回写；仍打开的共享动态页签继续保留真实 pathname。
- `storageAdapter={false}` 保持纯内存状态和完整内存 Cache；从 false 切换到真实 Adapter 后正常加载。
- 关闭固定页签时同步取消固定并持久化；并发关闭同一页签只允许一个操作完成清理和回调。
- `setTabs` 对内容相同的页签数组不更新状态；普通页签重排不写 fixedTabs，固定页签组内重排同时更新内存顺序并只持久化一次。
- `jumpTo` 和 `smartNavigate` 中，undefined 表示恢复页签 search/hash 缓存，null 或空字符串表示显式清空。
- KeepAlive 动态缩容时一次达到上限；非正数上限只保留活动页和不可淘汰固定页，exclude 优先于 include。
- 删除未消费的首屏动态路径 overlay 和一次性 Cache 持久化转发函数；测试 Storage Adapter 通过接口签名构造 mock，不再使用 `as never` 绕过类型检查。
- 不迁移仅服务于 Next.js 页面缓存切换的 navigate `cache` 元数据。

### 3.8 迁移 Context 与 Effects 并修复 React 同步缺陷

第六步实现结论：

- Layout Context 只承载生命周期稳定的 Zustand vanilla Store 引用；业务组件通过
  `useProLayoutContext` 读取受控的公共能力，内部组件通过 selector 精确订阅 Store。
- Page Context 延续每个 KeepAlive 页面实例独享一个 vanilla Store 的契约，暴露真实
  pathname、tabKey、lifecycle 事件流和 location 事件流；具体 Provider 在第八步接入。
- Provider 外调用 Context Hook 时返回只读空 Store，不抛出异常，也不会产生导航、
  持久化或其它副作用。
- 修复参考 `useStoreSelector` 仅凭 Store state 引用相同复用旧结果的问题；缓存同时以
  Store state 与 selector 身份为键，同一 snapshot 保持选择结果引用稳定，selector 只因
  props 或闭包变量变化时仍会重新计算，再通过 equalityFn 复用等价结果引用。
- `SyncExternalDepsEffects` 使用 layout effect 在绘制前同步外部依赖，并补全参考实现遗漏
  的 `intl` 与 `storageKey`；locale 和持久化命名空间在挂载后变化时都能进入 Store。
- `PathnameSyncEffects` 不再只在首次挂载处理根路径和目录路由；浏览器历史或外部 Router
  在挂载后进入目录时，仍会跳到首个可访问子页面。相同输入在 React StrictMode 重放
  时不会重复导航。
- Registry 的 `defaultRoute === '/'` 表示没有可访问默认页面，Effect 不会发起无意义的
  `/ → /` 自导航。
- `LocationCacheEffects` 在首次挂载和每次 location 变化时缓存 search/hash，并发布完整
  pathname、search、hash。产品契约确认为：页面首次挂载后也应收到当前 location；
  第八步的页面 Provider 必须使用 layout effect 先注册 emitter。
- Context 与 Effects 不依赖 React Router、Next.js、antd 内部模块或 ahooks；Router 能力仍
  通过通用类型和 Store 动作注入。

### 3.9 完成运行时权限变化

第七步实现结论：

- 新增 `authVersion?: string | number` 作为唯一运行时权限提交信号；未传时固定使用
  挂载时的 `hasAuth`，同一版本内的新函数引用不会进入 Registry 或页面权限 Hook。
- `useProLayoutAuthorization` 保存已提交权限快照。`authVersion` 变化时同时提交当前
  `hasAuth` 并重建 Registry；普通 routes 变化只重建索引，不触发旧页面收敛。
- Store 使用 `authRevision` 通知稳定 `hasAuth` 的页面内权限订阅者重新计算，支持
  函数与 `undefined` 双向切换，也支持读取外部权限服务的稳定函数。
- 撤权后保留页签、顺序、固定、收藏和 URL Cache；当前 URL 不跳转，页面渲染层可
  依据完整索引与权限索引展示 403。
- 已失权的 KeepAlive 页面立即从 `pages` 删除，活动页面置空，并清理 emitter、关闭
  Hook 和动态页面描述；撤权不执行关闭 Hook，也不触发 `afterTabClose`。
- 首屏、Router pathname 同步和页签创建统一从权限索引创建业务页面实例；保留的
  失权页签可以导航到原 URL，但不能重新创建页面实例。
- 授权恢复后主动重新同步当前 pathname，即使 Router 地址未变化，也会创建新的干净
  页面实例，不复用撤权前组件状态。
- `useProLayoutAuth` 和 `ProLayoutAuth` 已迁移。403 页面卸载、菜单隐藏和 Core 接入的
  真实 UI 集成验证分别留在第八步、第九步和第十一步完成。

## 4. 必须保留的功能范围

### 4.1 路由与导航

- 路由树、父子层级和面包屑路径解析。
- 静态路由、参数路由和末尾通配符匹配能力。
- 完整路由表与权限路由表。
- 默认可访问页面和目录首个可访问子页面跳转。
- `_blank`、`target`、`ignore`、`prompt`、`anchorPoints` 等路由配置行为。
- React Router location、navigate、replace、search 和 hash 同步。
- 路由组件 preload 能力和失败处理。

### 4.2 页签与页面状态

- 普通页签、固定页签、收藏菜单和页签顺序。
- 动态参数路由共享页签和 `supportMultipleTabs` 独立页签。
- 页签关闭、关闭前 Hook、显式跳过 Hook 和关闭后回调。
- 页签对应 pathname、search、hash 的缓存与恢复。
- 页面标题和页签标题动态更新。
- 页面生命周期事件和 location 事件。

### 4.3 KeepAlive

- 开启和关闭 KeepAlive。
- `include`、`exclude` 和 `maxCachedPages`。
- 固定页签不参与普通 LRU 淘汰。
- 已缓存页面切换时保持 React 页面实例。
- 被关闭、被淘汰或失去权限的页面完成状态清理。

### 4.4 持久化

- 收藏菜单。
- 固定页签。
- 参数路由页签对应的真实 pathname。
- 默认 IndexedDB adapter。
- 自定义远程 adapter。
- `storageAdapter={false}` 的纯内存模式。
- `initialStorageState` 首屏初始化。
- 加载与保存错误回调及 retry。
- `storageKey` 隔离。

### 4.5 UI 与上下文

- 侧边菜单、菜单抽屉、系统切换入口、页签栏、收藏面板和内容区域。
- `prefixCls`、semantic `classNames` 和 `styles`。
- `useProLayoutContext`、`useProLayoutPageContext`、`ProLayoutAuth` 和 `useProLayoutAuth`。
- `ProLayoutContentContainer` 的 fill、stack、aside、padding 和 scrollable 行为。
- 跟随系统、浅色和暗黑三种主题模式、Component Token 和现有圆形主题过渡动画。

## 5. 明确排除的范围

- `pro-layout/next.ts`
- `router/next.tsx`
- `router/next-navigation.d.ts`
- `NextProLayoutProps`
- `NextProLayoutPageLoading`
- Next.js 专用入口、测试、playground 和依赖
- AI 主题请求、推荐、会话和 Drawer
- 主题 preset 及其选项、配置和持久化
- 除跟随系统、浅色和暗黑以外的其它主题能力
- 仅服务于 Next 页面缓存切换的 navigate `cache` 元数据

## 6. 尚未批准的行为调整

以下问题已经在参考实现中发现，但尚未获得修改确认。迁移到对应模块前必须单独说明。

- 跨窗口消息允许哪些 origin，以及如何表达可信来源。
- React Router basename 下的内部链接和新窗口链接是否作为兼容性修复处理。
- 动态 routes 更新后，既有页签和 KeepAlive 页面应关闭、刷新还是保留为无权限/404 页面。

国际化对象必须跟随当前 locale 更新，属于已存在功能的正确同步，不视为新增产品行为。

## 7. 测试矩阵

### 7.1 Route Registry

- [ ] 精确静态路由解析。
- [ ] 参数路由解析和参数替换。
- [ ] 末尾通配符匹配及零段匹配。
- [ ] 重叠动态路由的优先级有明确测试。
- [ ] 父子路由链和 selected path 正确。
- [ ] 默认路由取第一个可访问页面。
- [ ] 目录跳转到第一个可访问子页面。
- [ ] `ignore` 路由从菜单隐藏但可通过 URL 访问，无 element 和 prompt 路由按既有规则处理。
- [ ] `supportMultipleTabs` 生成独立 tab key。
- [ ] preload 成功、同步 throw、异步 rejection 和重复触发行为明确。

### 7.2 React Router Adapter

- [ ] location 的 pathname、search、hash 正确同步。
- [ ] 字符串和对象两种 navigate target 正确序列化。
- [ ] replace 选项正确传递。
- [ ] BrowserRouter basename 下 navigate 正确。
- [ ] basename 下 `_blank` 内部链接生成正确 href。
- [ ] MemoryRouter 集成测试不依赖浏览器全局对象。

### 7.3 Runtime Authorization

- [x] 未传 `hasAuth` 时默认允许访问。
- [x] 有权限和无权限路由分别进入授权路由表和完整路由表。
- [x] 未传 `authVersion` 时固定使用挂载期权限快照，普通函数引用变化不生效。
- [x] `authVersion` 变化后同步 Registry、Store 和页面内权限结果。
- [ ] 直接访问无权限地址显示 403，不渲染页面组件。
- [ ] 运行时新增权限后菜单和页面同步恢复。
- [ ] 运行时撤销权限后当前受限页面立即停止展示。
- [x] Store 不为直接访问的无权限地址创建页面实例；403 视图留待第八步验证。
- [x] 权限变化后已打开页签和 KeepAlive 页面重新校验。
- [x] 权限变化后收藏和固定偏好保留，但不能创建无权限页面实例。
- [x] `hasAuth` 在函数与 `undefined` 之间随版本切换时状态一致。

### 7.4 Cross-Window Message

- [ ] 忽略非 `navigator` 消息。
- [ ] 忽略缺少合法 url 的消息。
- [ ] 普通消息执行 jumpTo。
- [ ] `destroy` 先关闭旧页签再打开新地址。
- [ ] `skipBeforeClose` 能按协议显式跳过关闭 Hook。
- [ ] 不可信来源被拒绝，可信来源被接受。
- [ ] 组件卸载后移除 message 监听器。

### 7.5 Storage And Cache

- [x] URL 解析、search/hash 标准化和页签 URL 组合正确。
- [x] 参数 pathname、search 和 hash Cache 可以设置、恢复与清理。
- [x] 相同参数 pathname 不触发重复持久化通知。
- [x] IndexedDB 不可用时返回空状态且不抛出环境错误。
- [x] 非法存储数据完成标准化。
- [x] `initialStorageState` 不再触发异步覆盖。
- [x] hydration 期间发生内存修改时不覆盖新状态，未冲突字段仍正常加载。
- [x] `storageAdapter={false}` 不执行外部读写，并支持后续切换到真实 Adapter。
- [x] `storageKey` 或 `storageAdapter` 变化后加载新来源，旧异步结果不能回写，非活动共享动态页签仍可恢复真实 pathname。
- [x] 加载和保存失败提供正确 phase、storageKey 和 retry。
- [x] 不同 storageKey 完全隔离。
- [x] 收藏、固定页签和参数路径并发保存时全部保留。
- [x] 同一字段连续保存时最终结果为最后一次状态。
- [x] 关闭页签后 pathname、search、hash 缓存完成清理。
- [x] undefined 恢复 search/hash 缓存，null 或空字符串显式清空。

### 7.6 Tabs And KeepAlive

- [x] 固定页签始终排在普通页签之前且组内顺序稳定。
- [x] 相同页签不触发更新，普通页签重排不写 fixedTabs，固定页签重排只写一次并同步 fixedSet。
- [ ] 拖拽不能跨越固定/非固定分组。
- [x] 关闭 Hook 全部同意才允许关闭。
- [x] 关闭后清理 Hook、emitter、页面和缓存。
- [x] 动态参数共享页签时更新真实 pathname。
- [x] `supportMultipleTabs` 为不同参数保留不同页面实例。
- [x] 无限 KeepAlive 重访页面时对象和组件实例稳定。
- [x] LRU 只淘汰可淘汰的非活动、非固定页面。
- [x] include/exclude 同时存在时遵循既有优先级。

### 7.7 Theme And UI

- [ ] ConfigProvider prefixCls 能改变 ProLayout DOM 类名前缀。
- [ ] `theme.components.ProLayout` 能覆盖 Component Token。
- [ ] 跟随系统、浅色和暗黑三种模式可以正确切换和持久化。
- [ ] 跟随系统模式响应 `prefers-color-scheme` 的初始值和运行时变化。
- [ ] 三种模式都能同步 antd token 和 ProLayout CSS Variables。
- [ ] 主题实际外观发生 Light/Dark 变化时调用现有 `useThemeModeTransition`。
- [ ] prefers-reduced-motion 下不执行圆形动画。
- [ ] 菜单、Drawer、Tabs、Popover 和 ContentContainer 在明暗主题下可读。
- [ ] semantic classNames/styles 只作用于对应区域。
- [ ] 桌面与窄视口下没有重叠、溢出和不可操作区域。

### 7.8 Context And Effects

- [x] Layout Context 和 Page Context 在 Provider 外返回无副作用默认值。
- [x] selector 闭包参数变化但 Store 快照不变时，选择结果立即更新。
- [x] 对象 selector 未传 equalityFn 时，同一 Store snapshot 的选择结果保持稳定。
- [x] equalityFn 判定等价时保持选择结果引用稳定。
- [x] locale 变化后 Store 使用最新 intl 对象。
- [x] storageKey/Adapter 变化后加载新来源，并沿用 Store generation 竞态保护。
- [x] 首屏根路径和目录路由能够跳转到默认可访问页面。
- [x] 挂载后通过外部 Router 或浏览器历史进入目录，仍跳到首个可访问子页面。
- [x] StrictMode 重放相同 pathname Effect 时不重复导航。
- [x] 没有可访问页面时不会从根路径导航到根路径。
- [x] Location Effect 首次挂载时缓存 search/hash，并向已注册页面发布完整 location。
- [ ] 第八步页面 Provider 使用 layout effect 注册 emitter，确保收到首次 location。

## 8. 每步统一验证门槛

每个迁移步骤至少执行与改动范围对应的命令：

```text
corepack pnpm@11.7.0 --filter @zby/pro typecheck
corepack pnpm@11.7.0 --filter @zby/pro test
corepack pnpm@11.7.0 exec eslint packages/zby-pro/src
```

涉及包入口、依赖、主题样式或构建配置时，额外执行：

```text
corepack pnpm@11.7.0 --filter @zby/pro build
```

每一步结束时还必须检查：

- `git diff --check`
- `git status --short`
- 没有 Next.js、AI 主题、主题 preset 或其它未批准主题能力残留。
- 没有 `shuzhi-ui`、`@shuzhi/*` 或 `antd/es/**` 运行时依赖。
- 没有进入当前步骤范围之外的产品行为调整。

## 9. 参考仓库验证基线

已尝试运行以下参考测试：

```text
vitest run components/pro-layout/__tests__/index.test.ts \
  components/pro-layout/__tests__/content-render.test.tsx \
  components/pro-layout/__tests__/content-container.test.tsx
```

结果：

- `content-container.test.tsx`：10 个测试通过。
- `index.test.ts` 和 `content-render.test.tsx`：测试收集阶段失败，原因为无法解析 `shuzhi-ui/locale/en_US`，两份文件均为 0 test。

因此不能把参考仓库当前状态记录为“ProLayout 全量测试通过”。后续迁移以源码行为、能够正常执行的参考测试和 ZBY 新增回归测试共同作为验证依据。

## 10. 渐进式迁移状态

- [x] 步骤 1：建立迁移基线。
- [x] 步骤 2：迁移纯类型层。
- [x] 步骤 3：迁移路由引擎。
- [x] 步骤 4：迁移 URL、Cache 和 Storage Adapter。
- [x] 步骤 5：迁移并拆分 Store 引擎。
- [x] 步骤 6：迁移 Context 和 Effects。
- [x] 步骤 7：完成运行时权限变化。
- [ ] 步骤 8：迁移页面渲染与 KeepAlive。
- [ ] 步骤 9：迁移菜单 UI。
- [ ] 步骤 10：迁移页签 UI。
- [ ] 步骤 11：组装 Core 和 React Router Adapter。
- [ ] 步骤 12：迁移跨窗口消息。
- [ ] 步骤 13：迁移 ContentContainer。
- [ ] 步骤 14：接入跟随系统、浅色、暗黑主题和 ProLayout Token。
- [ ] 步骤 15：公开导出与最终验收。
