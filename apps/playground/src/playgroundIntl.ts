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
  workbench: {
    title: '工作台',
    wip: '开发中页面',
    enterpriseReport: '高级报表',
    enterpriseReportTag: '企业版',
    enterpriseReportPrompt: '高级报表属于企业版功能，请联系 {{contact}} 开通。',
    external: '外部系统',
    directShortcut: '二级直达菜单',
    directRisk: '风险待办',
    guardTag: '守卫',
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
      shifts: '值班排班',
      alerts: '告警规则',
      audit: '审计日志',
      dict: '字典配置',
      templates: '消息模板',
      files: '附件管理',
      throttle: '接口限流',
      cache: '缓存清理',
      canary: '灰度发布',
      backup: '备份恢复',
      archive: '数据归档',
      freeze: '账号冻结',
      manuals: '操作手册',
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
      csat: '满意度',
    },
  },
  demo: {
    title: '示例页面',
    ui: {
      actionIcon: '动作图标',
      actionReveal: '动作展开',
      actionText: '动作文本',
      inputRange: '数字范围',
      scrollArea: '滚动组件',
      table: '表格',
      proTable: '高级表格',
      proViewManagement: '视图管理',
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
  workbench: {
    title: 'Work',
    wip: 'WIP',
    enterpriseReport: 'Advanced',
    enterpriseReportTag: 'Enterprise',
    enterpriseReportPrompt: 'Advanced reports require the Enterprise plan. Contact {{contact}} to enable it.',
    external: 'External',
    directShortcut: 'Shortcut',
    directRisk: 'Risk',
    guardTag: 'Guard',
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
      shifts: 'Shifts',
      alerts: 'Alerts',
      audit: 'Audit',
      dict: 'Dict',
      templates: 'Templates',
      files: 'Files',
      throttle: 'Limits',
      cache: 'Cache',
      canary: 'Canary',
      backup: 'Backup',
      archive: 'Archive',
      freeze: 'Freeze',
      manuals: 'Manuals',
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
      csat: 'CSAT',
    },
  },
  demo: {
    title: 'Examples',
    ui: {
      actionIcon: 'Icon',
      actionReveal: 'Reveal',
      actionText: 'Text',
      inputRange: 'Range',
      scrollArea: 'Scroll',
      table: 'Table',
      proTable: 'Pro table',
      proViewManagement: 'Pro view',
    },
  },
}

export const playgroundZhCN = {
  locale: 'zh-CN',
  playground: {
    menu: menuZhCN,
    proLayout: {
      overview: {
        title: '组件预览',
        subtitle: '从左侧打开示例页面，预览组件能力。',
        guide: '从左侧打开示例页面，再通过顶部页签切换、固定、关闭和拖拽页面。',
      },
      menuFixture: {
        title: '工作台菜单夹具',
        subtitle: '工作台的叶子菜单都打开这一页，用来观察 ProLayout 在大批量菜单、分列 Drawer 和页签下的表现。',
        menuTitle: '当前菜单',
        pathname: '当前路径',
      },
      guardedClose: {
        title: '关闭守卫页面',
        subtitle: '关闭这个页签前会先打开本页，并弹出确认框。点「留下」会停在这里。',
        confirmTitle: '关闭这个页签？',
        confirmContent: '「{{title}}」有关闭守卫。确定后才会关闭。',
        confirmOk: '关闭',
        confirmCancel: '留下',
      },
    },
  },
} satisfies ZbyLocalePack

export const playgroundEnUS = {
  locale: 'en-US',
  playground: {
    menu: menuEnUS,
    proLayout: {
      overview: {
        title: 'Component preview',
        subtitle: 'Open Examples from the sidebar to preview component capabilities.',
        guide: 'Open Examples from the sidebar, then switch, pin, close, and drag pages in the top tab bar.',
      },
      menuFixture: {
        title: 'Workbench menu fixture',
        subtitle: 'Every workbench leaf opens this same page so you can inspect ProLayout with a large menu, column Drawer, and tabs.',
        menuTitle: 'Menu',
        pathname: 'Path',
      },
      guardedClose: {
        title: 'Guarded page',
        subtitle: 'Closing this tab opens the page first and asks for confirmation. Cancel leaves you here.',
        confirmTitle: 'Close this tab?',
        confirmContent: '“{{title}}” has a close guard. It closes only after you confirm.',
        confirmOk: 'Close',
        confirmCancel: 'Keep',
      },
    },
  },
} satisfies ZbyLocalePack
