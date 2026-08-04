import { ClearOutlined, DashboardOutlined, HomeOutlined, LineChartOutlined, LinkOutlined } from '@ant-design/icons'
import type { ProLayoutRoute } from '@zby/pro'
import ActionIconPlayground from './pages/ActionIconPlayground'
import ActionRevealPlayground from './pages/ActionRevealPlayground'
import ActionTextPlayground from './pages/ActionTextPlayground'
import DemoPage from './pages/DemoPage'
import ErrorPage from './pages/ErrorPage'
import InputNumberRangePlayground from './pages/InputNumberRangePlayground'
import ScrollAreaPlayground from './pages/ScrollAreaPlayground'

const createMenuPage = (path: string, title: string): ProLayoutRoute => ({
  path,
  title,
  element: <DemoPage />,
})

export const appRouters: ProLayoutRoute[ ] = [
  {
    path: '/dashboard',
    title: '首页',
    icon: HomeOutlined,
    element: <DemoPage />,
  },
  {
    path: '/workbench',
    title: '工作台',
    icon: DashboardOutlined,
    routes: [
      {
        path: '/records/:id',
        title: '记录详情',
        supportMultipleTabs: true,
        element: <DemoPage />,
      },
      {
        path: '/workbench/dirty',
        title: '关闭拦截',
        tag: { text: 'Hook', color: 'warning' },
        element: <DemoPage />,
      },
      {
        path: '/workbench/content-container',
        title: '内容区布局',
        tag: { text: 'New', color: 'success' },
        element: <DemoPage />,
      },
      {
        path: '/workbench/hidden',
        title: '隐藏菜单',
        ignore: true,
        element: <div />,
      },
      {
        path: '/workbench/wip',
        title: '开发中页面',
        prompt: '该页面暂未开放。',
      },
      {
        path: 'https://www.baidu.com',
        title: '外部系统',
        _blank: true,
        target: '_blank',
        icon: LinkOutlined,
      },
      createMenuPage('/workbench/direct-shortcut', '二级直达菜单'),
      createMenuPage('/workbench/direct-risk', '风险待办'),
      {
        path: '/workbench/customer',
        title: '三级菜单组',
        routes: [
          createMenuPage('/workbench/customer/profile', '客户画像'),
          createMenuPage('/workbench/customer/segment', '客群分层'),
          createMenuPage('/workbench/customer/reach', '触达计划'),
          createMenuPage('/workbench/customer/retention', '复购留存'),
        ],
      },
      {
        path: '/workbench/product',
        title: '商品中心',
        routes: [
          createMenuPage('/workbench/product/list', '商品列表'),
          createMenuPage('/workbench/product/category', '类目管理'),
          createMenuPage('/workbench/product/price', '价格策略'),
          createMenuPage('/workbench/product/stock', '库存预警'),
        ],
      },
      {
        path: '/workbench/material',
        title: '四级菜单组',
        routes: [
          {
            path: '/workbench/material/assets',
            title: '素材资产',
            routes: [
              {
                path: '/workbench/material/assets/voices',
                title: '语音素材',
                tag: { text: 'New', color: 'success' },
                element: <DemoPage />,
              },
              createMenuPage('/workbench/material/assets/images', '图片素材图片素材图片素材'),
              createMenuPage('/workbench/material/assets/videos', '视频素材'),
              createMenuPage('/workbench/material/assets/copywriting', '文案素材'),
            ],
          },
          {
            path: '/workbench/material/audit',
            title: '素材审核',
            routes: [
              createMenuPage('/workbench/material/audit/pending', '待审核'),
              createMenuPage('/workbench/material/audit/rejected', '驳回记录'),
            ],
          },
        ],
      },
      {
        path: '/workbench/campaign',
        title: '广告投放',
        routes: [
          {
            path: '/workbench/campaign/manage',
            title: '活动管理',
            routes: [
              createMenuPage('/workbench/campaign/manage/list', '活动列表'),
              createMenuPage('/workbench/campaign/manage/budget', '预算调整'),
              createMenuPage('/workbench/campaign/manage/creative', '创意绑定'),
            ],
          },
          createMenuPage('/workbench/campaign/strategy', '投放策略'),
          createMenuPage('/workbench/campaign/diagnosis', '投放诊断'),
        ],
      },
      {
        path: '/workbench/data',
        title: '数据诊断',
        routes: [
          createMenuPage('/workbench/data/realtime', '实时指标'),
          createMenuPage('/workbench/data/funnel', '转化漏斗'),
          createMenuPage('/workbench/data/compare', '多维对比'),
          createMenuPage('/workbench/data/export', '数据导出'),
        ],
      },
      {
        path: '/workbench/delivery',
        title: '履约管理',
        routes: [
          createMenuPage('/workbench/delivery/order', '订单履约'),
          createMenuPage('/workbench/delivery/logistics', '物流跟踪'),
          createMenuPage('/workbench/delivery/exception', '异常处理'),
        ],
      },
      {
        path: '/workbench/finance',
        title: '财务结算',
        routes: [
          createMenuPage('/workbench/finance/bill', '账单管理'),
          createMenuPage('/workbench/finance/invoice', '发票管理'),
          createMenuPage('/workbench/finance/reconcile', '对账中心'),
          createMenuPage('/workbench/finance/refund', '退款记录'),
        ],
      },
      {
        path: '/workbench/permission',
        title: '权限配置',
        routes: [
          createMenuPage('/workbench/permission/role', '角色管理'),
          createMenuPage('/workbench/permission/member', '成员管理'),
          createMenuPage('/workbench/permission/audit', '权限审计'),
        ],
      },
      {
        path: '/workbench/tools',
        title: '系统工具',
        routes: [
          createMenuPage('/workbench/tools/import', '批量导入'),
          createMenuPage('/workbench/tools/task', '任务中心'),
          createMenuPage('/workbench/tools/webhook', '回调配置'),
          createMenuPage('/workbench/tools/log', '操作日志'),
        ],
      },
      {
        path: '/workbench/automation',
        title: '自动化任务',
        routes: [
          createMenuPage('/workbench/automation/rules', '规则编排'),
          createMenuPage('/workbench/automation/schedule', '定时任务'),
          createMenuPage('/workbench/automation/history', '执行历史'),
        ],
      },
      {
        path: '/workbench/quality',
        title: '质检中心',
        routes: [
          createMenuPage('/workbench/quality/sample', '抽检样本'),
          createMenuPage('/workbench/quality/rule', '质检规则'),
          createMenuPage('/workbench/quality/report', '质检报告'),
        ],
      },
      {
        path: '/workbench/large-menu-background',
        title: '大批量菜单组 - 后台',
        routes: [
          createMenuPage('/workbench/large-menu-background/ticket', '工单列表'),
          createMenuPage('/workbench/large-menu-background/knowledge', '知识库'),
          createMenuPage('/workbench/large-menu-background/sla1', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla2', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla3', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla4', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla5', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla6', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla7', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla8', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla9', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla10', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla11', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla12', 'SLA 配置'),
          createMenuPage('/workbench/large-menu-background/sla13', 'SLA 配置'),
          // createMenuPage('/workbench/large-menu-background/sla14', 'SLA 配置'),
          // createMenuPage('/workbench/large-menu-background/sla15', 'SLA 配置'),
          // createMenuPage('/workbench/large-menu-background/sla16', 'SLA 配置'),
        ],
      },
      {
        path: '/workbench/large-menu-ops',
        title: '大批量菜单组 - 运营',
        routes: [
          createMenuPage('/workbench/large-menu-ops/calendar', '运营日历'),
          createMenuPage('/workbench/large-menu-ops/event', '事件中心'),
          createMenuPage('/workbench/large-menu-ops/review', '复盘记录'),
        ],
      },
      {
        path: '/workbench/large-menu-service',
        title: '大批量菜单组 - 服务',
        routes: [
          createMenuPage('/workbench/large-menu-service/ticket', '工单列表'),
          createMenuPage('/workbench/large-menu-service/knowledge', '知识库'),
          createMenuPage('/workbench/large-menu-service/sla', 'SLA 配置'),
        ],
      },
    ],
  },
  {
    path: '/reports',
    title: '报表',
    icon: LineChartOutlined,
    routes: [
      {
        path: '/reports/overview',
        title: '报表总览',
        element: <DemoPage />,
      },
      {
        path: '/reports/live',
        title: '实时监控',
        tag: { text: 'Beta', color: 'processing' },
        tooltipProps: { title: '该页不会进入 keepAlive 缓存' },
        element: <DemoPage />,
      },
    ],
  },
  {
    path: '/demo',
    title: '示例页面',
    icon: ClearOutlined,
    routes: [
      {
        path: '/demo/ui',
        title: 'UI示例组',
        routes: [
          {
            path: '/demo/ui/action-reveal',
            title: '动作展开',
            element: <ActionRevealPlayground />,
          },
          {
            path: '/demo/ui/action-icon',
            title: '动作图标',
            element: <ActionIconPlayground />,
          },
          {
            path: '/demo/ui/action-text',
            title: '动作文本',
            element: <ActionTextPlayground />,
          },
          {
            path: '/demo/ui/input-range-input',
            title: '数字范围',
            element: <InputNumberRangePlayground />,
          },
          {
            path: '/demo/ui/scroll-area',
            title: '滚动组件',
            element: <ScrollAreaPlayground />,
          },
        ],
      },
      {
        path: '/demo/error',
        title: '错误实例组',
        routes: [
          {
            path: '/demo/error/404',
            title: '404页面',
            element: <ErrorPage />,
          },
        ],
      },
    ],

  },

]
