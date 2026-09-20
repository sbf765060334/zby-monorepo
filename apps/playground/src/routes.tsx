import { AppstoreOutlined, ClearOutlined, DashboardOutlined, FileTextOutlined, HomeOutlined, LineChartOutlined, LinkOutlined } from '@ant-design/icons'
import { createLazyRouteComponent, type ProLayoutRoute } from '@zby/pro'

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
 * 路由标题只写语言包 key，不写成品文案。
 *
 * 菜单、页签、面包屑和全局搜索都会在渲染时才把 key 翻译成当前语言，因此切换语言
 * 不需要重建 RouterCore，已经打开的页签也会同步更新。key 漏配时会原样显示成
 * `playground.menu.xxx`，在界面上一眼可见。
 */
const menuTitle = (key: string) => `playground.menu.${key}`

const createMenuPage = (path: string, titleKey: string): ProLayoutRoute => ({
  path,
  title: menuTitle(titleKey),
  element: DemoPage,
})

export const appRouters: ProLayoutRoute[ ] = [
  {
    path: '/dashboard',
    // 对象形式：语言包缺失时回退到 defaultMessage，而不是显示裸 key。
    title: { key: menuTitle('dashboard'), defaultMessage: '首页' },
    icon: HomeOutlined,
    element: DemoPage,
  },
  {
    path: '/orders',
    title: menuTitle('orders.title'),
    icon: FileTextOutlined,
    tag: { text: 'Demo', color: 'warning' },
    element: SharedTabOrderList,
    routes: [
      {
        path: '/orders/:id',
        title: menuTitle('orders.detail'),
        ignore: true,
        element: SharedTabOrderDetail,
      },
    ],
  },
  {
    path: '/workbench',
    title: menuTitle('workbench.title'),
    icon: DashboardOutlined,
    routes: [
      {
        path: '/records/:id',
        title: menuTitle('workbench.records'),
        supportMultipleTabs: true,
        element: DemoPage,
      },
      {
        path: '/workbench/dirty',
        title: menuTitle('workbench.dirty'),
        tag: { text: 'Demo', color: 'warning' },
        element: CloseGuardDemo,
      },
      {
        path: '/workbench/close-confirm',
        title: menuTitle('workbench.closeConfirm'),
        tag: { text: 'Demo', color: 'warning' },
        element: CloseConfirmDemo,
      },
      {
        path: '/workbench/query-reencode',
        title: menuTitle('workbench.queryReencode'),
        tag: { text: 'Demo', color: 'warning' },
        element: QueryReencodeDemo,
      },
      {
        path: '/workbench/listener-throw',
        title: menuTitle('workbench.listenerThrow'),
        tag: { text: 'Demo', color: 'warning' },
        element: ListenerThrowDemo,
      },
      {
        path: '/workbench/pending-lock',
        title: menuTitle('workbench.pendingLock'),
        tag: { text: 'Demo', color: 'warning' },
        element: PendingLockDemo,
      },
      {
        path: '/workbench/inactive-replace',
        title: menuTitle('workbench.inactiveReplace'),
        tag: { text: 'Demo', color: 'warning' },
        element: InactiveReplaceDemo,
      },
      {
        path: '/workbench/idb-load-race',
        title: menuTitle('workbench.idbLoadRace'),
        tag: { text: 'Demo', color: 'warning' },
        element: IdbLoadRaceDemo,
      },
      {
        path: '/workbench/parallel-close-guards',
        title: menuTitle('workbench.parallelCloseGuards'),
        tag: { text: 'Demo', color: 'warning' },
        element: ParallelCloseGuardsDemo,
      },
      {
        path: '/workbench/content-container',
        title: menuTitle('workbench.contentContainer'),
        tag: { text: 'New', color: 'success' },
        element: DemoPage,
      },
      {
        path: '/workbench/hidden',
        title: menuTitle('workbench.hidden'),
        ignore: true,
        element: EmptyPage,
      },
      {
        path: '/workbench/wip',
        title: menuTitle('workbench.wip'),
        // true 表示使用 ProLayout 内置的多语言“暂未开放”提示。
        prompt: true,
      },
      {
        path: '/workbench/enterprise-report',
        title: menuTitle('workbench.enterpriseReport'),
        // tag.text 和 prompt 与 title 共用一套描述符规则，切换语言时一起更新。
        tag: { text: menuTitle('workbench.enterpriseReportTag'), color: 'gold' },
        prompt: {
          key: menuTitle('workbench.enterpriseReportPrompt'),
          values: { contact: 'support@zby.dev' },
        },
      },
      {
        path: 'https://www.baidu.com',
        title: menuTitle('workbench.external'),
        _blank: true,
        target: '_blank',
        icon: LinkOutlined,
      },
      createMenuPage('/workbench/direct-shortcut', 'workbench.directShortcut'),
      createMenuPage('/workbench/direct-risk', 'workbench.directRisk'),
      {
        path: '/workbench/customer',
        title: menuTitle('workbench.customer.title'),
        routes: [
          createMenuPage('/workbench/customer/profile', 'workbench.customer.profile'),
          createMenuPage('/workbench/customer/segment', 'workbench.customer.segment'),
          createMenuPage('/workbench/customer/reach', 'workbench.customer.reach'),
          createMenuPage('/workbench/customer/retention', 'workbench.customer.retention'),
        ],
      },
      {
        path: '/workbench/product',
        title: menuTitle('workbench.product.title'),
        routes: [
          createMenuPage('/workbench/product/list', 'workbench.product.list'),
          createMenuPage('/workbench/product/category', 'workbench.product.category'),
          createMenuPage('/workbench/product/price', 'workbench.product.price'),
          createMenuPage('/workbench/product/stock', 'workbench.product.stock'),
        ],
      },
      {
        path: '/workbench/material',
        title: menuTitle('workbench.material.title'),
        routes: [
          {
            path: '/workbench/material/assets',
            title: menuTitle('workbench.material.assets.title'),
            routes: [
              {
                path: '/workbench/material/assets/voices',
                title: menuTitle('workbench.material.assets.voices'),
                tag: { text: 'New', color: 'success' },
                element: DemoPage,
              },
              createMenuPage(
                '/workbench/material/assets/images',
                'workbench.material.assets.images',
              ),
              createMenuPage(
                '/workbench/material/assets/videos',
                'workbench.material.assets.videos',
              ),
              createMenuPage(
                '/workbench/material/assets/copywriting',
                'workbench.material.assets.copywriting',
              ),
            ],
          },
          {
            path: '/workbench/material/audit',
            title: menuTitle('workbench.material.audit.title'),
            routes: [
              createMenuPage(
                '/workbench/material/audit/pending',
                'workbench.material.audit.pending',
              ),
              createMenuPage(
                '/workbench/material/audit/rejected',
                'workbench.material.audit.rejected',
              ),
            ],
          },
        ],
      },
      {
        path: '/workbench/campaign',
        title: menuTitle('workbench.campaign.title'),
        routes: [
          {
            path: '/workbench/campaign/manage',
            title: menuTitle('workbench.campaign.manage.title'),
            routes: [
              createMenuPage('/workbench/campaign/manage/list', 'workbench.campaign.manage.list'),
              createMenuPage(
                '/workbench/campaign/manage/budget',
                'workbench.campaign.manage.budget',
              ),
              createMenuPage(
                '/workbench/campaign/manage/creative',
                'workbench.campaign.manage.creative',
              ),
            ],
          },
          createMenuPage('/workbench/campaign/strategy', 'workbench.campaign.strategy'),
          createMenuPage('/workbench/campaign/diagnosis', 'workbench.campaign.diagnosis'),
        ],
      },
      {
        path: '/workbench/data',
        title: menuTitle('workbench.data.title'),
        routes: [
          createMenuPage('/workbench/data/realtime', 'workbench.data.realtime'),
          createMenuPage('/workbench/data/funnel', 'workbench.data.funnel'),
          createMenuPage('/workbench/data/compare', 'workbench.data.compare'),
          createMenuPage('/workbench/data/export', 'workbench.data.export'),
        ],
      },
      {
        path: '/workbench/delivery',
        title: menuTitle('workbench.delivery.title'),
        routes: [
          createMenuPage('/workbench/delivery/order', 'workbench.delivery.order'),
          createMenuPage('/workbench/delivery/logistics', 'workbench.delivery.logistics'),
          createMenuPage('/workbench/delivery/exception', 'workbench.delivery.exception'),
        ],
      },
      {
        path: '/workbench/finance',
        title: menuTitle('workbench.finance.title'),
        routes: [
          createMenuPage('/workbench/finance/bill', 'workbench.finance.bill'),
          createMenuPage('/workbench/finance/invoice', 'workbench.finance.invoice'),
          createMenuPage('/workbench/finance/reconcile', 'workbench.finance.reconcile'),
          createMenuPage('/workbench/finance/refund', 'workbench.finance.refund'),
        ],
      },
      {
        path: '/workbench/permission',
        title: menuTitle('workbench.permission.title'),
        routes: [
          createMenuPage('/workbench/permission/role', 'workbench.permission.role'),
          createMenuPage('/workbench/permission/member', 'workbench.permission.member'),
          createMenuPage('/workbench/permission/audit', 'workbench.permission.audit'),
        ],
      },
      {
        path: '/workbench/tools',
        title: menuTitle('workbench.tools.title'),
        routes: [
          createMenuPage('/workbench/tools/import', 'workbench.tools.import'),
          createMenuPage('/workbench/tools/task', 'workbench.tools.task'),
          createMenuPage('/workbench/tools/webhook', 'workbench.tools.webhook'),
          createMenuPage('/workbench/tools/log', 'workbench.tools.log'),
        ],
      },
      {
        path: '/workbench/automation',
        title: menuTitle('workbench.automation.title'),
        routes: [
          createMenuPage('/workbench/automation/rules', 'workbench.automation.rules'),
          createMenuPage('/workbench/automation/schedule', 'workbench.automation.schedule'),
          createMenuPage('/workbench/automation/history', 'workbench.automation.history'),
        ],
      },
      {
        path: '/workbench/quality',
        title: menuTitle('workbench.quality.title'),
        routes: [
          createMenuPage('/workbench/quality/sample', 'workbench.quality.sample'),
          createMenuPage('/workbench/quality/rule', 'workbench.quality.rule'),
          createMenuPage('/workbench/quality/report', 'workbench.quality.report'),
        ],
      },
      {
        path: '/workbench/large-menu-background',
        title: menuTitle('workbench.largeBackground.title'),
        routes: [
          createMenuPage(
            '/workbench/large-menu-background/ticket',
            'workbench.largeBackground.ticket',
          ),
          createMenuPage(
            '/workbench/large-menu-background/knowledge',
            'workbench.largeBackground.knowledge',
          ),
          // 这批菜单只用来撑满分列布局，标题相同因此共用同一个 key。
          createMenuPage('/workbench/large-menu-background/sla1', 'workbench.largeBackground.sla'),
          createMenuPage('/workbench/large-menu-background/sla2', 'workbench.largeBackground.sla'),
          createMenuPage('/workbench/large-menu-background/sla3', 'workbench.largeBackground.sla'),
          createMenuPage('/workbench/large-menu-background/sla4', 'workbench.largeBackground.sla'),
          createMenuPage('/workbench/large-menu-background/sla5', 'workbench.largeBackground.sla'),
          createMenuPage('/workbench/large-menu-background/sla6', 'workbench.largeBackground.sla'),
          createMenuPage('/workbench/large-menu-background/sla7', 'workbench.largeBackground.sla'),
          createMenuPage('/workbench/large-menu-background/sla8', 'workbench.largeBackground.sla'),
          createMenuPage('/workbench/large-menu-background/sla9', 'workbench.largeBackground.sla'),
          createMenuPage('/workbench/large-menu-background/sla10', 'workbench.largeBackground.sla'),
          createMenuPage('/workbench/large-menu-background/sla11', 'workbench.largeBackground.sla'),
          createMenuPage('/workbench/large-menu-background/sla12', 'workbench.largeBackground.sla'),
          createMenuPage('/workbench/large-menu-background/sla13', 'workbench.largeBackground.sla'),
        ],
      },
      {
        path: '/workbench/large-menu-ops',
        title: menuTitle('workbench.largeOps.title'),
        routes: [
          createMenuPage('/workbench/large-menu-ops/calendar', 'workbench.largeOps.calendar'),
          createMenuPage('/workbench/large-menu-ops/event', 'workbench.largeOps.event'),
          createMenuPage('/workbench/large-menu-ops/review', 'workbench.largeOps.review'),
        ],
      },
      {
        path: '/workbench/large-menu-service',
        title: menuTitle('workbench.largeService.title'),
        routes: [
          createMenuPage('/workbench/large-menu-service/ticket', 'workbench.largeService.ticket'),
          createMenuPage(
            '/workbench/large-menu-service/knowledge',
            'workbench.largeService.knowledge',
          ),
          createMenuPage('/workbench/large-menu-service/sla', 'workbench.largeService.sla'),
        ],
      },
    ],
  },
  {
    path: '/reports',
    title: menuTitle('reports.title'),
    icon: LineChartOutlined,
    routes: [
      {
        path: '/reports/overview',
        title: menuTitle('reports.overview'),
        element: DemoPage,
      },
      {
        path: '/reports/live',
        title: menuTitle('reports.live'),
        tag: { text: 'Beta', color: 'processing' },
        element: DemoPage,
      },
    ],
  },
  {
    path: '/demo',
    title: menuTitle('demo.title'),
    icon: ClearOutlined,
    routes: [
      {
        path: '/demo/ui',
        title: menuTitle('demo.ui.title'),
        routes: [
          {
            path: '/demo/ui/action-icon',
            title: menuTitle('demo.ui.actionIcon'),
            element: ActionIconPlayground,
          },
          {
            path: '/demo/ui/action-reveal',
            title: menuTitle('demo.ui.actionReveal'),
            element: ActionRevealPlayground,
          },
          {
            path: '/demo/ui/action-text',
            title: menuTitle('demo.ui.actionText'),
            element: ActionTextPlayground,
          },
          {
            path: '/demo/ui/input-range-input',
            title: menuTitle('demo.ui.inputRange'),
            element: InputNumberRangePlayground,
          },
          {
            path: '/demo/ui/scroll-area',
            title: menuTitle('demo.ui.scrollArea'),
            element: ScrollAreaPlayground,
          },
          {
            path: '/demo/ui/table',
            title: menuTitle('demo.ui.table'),
            element: TablePlayground,
          },
          {
            path: '/demo/ui/pro-table',
            title: menuTitle('demo.ui.proTable'),
            element: ProTablePlayground,
          },
          {
            path: '/demo/ui/pro-view-management',
            title: menuTitle('demo.ui.proViewManagement'),
            icon: AppstoreOutlined,
            element: ProViewManagementPlayground,
          },
        ],
      },
      {
        path: '/demo/error',
        title: menuTitle('demo.error.title'),
        routes: [
          {
            path: '/demo/error/404',
            title: menuTitle('demo.error.notFound'),
            element: ErrorPage,
          },
        ],
      },
    ],

  },

]
