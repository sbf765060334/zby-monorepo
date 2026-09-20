import { AppstoreOutlined, ClearOutlined, DashboardOutlined, FileTextOutlined, HomeOutlined, LineChartOutlined, LinkOutlined } from '@ant-design/icons'
import { createLazyRouteComponent, type ProLayoutRoute, type ProLayoutTitleDescriptor } from '@zby/pro'

const ActionIconPlayground = createLazyRouteComponent(() => import('./pages/ActionIconPlayground'))
const ActionRevealPlayground = createLazyRouteComponent(() => import('./pages/ActionRevealPlayground'))
const ActionTextPlayground = createLazyRouteComponent(() => import('./pages/ActionTextPlayground'))
const CloseConfirmDemo = createLazyRouteComponent(() => import('./pages/CloseConfirmDemo'))
const QueryReencodeDemo = createLazyRouteComponent(() => import('./pages/QueryReencodeDemo'))
const ListenerThrowDemo = createLazyRouteComponent(() => import('./pages/ListenerThrowDemo'))
const PendingLockDemo = createLazyRouteComponent(() => import('./pages/PendingLockDemo'))
const InactiveReplaceDemo = createLazyRouteComponent(() => import('./pages/InactiveReplaceDemo'))
const IdbLoadRaceDemo = createLazyRouteComponent(() => import('./pages/IdbLoadRaceDemo'))
const ParallelCloseGuardsDemo = createLazyRouteComponent(
  () => import('./pages/ParallelCloseGuardsDemo'),
)
const CloseGuardDemo = createLazyRouteComponent(() => import('./pages/CloseGuardDemo'))
const DemoPage = createLazyRouteComponent(() => import('./pages/DemoPage'))
const ErrorPage = createLazyRouteComponent(() => import('./pages/ErrorPage'))
const InputNumberRangePlayground = createLazyRouteComponent(
  () => import('./pages/InputNumberRangePlayground'),
)
const ProViewManagementPlayground = createLazyRouteComponent(
  () => import('./pages/ProViewManagementPlayground'),
)
const ScrollAreaPlayground = createLazyRouteComponent(() => import('./pages/ScrollAreaPlayground'))
const SharedTabOrderList = createLazyRouteComponent(() => import('./pages/SharedTabOrders/ListPage'))
const SharedTabOrderDetail = createLazyRouteComponent(
  () => import('./pages/SharedTabOrders/DetailPage'),
)
const ProTablePlayground = createLazyRouteComponent(() => import('./pages/ProTablePlayground'))
const TablePlayground = createLazyRouteComponent(() => import('./pages/TablePlayground'))
const EmptyPage = () => null

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

const createMenuPage = (
  path: string,
  titleKey: string,
  defaultMessage: string,
): ProLayoutRoute => ({
  path,
  title: menuTitle(titleKey, defaultMessage),
  element: DemoPage,
})

export const appRouters: ProLayoutRoute[ ] = [
  {
    path: '/dashboard',
    title: menuTitle('dashboard', '首页'),
    icon: HomeOutlined,
    element: DemoPage,
  },
  {
    path: '/orders',
    title: menuTitle('orders.title', '共享页签'),
    icon: FileTextOutlined,
    tag: { text: 'Demo', color: 'warning' },
    element: SharedTabOrderList,
    routes: [
      {
        path: '/orders/:id',
        title: menuTitle('orders.detail', '订单详情'),
        ignore: true,
        element: SharedTabOrderDetail,
      },
    ],
  },
  {
    path: '/workbench',
    title: menuTitle('workbench.title', '工作台'),
    icon: DashboardOutlined,
    routes: [
      {
        path: '/records/:id',
        title: menuTitle('workbench.records', '记录详情'),
        supportMultipleTabs: true,
        element: DemoPage,
      },
      {
        path: '/workbench/dirty',
        title: menuTitle('workbench.dirty', '关闭门禁'),
        tag: { text: 'Demo', color: 'warning' },
        element: CloseGuardDemo,
      },
      {
        path: '/workbench/close-confirm',
        title: menuTitle('workbench.closeConfirm', '关闭确认'),
        tag: { text: 'Demo', color: 'warning' },
        element: CloseConfirmDemo,
      },
      {
        path: '/workbench/query-reencode',
        title: menuTitle('workbench.queryReencode', '查询串重编码'),
        tag: { text: 'Demo', color: 'warning' },
        element: QueryReencodeDemo,
      },
      {
        path: '/workbench/listener-throw',
        title: menuTitle('workbench.listenerThrow', 'listener 抛错'),
        tag: { text: 'Demo', color: 'warning' },
        element: ListenerThrowDemo,
      },
      {
        path: '/workbench/pending-lock',
        title: menuTitle('workbench.pendingLock', '关闭锁和 pending'),
        tag: { text: 'Demo', color: 'warning' },
        element: PendingLockDemo,
      },
      {
        path: '/workbench/inactive-replace',
        title: menuTitle('workbench.inactiveReplace', '非活动页组合关闭'),
        tag: { text: 'Demo', color: 'warning' },
        element: InactiveReplaceDemo,
      },
      {
        path: '/workbench/idb-load-race',
        title: menuTitle('workbench.idbLoadRace', 'IndexedDB 读写排队'),
        tag: { text: 'Demo', color: 'warning' },
        element: IdbLoadRaceDemo,
      },
      {
        path: '/workbench/parallel-close-guards',
        title: menuTitle('workbench.parallelCloseGuards', '关闭守卫串行'),
        tag: { text: 'Demo', color: 'warning' },
        element: ParallelCloseGuardsDemo,
      },
      {
        path: '/workbench/content-container',
        title: menuTitle('workbench.contentContainer', '内容区布局'),
        tag: { text: 'New', color: 'success' },
        element: DemoPage,
      },
      {
        path: '/workbench/hidden',
        title: menuTitle('workbench.hidden', '隐藏菜单'),
        ignore: true,
        element: EmptyPage,
      },
      {
        path: '/workbench/wip',
        title: menuTitle('workbench.wip', '开发中页面'),
        // true 表示使用 ProLayout 内置的多语言“暂未开放”提示。
        prompt: true,
      },
      {
        path: '/workbench/enterprise-report',
        title: menuTitle('workbench.enterpriseReport', '高级报表'),
        // tag.text 和 prompt 与 title 共用一套描述符规则，切换语言时一起更新。
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
      createMenuPage('/workbench/direct-shortcut', 'workbench.directShortcut', '二级直达菜单'),
      createMenuPage('/workbench/direct-risk', 'workbench.directRisk', '风险待办'),
      {
        path: '/workbench/customer',
        title: menuTitle('workbench.customer.title', '三级菜单组'),
        routes: [
          createMenuPage('/workbench/customer/profile', 'workbench.customer.profile', '客户画像'),
          createMenuPage('/workbench/customer/segment', 'workbench.customer.segment', '客群分层'),
          createMenuPage('/workbench/customer/reach', 'workbench.customer.reach', '触达计划'),
          createMenuPage(
            '/workbench/customer/retention',
            'workbench.customer.retention',
            '复购留存',
          ),
        ],
      },
      {
        path: '/workbench/product',
        title: menuTitle('workbench.product.title', '商品中心'),
        routes: [
          createMenuPage('/workbench/product/list', 'workbench.product.list', '商品列表'),
          createMenuPage('/workbench/product/category', 'workbench.product.category', '类目管理'),
          createMenuPage('/workbench/product/price', 'workbench.product.price', '价格策略'),
          createMenuPage('/workbench/product/stock', 'workbench.product.stock', '库存预警'),
        ],
      },
      {
        path: '/workbench/material',
        title: menuTitle('workbench.material.title', '四级菜单组'),
        routes: [
          {
            path: '/workbench/material/assets',
            title: menuTitle('workbench.material.assets.title', '素材资产'),
            routes: [
              {
                path: '/workbench/material/assets/voices',
                title: menuTitle('workbench.material.assets.voices', '语音素材'),
                tag: { text: 'New', color: 'success' },
                element: DemoPage,
              },
              createMenuPage(
                '/workbench/material/assets/images',
                'workbench.material.assets.images',
                '图片素材图片素材图片素材',
              ),
              createMenuPage(
                '/workbench/material/assets/videos',
                'workbench.material.assets.videos',
                '视频素材',
              ),
              createMenuPage(
                '/workbench/material/assets/copywriting',
                'workbench.material.assets.copywriting',
                '文案素材',
              ),
            ],
          },
          {
            path: '/workbench/material/audit',
            title: menuTitle('workbench.material.audit.title', '素材审核'),
            routes: [
              createMenuPage(
                '/workbench/material/audit/pending',
                'workbench.material.audit.pending',
                '待审核',
              ),
              createMenuPage(
                '/workbench/material/audit/rejected',
                'workbench.material.audit.rejected',
                '驳回记录',
              ),
            ],
          },
        ],
      },
      {
        path: '/workbench/campaign',
        title: menuTitle('workbench.campaign.title', '广告投放'),
        routes: [
          {
            path: '/workbench/campaign/manage',
            title: menuTitle('workbench.campaign.manage.title', '活动管理'),
            routes: [
              createMenuPage(
                '/workbench/campaign/manage/list',
                'workbench.campaign.manage.list',
                '活动列表',
              ),
              createMenuPage(
                '/workbench/campaign/manage/budget',
                'workbench.campaign.manage.budget',
                '预算调整',
              ),
              createMenuPage(
                '/workbench/campaign/manage/creative',
                'workbench.campaign.manage.creative',
                '创意绑定',
              ),
            ],
          },
          createMenuPage('/workbench/campaign/strategy', 'workbench.campaign.strategy', '投放策略'),
          createMenuPage(
            '/workbench/campaign/diagnosis',
            'workbench.campaign.diagnosis',
            '投放诊断',
          ),
        ],
      },
      {
        path: '/workbench/data',
        title: menuTitle('workbench.data.title', '数据诊断'),
        routes: [
          createMenuPage('/workbench/data/realtime', 'workbench.data.realtime', '实时指标'),
          createMenuPage('/workbench/data/funnel', 'workbench.data.funnel', '转化漏斗'),
          createMenuPage('/workbench/data/compare', 'workbench.data.compare', '多维对比'),
          createMenuPage('/workbench/data/export', 'workbench.data.export', '数据导出'),
        ],
      },
      {
        path: '/workbench/delivery',
        title: menuTitle('workbench.delivery.title', '履约管理'),
        routes: [
          createMenuPage('/workbench/delivery/order', 'workbench.delivery.order', '订单履约'),
          createMenuPage(
            '/workbench/delivery/logistics',
            'workbench.delivery.logistics',
            '物流跟踪',
          ),
          createMenuPage(
            '/workbench/delivery/exception',
            'workbench.delivery.exception',
            '异常处理',
          ),
        ],
      },
      {
        path: '/workbench/finance',
        title: menuTitle('workbench.finance.title', '财务结算'),
        routes: [
          createMenuPage('/workbench/finance/bill', 'workbench.finance.bill', '账单管理'),
          createMenuPage('/workbench/finance/invoice', 'workbench.finance.invoice', '发票管理'),
          createMenuPage('/workbench/finance/reconcile', 'workbench.finance.reconcile', '对账中心'),
          createMenuPage('/workbench/finance/refund', 'workbench.finance.refund', '退款记录'),
        ],
      },
      {
        path: '/workbench/permission',
        title: menuTitle('workbench.permission.title', '权限配置'),
        routes: [
          createMenuPage('/workbench/permission/role', 'workbench.permission.role', '角色管理'),
          createMenuPage('/workbench/permission/member', 'workbench.permission.member', '成员管理'),
          createMenuPage('/workbench/permission/audit', 'workbench.permission.audit', '权限审计'),
        ],
      },
      {
        path: '/workbench/tools',
        title: menuTitle('workbench.tools.title', '系统工具'),
        routes: [
          createMenuPage('/workbench/tools/import', 'workbench.tools.import', '批量导入'),
          createMenuPage('/workbench/tools/task', 'workbench.tools.task', '任务中心'),
          createMenuPage('/workbench/tools/webhook', 'workbench.tools.webhook', '回调配置'),
          createMenuPage('/workbench/tools/log', 'workbench.tools.log', '操作日志'),
        ],
      },
      {
        path: '/workbench/automation',
        title: menuTitle('workbench.automation.title', '自动化任务'),
        routes: [
          createMenuPage('/workbench/automation/rules', 'workbench.automation.rules', '规则编排'),
          createMenuPage(
            '/workbench/automation/schedule',
            'workbench.automation.schedule',
            '定时任务',
          ),
          createMenuPage(
            '/workbench/automation/history',
            'workbench.automation.history',
            '执行历史',
          ),
        ],
      },
      {
        path: '/workbench/quality',
        title: menuTitle('workbench.quality.title', '质检中心'),
        routes: [
          createMenuPage('/workbench/quality/sample', 'workbench.quality.sample', '抽检样本'),
          createMenuPage('/workbench/quality/rule', 'workbench.quality.rule', '质检规则'),
          createMenuPage('/workbench/quality/report', 'workbench.quality.report', '质检报告'),
        ],
      },
      {
        path: '/workbench/large-menu-background',
        title: menuTitle('workbench.largeBackground.title', '大批量菜单组 - 后台'),
        routes: [
          createMenuPage(
            '/workbench/large-menu-background/ticket',
            'workbench.largeBackground.ticket',
            '工单列表',
          ),
          createMenuPage(
            '/workbench/large-menu-background/knowledge',
            'workbench.largeBackground.knowledge',
            '知识库',
          ),
          // 这批菜单只用来撑满分列布局，标题相同因此共用同一个 key。
          createMenuPage('/workbench/large-menu-background/sla1', 'workbench.largeBackground.sla', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla2', 'workbench.largeBackground.sla', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla3', 'workbench.largeBackground.sla', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla4', 'workbench.largeBackground.sla', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla5', 'workbench.largeBackground.sla', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla6', 'workbench.largeBackground.sla', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla7', 'workbench.largeBackground.sla', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla8', 'workbench.largeBackground.sla', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla9', 'workbench.largeBackground.sla', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla10', 'workbench.largeBackground.sla', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla11', 'workbench.largeBackground.sla', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla12', 'workbench.largeBackground.sla', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla13', 'workbench.largeBackground.sla', 'SLA 配置'),
        ],
      },
      {
        path: '/workbench/large-menu-ops',
        title: menuTitle('workbench.largeOps.title', '大批量菜单组 - 运营'),
        routes: [
          createMenuPage(
            '/workbench/large-menu-ops/calendar',
            'workbench.largeOps.calendar',
            '运营日历',
          ),
          createMenuPage('/workbench/large-menu-ops/event', 'workbench.largeOps.event', '事件中心'),
          createMenuPage(
            '/workbench/large-menu-ops/review',
            'workbench.largeOps.review',
            '复盘记录',
          ),
        ],
      },
      {
        path: '/workbench/large-menu-service',
        title: menuTitle('workbench.largeService.title', '大批量菜单组 - 服务'),
        routes: [
          createMenuPage(
            '/workbench/large-menu-service/ticket',
            'workbench.largeService.ticket',
            '工单列表',
          ),
          createMenuPage(
            '/workbench/large-menu-service/knowledge',
            'workbench.largeService.knowledge',
            '知识库',
          ),
          createMenuPage(
            '/workbench/large-menu-service/sla',
            'workbench.largeService.sla',
            'SLA 配置',
          ),
        ],
      },
    ],
  },
  {
    path: '/reports',
    title: menuTitle('reports.title', '报表'),
    icon: LineChartOutlined,
    routes: [
      {
        path: '/reports/overview',
        title: menuTitle('reports.overview', '报表总览'),
        element: DemoPage,
      },
      {
        path: '/reports/live',
        title: menuTitle('reports.live', '实时监控'),
        tag: { text: 'Beta', color: 'processing' },
        element: DemoPage,
      },
    ],
  },
  {
    path: '/demo',
    title: menuTitle('demo.title', '示例页面'),
    icon: ClearOutlined,
    routes: [
      {
        path: '/demo/ui',
        title: menuTitle('demo.ui.title', 'UI示例组'),
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
      {
        path: '/demo/error',
        title: menuTitle('demo.error.title', '错误实例组'),
        routes: [
          {
            path: '/demo/error/404',
            title: menuTitle('demo.error.notFound', '404页面'),
            element: ErrorPage,
          },
        ],
      },
    ],

  },

]
