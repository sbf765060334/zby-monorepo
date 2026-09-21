import { AppstoreOutlined, ClearOutlined, DashboardOutlined, HomeOutlined, LinkOutlined } from '@ant-design/icons'
import { lazyPage, type ProLayoutRoute, type ProLayoutTitleDescriptor } from '@zby/pro'

const ActionIconPlayground = lazyPage(() => import('./pages/ActionIconPlayground'))
const ActionRevealPlayground = lazyPage(() => import('./pages/ActionRevealPlayground'))
const ActionTextPlayground = lazyPage(() => import('./pages/ActionTextPlayground'))
const DemoPage = lazyPage(() => import('./pages/DemoPage'))
const InputNumberRangePlayground = lazyPage(
  () => import('./pages/InputNumberRangePlayground'),
)
const ProViewManagementPlayground = lazyPage(
  () => import('./pages/ProViewManagementPlayground'),
)
const ScrollAreaPlayground = lazyPage(() => import('./pages/ScrollAreaPlayground'))
const ProTablePlayground = lazyPage(() => import('./pages/ProTablePlayground'))
const TablePlayground = lazyPage(() => import('./pages/TablePlayground'))
const WorkbenchMenuFixture = lazyPage(
  () => import('./pages/WorkbenchMenuFixture'),
)

/**
 * 路由标题统一写成 `{ key, defaultMessage }` 描述符，不写成品文案。
 *
 * 菜单、页签、面包屑和全局搜索都会在渲染时才把 key 翻译成当前语言，因此切换语言
 * 不需要重建 RouterCore，已经打开的页签也会同步更新。
 *
 * defaultMessage 只在语言包缺失该 key 时才会用到，正常渲染不经过它；写在这里是为了
 * 能直接在本文件里用中文定位路由，顺带让漏配 key 时显示中文而不是裸 key。
 */
const menuTitle = (key: string, defaultMessage: string): ProLayoutTitleDescriptor => ({
  key: `playground.menu.${key}`,
  defaultMessage,
})

/** 工作台叶子菜单共用同一页面，用来观察 ProLayout 大批量菜单和分列 Drawer。 */
const createMenuPage = (
  path: string,
  titleKey: string,
  defaultMessage: string,
): ProLayoutRoute => ({
  path,
  title: menuTitle(titleKey, defaultMessage),
  element: WorkbenchMenuFixture,
})

const createMenuGroup = (
  path: string,
  titleKey: string,
  defaultMessage: string,
  routes: ProLayoutRoute[],
): ProLayoutRoute => ({
  path,
  title: menuTitle(titleKey, defaultMessage),
  routes,
})

const createMenuLeaves = (
  items: Array<[path: string, titleKey: string, defaultMessage: string]>,
): ProLayoutRoute[] => items.map(([path, titleKey, defaultMessage]) => (
  createMenuPage(path, titleKey, defaultMessage)
))

const workbenchRoutes: ProLayoutRoute[] = [
  {
    path: '/workbench/wip',
    title: menuTitle('workbench.wip', '开发中页面'),
    prompt: true,
  },
  {
    path: '/workbench/enterprise-report',
    title: menuTitle('workbench.enterpriseReport', '高级报表'),
    tag: { text: menuTitle('workbench.enterpriseReportTag', '企业版'), color: 'gold' },
    prompt: {
      ...menuTitle(
        'workbench.enterpriseReportPrompt',
        '高级报表属于企业版功能，请联系 {{contact}} 开通。',
      ),
      values: { contact: 'support@zby.dev' },
    },
  },
  {
    path: 'https://www.baidu.com',
    title: menuTitle('workbench.external', '外部系统'),
    _blank: true,
    target: '_blank',
    icon: LinkOutlined,
  },
  ...createMenuLeaves([
    ['/workbench/direct-shortcut', 'workbench.directShortcut', '二级直达菜单'],
    ['/workbench/direct-risk', 'workbench.directRisk', '风险待办'],
  ]),
  createMenuGroup('/workbench/customer', 'workbench.customer.title', '三级菜单组', createMenuLeaves([
    ['/workbench/customer/profile', 'workbench.customer.profile', '客户画像'],
    ['/workbench/customer/segment', 'workbench.customer.segment', '客群分层'],
    ['/workbench/customer/reach', 'workbench.customer.reach', '触达计划'],
    ['/workbench/customer/retention', 'workbench.customer.retention', '复购留存'],
  ])),
  createMenuGroup('/workbench/product', 'workbench.product.title', '商品中心', createMenuLeaves([
    ['/workbench/product/list', 'workbench.product.list', '商品列表'],
    ['/workbench/product/category', 'workbench.product.category', '类目管理'],
    ['/workbench/product/price', 'workbench.product.price', '价格策略'],
    ['/workbench/product/stock', 'workbench.product.stock', '库存预警'],
  ])),
  createMenuGroup('/workbench/material', 'workbench.material.title', '四级菜单组', [
    createMenuGroup('/workbench/material/assets', 'workbench.material.assets.title', '素材资产', [
      {
        path: '/workbench/material/assets/voices',
        title: menuTitle('workbench.material.assets.voices', '语音素材'),
        tag: { text: 'New', color: 'success' },
        element: WorkbenchMenuFixture,
      },
      createMenuPage(
        '/workbench/material/assets/images',
        'workbench.material.assets.images',
        '图片素材图片素材图片素材',
      ),
      ...createMenuLeaves([
        ['/workbench/material/assets/videos', 'workbench.material.assets.videos', '视频素材'],
        ['/workbench/material/assets/copywriting', 'workbench.material.assets.copywriting', '文案素材'],
      ]),
    ]),
    createMenuGroup(
      '/workbench/material/audit',
      'workbench.material.audit.title',
      '素材审核',
      createMenuLeaves([
        ['/workbench/material/audit/pending', 'workbench.material.audit.pending', '待审核'],
        ['/workbench/material/audit/rejected', 'workbench.material.audit.rejected', '驳回记录'],
      ]),
    ),
  ]),
  createMenuGroup('/workbench/campaign', 'workbench.campaign.title', '广告投放', [
    createMenuGroup(
      '/workbench/campaign/manage',
      'workbench.campaign.manage.title',
      '活动管理',
      createMenuLeaves([
        ['/workbench/campaign/manage/list', 'workbench.campaign.manage.list', '活动列表'],
        ['/workbench/campaign/manage/budget', 'workbench.campaign.manage.budget', '预算调整'],
        ['/workbench/campaign/manage/creative', 'workbench.campaign.manage.creative', '创意绑定'],
      ]),
    ),
    ...createMenuLeaves([
      ['/workbench/campaign/strategy', 'workbench.campaign.strategy', '投放策略'],
      ['/workbench/campaign/diagnosis', 'workbench.campaign.diagnosis', '投放诊断'],
    ]),
  ]),
  createMenuGroup('/workbench/data', 'workbench.data.title', '数据诊断', createMenuLeaves([
    ['/workbench/data/realtime', 'workbench.data.realtime', '实时指标'],
    ['/workbench/data/funnel', 'workbench.data.funnel', '转化漏斗'],
    ['/workbench/data/compare', 'workbench.data.compare', '多维对比'],
    ['/workbench/data/export', 'workbench.data.export', '数据导出'],
  ])),
  createMenuGroup('/workbench/delivery', 'workbench.delivery.title', '履约管理', createMenuLeaves([
    ['/workbench/delivery/order', 'workbench.delivery.order', '订单履约'],
    ['/workbench/delivery/logistics', 'workbench.delivery.logistics', '物流跟踪'],
    ['/workbench/delivery/exception', 'workbench.delivery.exception', '异常处理'],
  ])),
  createMenuGroup('/workbench/finance', 'workbench.finance.title', '财务结算', createMenuLeaves([
    ['/workbench/finance/bill', 'workbench.finance.bill', '账单管理'],
    ['/workbench/finance/invoice', 'workbench.finance.invoice', '发票管理'],
    ['/workbench/finance/reconcile', 'workbench.finance.reconcile', '对账中心'],
    ['/workbench/finance/refund', 'workbench.finance.refund', '退款记录'],
  ])),
  createMenuGroup('/workbench/permission', 'workbench.permission.title', '权限配置', createMenuLeaves([
    ['/workbench/permission/role', 'workbench.permission.role', '角色管理'],
    ['/workbench/permission/member', 'workbench.permission.member', '成员管理'],
    ['/workbench/permission/audit', 'workbench.permission.audit', '权限审计'],
  ])),
  createMenuGroup('/workbench/tools', 'workbench.tools.title', '系统工具', createMenuLeaves([
    ['/workbench/tools/import', 'workbench.tools.import', '批量导入'],
    ['/workbench/tools/task', 'workbench.tools.task', '任务中心'],
    ['/workbench/tools/webhook', 'workbench.tools.webhook', '回调配置'],
    ['/workbench/tools/log', 'workbench.tools.log', '操作日志'],
  ])),
  createMenuGroup('/workbench/automation', 'workbench.automation.title', '自动化任务', createMenuLeaves([
    ['/workbench/automation/rules', 'workbench.automation.rules', '规则编排'],
    ['/workbench/automation/schedule', 'workbench.automation.schedule', '定时任务'],
    ['/workbench/automation/history', 'workbench.automation.history', '执行历史'],
  ])),
  createMenuGroup('/workbench/quality', 'workbench.quality.title', '质检中心', createMenuLeaves([
    ['/workbench/quality/sample', 'workbench.quality.sample', '抽检样本'],
    ['/workbench/quality/rule', 'workbench.quality.rule', '质检规则'],
    ['/workbench/quality/report', 'workbench.quality.report', '质检报告'],
  ])),
  createMenuGroup(
    '/workbench/large-menu-background',
    'workbench.largeBackground.title',
    '大批量菜单组 - 后台',
    createMenuLeaves([
      ['/workbench/large-menu-background/ticket', 'workbench.largeBackground.ticket', '工单列表'],
      ['/workbench/large-menu-background/knowledge', 'workbench.largeBackground.knowledge', '知识库'],
      ['/workbench/large-menu-background/shifts', 'workbench.largeBackground.shifts', '值班排班'],
      ['/workbench/large-menu-background/alerts', 'workbench.largeBackground.alerts', '告警规则'],
      ['/workbench/large-menu-background/audit', 'workbench.largeBackground.audit', '审计日志'],
      ['/workbench/large-menu-background/dict', 'workbench.largeBackground.dict', '字典配置'],
      ['/workbench/large-menu-background/templates', 'workbench.largeBackground.templates', '消息模板'],
      ['/workbench/large-menu-background/files', 'workbench.largeBackground.files', '附件管理'],
      ['/workbench/large-menu-background/throttle', 'workbench.largeBackground.throttle', '接口限流'],
      ['/workbench/large-menu-background/cache', 'workbench.largeBackground.cache', '缓存清理'],
      ['/workbench/large-menu-background/canary', 'workbench.largeBackground.canary', '灰度发布'],
      ['/workbench/large-menu-background/backup', 'workbench.largeBackground.backup', '备份恢复'],
      ['/workbench/large-menu-background/archive', 'workbench.largeBackground.archive', '数据归档'],
      ['/workbench/large-menu-background/freeze', 'workbench.largeBackground.freeze', '账号冻结'],
      ['/workbench/large-menu-background/manuals', 'workbench.largeBackground.manuals', '操作手册'],
    ]),
  ),
  createMenuGroup(
    '/workbench/large-menu-ops',
    'workbench.largeOps.title',
    '大批量菜单组 - 运营',
    createMenuLeaves([
      ['/workbench/large-menu-ops/calendar', 'workbench.largeOps.calendar', '运营日历'],
      ['/workbench/large-menu-ops/event', 'workbench.largeOps.event', '事件中心'],
      ['/workbench/large-menu-ops/review', 'workbench.largeOps.review', '复盘记录'],
    ]),
  ),
  createMenuGroup(
    '/workbench/large-menu-service',
    'workbench.largeService.title',
    '大批量菜单组 - 服务',
    createMenuLeaves([
      ['/workbench/large-menu-service/ticket', 'workbench.largeService.ticket', '工单列表'],
      ['/workbench/large-menu-service/knowledge', 'workbench.largeService.knowledge', '知识库'],
      ['/workbench/large-menu-service/csat', 'workbench.largeService.csat', '满意度'],
    ]),
  ),
]

export const appRouters: ProLayoutRoute[] = [
  {
    path: '/dashboard',
    title: menuTitle('dashboard', '首页'),
    icon: HomeOutlined,
    element: DemoPage,
  },
  {
    path: '/workbench',
    title: menuTitle('workbench.title', '工作台'),
    icon: DashboardOutlined,
    routes: workbenchRoutes,
  },
  {
    path: '/demo',
    title: menuTitle('demo.title', '示例页面'),
    icon: ClearOutlined,
    routes: [
      {
        path: '/demo/ui/action-icon',
        title: menuTitle('demo.ui.actionIcon', '动作图标'),
        element: ActionIconPlayground,
      },
      {
        path: '/demo/ui/action-reveal',
        title: menuTitle('demo.ui.actionReveal', '动作展开'),
        element: ActionRevealPlayground,
      },
      {
        path: '/demo/ui/action-text',
        title: menuTitle('demo.ui.actionText', '动作文本'),
        element: ActionTextPlayground,
      },
      {
        path: '/demo/ui/input-range-input',
        title: menuTitle('demo.ui.inputRange', '数字范围'),
        element: InputNumberRangePlayground,
      },
      {
        path: '/demo/ui/scroll-area',
        title: menuTitle('demo.ui.scrollArea', '滚动组件'),
        element: ScrollAreaPlayground,
      },
      {
        path: '/demo/ui/table',
        title: menuTitle('demo.ui.table', '表格'),
        element: TablePlayground,
      },
      {
        path: '/demo/ui/pro-table',
        title: menuTitle('demo.ui.proTable', '高级表格'),
        element: ProTablePlayground,
      },
      {
        path: '/demo/ui/pro-view-management',
        title: menuTitle('demo.ui.proViewManagement', '视图管理'),
        icon: AppstoreOutlined,
        element: ProViewManagementPlayground,
      },
    ],
  },
]
