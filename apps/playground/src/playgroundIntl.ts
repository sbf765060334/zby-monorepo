import type { IntlResources } from '@zby/intl'

export type PlaygroundLocale = 'zh-CN' | 'en-US'

/**
 * RouterCore 会在创建时冻结路由标题，因此路由文案不能在 React render 中原地修改。
 * Playground 为两种语言分别创建稳定 router，这份配置负责提供各自的静态路由标题。
 */
const routeCopies = {
  'zh-CN': {
    appTitle: 'ZBY 数字化平台',
    overview: '平台概览',
    components: '组件预览',
    routing: '路由能力',
    routerCore: '路由状态',
    orderDetail: '订单详情',
  },
  'en-US': {
    appTitle: 'ZBY Digital Platform',
    overview: 'Overview',
    components: 'Components',
    routing: 'Routing',
    routerCore: 'Router state',
    orderDetail: 'Order details',
  },
} as const

/** Playground 自有页面文案，与组件库语言包一起交给 ZbyIntlProvider。 */
export const playgroundLocales = {
  'zh-CN': {
    playground: {
      proLayout: {
        badge: 'ProLayout 预览',
        switchLanguage: '切换为 English',
        overview: {
          title: 'ZBY ProLayout 功能预览',
          subtitle: '基于 router-core 的菜单、页签、KeepAlive、收藏和持久化演示。',
          guide: '从左侧打开“组件预览”或“路由能力”，再通过顶部页签切换、固定、关闭和拖拽页面。',
          keepAliveTitle: 'KeepAlive 页面状态',
          keepAliveDescription: '增加计数后切换到其他页签，再返回本页，计数仍会保留。',
          increment: '增加计数',
          openInput: '打开 InputNumberRange',
          openScroll: '打开 ScrollArea',
          openRouter: '查看路由状态',
          featureTitle: '本预览覆盖的能力',
          routing: '真实 URL 双向同步',
          tabs: '页签切换、关闭、固定与拖拽',
          keepAlive: 'KeepAlive 与缓存上限',
          favorites: '菜单收藏及 IndexedDB 持久化',
          i18n: '中英文路由与页面文案',
          theme: '亮色、暗色与跟随系统主题',
        },
        core: {
          title: 'RouterCore 实时状态',
          subtitle: '下面的数据直接订阅当前 RouterCore，不经过额外的 Playground Store。',
          currentPath: '当前路径',
          openTabs: '已打开页签',
          retainedPages: '保留页面',
          fixedTabs: '固定页签',
          storage: '持久化状态',
          hydrated: '已加载',
          loading: '加载中',
          openOrder1001: '打开订单 1001',
          openOrder1002: '打开订单 1002',
          updateUrl: '更新 search 与 hash',
          location: '当前页面 location',
          tabSnapshot: '页签快照',
          emptyTabs: '暂无页签',
        },
        order: {
          title: '动态订单页签：{{id}}',
          subtitle: 'supportMultipleTabs=true，因此不同订单号拥有独立页签和独立页面实例。',
          pathname: '真实 pathname',
          tabKey: '页签 key',
          note: '当前页签备注',
          notePlaceholder: '输入内容后切换订单，验证每个页签的状态互不影响',
          openPrevious: '打开订单 1001',
          openNext: '打开订单 1002',
        },
      },
    },
  },
  'en-US': {
    playground: {
      proLayout: {
        badge: 'ProLayout preview',
        switchLanguage: 'Switch to 中文',
        overview: {
          title: 'ZBY ProLayout feature preview',
          subtitle: 'Menus, tabs, KeepAlive, favorites, and persistence powered by router-core.',
          guide: 'Open Components or Routing from the sidebar, then switch, pin, close, and drag pages in the top tab bar.',
          keepAliveTitle: 'KeepAlive page state',
          keepAliveDescription: 'Increase the counter, switch to another tab, and return to verify that the state is retained.',
          increment: 'Increase counter',
          openInput: 'Open InputNumberRange',
          openScroll: 'Open ScrollArea',
          openRouter: 'Inspect router state',
          featureTitle: 'Capabilities covered by this preview',
          routing: 'Two-way synchronization with the real URL',
          tabs: 'Tab switching, closing, pinning, and dragging',
          keepAlive: 'KeepAlive with a cache limit',
          favorites: 'Menu favorites persisted in IndexedDB',
          i18n: 'Chinese and English route and page content',
          theme: 'Light, dark, and system theme modes',
        },
        core: {
          title: 'Live RouterCore state',
          subtitle: 'The data below subscribes directly to RouterCore without an extra Playground store.',
          currentPath: 'Current path',
          openTabs: 'Open tabs',
          retainedPages: 'Retained pages',
          fixedTabs: 'Pinned tabs',
          storage: 'Persistence',
          hydrated: 'Hydrated',
          loading: 'Loading',
          openOrder1001: 'Open order 1001',
          openOrder1002: 'Open order 1002',
          updateUrl: 'Update search and hash',
          location: 'Current page location',
          tabSnapshot: 'Tab snapshot',
          emptyTabs: 'No tabs',
        },
        order: {
          title: 'Dynamic order tab: {{id}}',
          subtitle: 'supportMultipleTabs=true gives every order its own tab and page instance.',
          pathname: 'Concrete pathname',
          tabKey: 'Tab key',
          note: 'Note for this tab',
          notePlaceholder: 'Enter text and switch orders to verify that each tab keeps independent state',
          openPrevious: 'Open order 1001',
          openNext: 'Open order 1002',
        },
      },
    },
  },
} satisfies IntlResources

export function getPlaygroundRouteCopy(locale: PlaygroundLocale) {
  return routeCopies[locale]
}
