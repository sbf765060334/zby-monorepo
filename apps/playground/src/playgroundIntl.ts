import type { ZbyLocalePack } from '@zby/ui'

export type PlaygroundLocale = 'zh-CN' | 'en-US'

/**
 * 路由菜单文案。
 *
 * routes.tsx 里的 `title` 只存这里的 key，翻译发生在渲染时，所以这份文案和普通页面
 * 文案没有区别，一起交给 ZbyConfigProvider 即可，不需要为路由单独准备一套机制。
 */
const menuZhCN = {
  dashboard: '首页',
  orders: {
    title: '共享页签',
    detail: '订单详情',
    // {{id}} 由 setTabLabel 传入；订单号前面要不要加 # 完全由这句模板决定。
    tabLabel: '订单 #{{id}}',
  },
  workbench: {
    title: '工作台',
    records: '记录详情',
    dirty: '关闭门禁',
    closeConfirm: '关闭确认',
    queryReencode: '查询串重编码',
    listenerThrow: 'listener 抛错',
    pendingLock: '关闭锁和 pending',
    inactiveReplace: '非活动页组合关闭',
    idbLoadRace: 'IndexedDB 读写排队',
    parallelCloseGuards: '关闭守卫串行',
    contentContainer: '内容区布局',
    hidden: '隐藏菜单',
    wip: '开发中页面',
    enterpriseReport: '高级报表',
    enterpriseReportTag: '企业版',
    // {{contact}} 由 prompt 描述符的 values 传入。
    enterpriseReportPrompt: '高级报表属于企业版功能，请联系 {{contact}} 开通。',
    external: '外部系统',
    directShortcut: '二级直达菜单',
    directRisk: '风险待办',
    customer: {
      title: '三级菜单组',
      profile: '客户画像',
      segment: '客群分层',
      reach: '触达计划',
      retention: '复购留存',
    },
    product: {
      title: '商品中心',
      list: '商品列表',
      category: '类目管理',
      price: '价格策略',
      stock: '库存预警',
    },
    material: {
      title: '四级菜单组',
      assets: {
        title: '素材资产',
        voices: '语音素材',
        // 超长文案用于验证 Drawer 分列测量，切换语言后需要重新测高。
        images: '图片素材图片素材图片素材',
        videos: '视频素材',
        copywriting: '文案素材',
      },
      audit: {
        title: '素材审核',
        pending: '待审核',
        rejected: '驳回记录',
      },
    },
    campaign: {
      title: '广告投放',
      manage: {
        title: '活动管理',
        list: '活动列表',
        budget: '预算调整',
        creative: '创意绑定',
      },
      strategy: '投放策略',
      diagnosis: '投放诊断',
    },
    data: {
      title: '数据诊断',
      realtime: '实时指标',
      funnel: '转化漏斗',
      compare: '多维对比',
      export: '数据导出',
    },
    delivery: {
      title: '履约管理',
      order: '订单履约',
      logistics: '物流跟踪',
      exception: '异常处理',
    },
    finance: {
      title: '财务结算',
      bill: '账单管理',
      invoice: '发票管理',
      reconcile: '对账中心',
      refund: '退款记录',
    },
    permission: {
      title: '权限配置',
      role: '角色管理',
      member: '成员管理',
      audit: '权限审计',
    },
    tools: {
      title: '系统工具',
      import: '批量导入',
      task: '任务中心',
      webhook: '回调配置',
      log: '操作日志',
    },
    automation: {
      title: '自动化任务',
      rules: '规则编排',
      schedule: '定时任务',
      history: '执行历史',
    },
    quality: {
      title: '质检中心',
      sample: '抽检样本',
      rule: '质检规则',
      report: '质检报告',
    },
    largeBackground: {
      title: '大批量菜单组 - 后台',
      ticket: '工单列表',
      knowledge: '知识库',
      sla: 'SLA 配置',
    },
    largeOps: {
      title: '大批量菜单组 - 运营',
      calendar: '运营日历',
      event: '事件中心',
      review: '复盘记录',
    },
    largeService: {
      title: '大批量菜单组 - 服务',
      ticket: '工单列表',
      knowledge: '知识库',
      sla: 'SLA 配置',
    },
  },
  reports: {
    title: '报表',
    overview: '报表总览',
    live: '实时监控',
  },
  demo: {
    title: '示例页面',
    ui: {
      title: 'UI示例组',
      actionIcon: '动作图标',
      actionReveal: '动作展开',
      actionText: '动作文本',
      inputRange: '数字范围',
      scrollArea: '滚动组件',
      table: '表格',
      proTable: '高级表格',
      proViewManagement: '视图管理',
    },
    error: {
      title: '错误实例组',
      notFound: '404页面',
    },
  },
}

/**
 * 英文菜单文案尽量压到一个单词。
 *
 * 中文一个菜单名通常四个字就说清楚，英文照直翻译会长出两三倍，在图标栏和 Drawer 分列里
 * 会挤成两行。除了刻意留长的测量夹具（assets.images）和整句提示（enterpriseReportPrompt），
 * 其余都取最短且仍能区分的说法。
 */
const menuEnUS = {
  dashboard: 'Home',
  orders: {
    title: 'Tabs',
    detail: 'Detail',
    tabLabel: 'Order #{{id}}',
  },
  workbench: {
    title: 'Work',
    records: 'Records',
    dirty: 'Guard',
    closeConfirm: 'Confirm',
    queryReencode: 'Re-encode',
    listenerThrow: 'Listener',
    pendingLock: 'Lock',
    inactiveReplace: 'Inactive',
    idbLoadRace: 'IndexedDB',
    parallelCloseGuards: 'Guards',
    contentContainer: 'Layout',
    hidden: 'Hidden',
    wip: 'WIP',
    enterpriseReport: 'Advanced',
    enterpriseReportTag: 'Enterprise',
    enterpriseReportPrompt: 'Advanced reports require the Enterprise plan. Contact {{contact}} to enable it.',
    external: 'External',
    directShortcut: 'Shortcut',
    directRisk: 'Risk',
    customer: {
      title: 'Level 3',
      profile: 'Profile',
      segment: 'Segments',
      reach: 'Outreach',
      retention: 'Retention',
    },
    product: {
      title: 'Products',
      list: 'List',
      category: 'Category',
      price: 'Pricing',
      stock: 'Stock',
    },
    material: {
      title: 'Level 4',
      assets: {
        title: 'Assets',
        voices: 'Voices',
        // 与中文一致，这条刻意保持超长，用于验证 Drawer 分列测量。
        images: 'Image assets image assets image assets',
        videos: 'Videos',
        copywriting: 'Copy',
      },
      audit: {
        title: 'Review',
        pending: 'Pending',
        rejected: 'Rejected',
      },
    },
    campaign: {
      title: 'Campaigns',
      manage: {
        title: 'Manage',
        list: 'List',
        budget: 'Budget',
        creative: 'Creative',
      },
      strategy: 'Strategy',
      diagnosis: 'Diagnosis',
    },
    data: {
      title: 'Data',
      realtime: 'Real-time',
      funnel: 'Funnel',
      compare: 'Compare',
      export: 'Export',
    },
    delivery: {
      title: 'Delivery',
      order: 'Orders',
      logistics: 'Logistics',
      exception: 'Exceptions',
    },
    finance: {
      title: 'Finance',
      bill: 'Bills',
      invoice: 'Invoices',
      reconcile: 'Reconcile',
      refund: 'Refunds',
    },
    permission: {
      title: 'Access',
      role: 'Roles',
      member: 'Members',
      audit: 'Audit',
    },
    tools: {
      title: 'Tools',
      import: 'Import',
      task: 'Tasks',
      webhook: 'Webhooks',
      log: 'Logs',
    },
    automation: {
      title: 'Automation',
      rules: 'Rules',
      schedule: 'Schedule',
      history: 'History',
    },
    quality: {
      title: 'Quality',
      sample: 'Samples',
      rule: 'Rules',
      report: 'Reports',
    },
    largeBackground: {
      title: 'Bulk - Backend',
      ticket: 'Tickets',
      knowledge: 'Knowledge',
      sla: 'SLA',
    },
    largeOps: {
      title: 'Bulk - Ops',
      calendar: 'Calendar',
      event: 'Events',
      review: 'Reviews',
    },
    largeService: {
      title: 'Bulk - Service',
      ticket: 'Tickets',
      knowledge: 'Knowledge',
      sla: 'SLA',
    },
  },
  reports: {
    title: 'Reports',
    overview: 'Overview',
    live: 'Live',
  },
  demo: {
    title: 'Examples',
    ui: {
      title: 'UI',
      actionIcon: 'Icon',
      actionReveal: 'Reveal',
      actionText: 'Text',
      inputRange: 'Range',
      scrollArea: 'Scroll',
      table: 'Table',
      proTable: 'Pro table',
      proViewManagement: 'Pro view',
    },
    error: {
      title: 'Errors',
      notFound: '404',
    },
  },
}

export const playgroundZhCN = {
  locale: 'zh-CN',
  playground: {
    menu: menuZhCN,
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
} satisfies ZbyLocalePack

export const playgroundEnUS = {
  locale: 'en-US',
  playground: {
    menu: menuEnUS,
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
} satisfies ZbyLocalePack
