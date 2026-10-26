import { isConcreteRoutePath } from '@zby/router-core'
import { useRouterCore, useRouterCoreCreateHref, useRouterCoreSelector } from '@zby/router-core/react'
import { useIntl } from '@zby/intl'
import { Layout, message } from 'antd'
import { clsx } from 'clsx'
import { memo, useEffect, useMemo, useRef, useState } from 'react'

import type { RouterCoreState } from '@zby/router-core'
import type { ReactNode } from 'react'
import type {
  ProLayoutClassNames,
  ProLayoutRoute,
  ProLayoutStyles,
  ProLayoutSystemItem,
} from '../types'
import { resolveProLayoutTitle } from '../title'
import { isVisibleRoute } from './isVisibleRoute'
import MenuDrawer from './MenuDrawer'
import SystemSwitcher from './SystemSwitcher'

/** 一级菜单 hover intent 的停留阈值；短暂掠过不会切换已打开的 Drawer。 */
const MENU_HOVER_DELAY = 100

export interface IconDrawerMenuProps {
  /** ProLayout 所有语义类名的前缀。 */
  prefixCls: string
  /** CSS-in-JS 注册后生成的作用域类名，需要透传给 Portal 中的 Drawer。 */
  hashId: string
  /** 图标栏顶部 Logo；函数形式只在渲染时求值，不接收折叠状态。 */
  logo?: ReactNode | (() => ReactNode)
  /** 图标栏底部的外部系统切换入口；空数组时不渲染入口。 */
  systemList?: ProLayoutSystemItem[]
  /** 当前主题算法派生的侧栏宽度，同时作为 Drawer 的左侧偏移量。 */
  siderWidth: number
  /** ProLayout 各语义区域的自定义类名。 */
  classNames?: ProLayoutClassNames
  /** ProLayout 各语义区域的自定义内联样式。 */
  styles?: ProLayoutStyles
}

/**
 * ZBY 唯一保留的“一级图标栏 + 多列 Drawer”导航。
 *
 * 组件只负责一级菜单的展示、打开状态和 Drawer 内容选择：
 * - `selectedPath` 表示 RouterCore 当前实际命中的路由链；
 * - `hoverFirstPath` 表示用户在已打开 Drawer 中准备查看的一级目录；
 * - `drawerOpen` 只控制 Drawer 是否可见，不参与路由选中判断。
 *
 * 将三个状态分开可以保证悬停查看其他菜单时不改变真实路由，同时关闭动画期间仍保留
 * 最后一次显示的菜单内容，避免 Drawer 闪回当前页面所属目录。
 */
const IconDrawerMenu = (props: IconDrawerMenuProps) => {
  const {
    classNames,
    hashId,
    logo,
    prefixCls,
    siderWidth,
    styles,
    systemList = [],
  } = props
  const intl = useIntl()
  const router = useRouterCore<ProLayoutRoute>()
  const createHref = useRouterCoreCreateHref()
  const [messageApi, messageContextHolder] = message.useMessage()

  // currentSelectedPath 是从一级到当前页面的完整路径，用于真实选中态和默认 Drawer 内容。
  const selectedPath = useRouterCoreSelector(
    (state: RouterCoreState<ProLayoutRoute>) => state.currentSelectedPath,
  )

  // 一级图标栏只保留用户能够实际访问或继续展开的路由，隐藏路由不占据视觉位置。
  const routes = useMemo(() => router.registry.permissionRoutes.filter(isVisibleRoute), [router])

  // Drawer 的可见性与显示哪个一级目录相互独立：关闭 Drawer 不会立即清空最后显示目录。
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [hoverFirstPath, setHoverFirstPath] = useState<string | null>(null)

  // 所有一级菜单共享同一个 timer，连续掠过多个图标时始终只有最后一个 hover intent 生效。
  const hoverTimerRef = useRef<number | null>(null)

  // hover 选择优先于真实路由选择，使用户可以在不跳转页面的情况下预览其他一级目录。
  const selectedFirstPath = selectedPath[0] || null
  const firstDisplayPath = hoverFirstPath || selectedFirstPath

  // MenuDrawer 只消费目标一级路由的直接子路由；更深层级由 MenuDrawer 自己递归渲染。
  const displayRoutes = useMemo(() => {
    // 尚未命中路由且用户也没有选择一级目录时，不向 Drawer 提供无来源的菜单数据。
    if (!firstDisplayPath)
      return []

    // 权限或 ignore 状态可能出现在子路由，因此这里再次执行与一级菜单相同的可见性过滤。
    return (
      routes.find((route) => route.path === firstDisplayPath)?.routes?.filter(isVisibleRoute) || []
    )
  }, [firstDisplayPath, routes])

  /** 取消尚未确认的 hover intent，并将 ref 恢复为“无任务”状态。 */
  const cancelHoverIntent = () => {
    // null 是唯一的空闲标记；没有待执行任务时不产生多余的 clearTimeout 调用。
    if (hoverTimerRef.current === null)
      return

    // 清除浏览器任务后同步重置 ref，确保下一次 mouseenter 可以重新安排计时。
    window.clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = null
  }

  // 组件卸载时清理计时器，避免回调在路由布局销毁后继续尝试更新 React 状态。
  useEffect(() => () => {
    // 这里直接读取 ref，不依赖某次渲染创建的闭包值，始终能拿到最新 timer。
    if (hoverTimerRef.current !== null)
      window.clearTimeout(hoverTimerRef.current)
  }, [])

  /** 统一关闭入口：关闭 Drawer 的同时废弃尚未完成的悬停切换。 */
  const closeDrawer = () => {
    // 如果不取消，Drawer 关闭后 timer 仍可能更新隐藏内容，并影响下一次打开时的首帧。
    cancelHoverIntent()
    setDrawerOpen(false)
  }

  /** 处理点击或键盘确认一级菜单后的导航、提示以及 Drawer 开关行为。 */
  const handleRoute = (route: ProLayoutRoute) => {
    // 点击和键盘操作代表明确意图，应取消 hover 延迟并立即响应。
    cancelHoverIntent()

    if (route.prompt) {
      // prompt 路由没有可进入页面：显示自定义文案或统一的“暂未开放”提示，然后收起菜单。
      void messageApi.info(
        route.prompt === true
          ? intl.getMessage('zby.pro.layout.menu.unavailable', '功能暂未开放')
          : resolveProLayoutTitle(intl, route.prompt),
      )
      closeDrawer()
      return
    }

    if (router.registry.isPageRoute(route)) {
      if (!isConcreteRoutePath(route.path)) {
        void messageApi.info(
          intl.getMessage('zby.pro.layout.menu.needConcretePath', '请从列表进入该页面'),
        )
        closeDrawer()
        return
      }
      // 一级页面路由可以直接跳转，不需要打开用于展示子路由的 Drawer。
      router.jumpTo(route.path)
      closeDrawer()
      return
    }

    if (hasVisibleChildren(route)) {
      // Drawer 已打开时，任意一级目录的确定性点击都先关闭；目录间预览切换交给 hover 处理。
      if (drawerOpen) {
        closeDrawer()
        return
      }

      // 从关闭状态打开时立即使用明确点击的目录，不能等待 hover timer 或回退到当前路由。
      setHoverFirstPath(route.path)
      setDrawerOpen(true)
    }
  }

  return (
    <>
      {/* message.useMessage 的 holder 必须留在当前主题上下文中，提示层才能继承正确 token。 */}
      {messageContextHolder}
      <Layout.Sider
        width={siderWidth}
        // 图标栏始终使用 Ant Design 的折叠 Sider 形态，展开内容统一交给 MenuDrawer。
        collapsed
        collapsedWidth={siderWidth}
        className={clsx(`${prefixCls}-sider`, classNames?.sider)}
        style={styles?.sider}
      >
        <div className={`${prefixCls}-sider-inner`}>
          {/* Logo 是独立的固定区域，不进入一级菜单的纵向滚动容器。 */}
          <div
            className={clsx(`${prefixCls}-sider-logo`, classNames?.siderLogo)}
            style={styles?.siderLogo}
          >
            {typeof logo === 'function' ? logo() : logo}
          </div>
          <div
            className={clsx(`${prefixCls}-sider-menu-container`, classNames?.siderMenu)}
            style={styles?.siderMenu}
          >
            {/*
             * 一级菜单使用独立原生滚动容器：菜单数量超过可用高度时只滚动图标列表；
             * 外层 container 继续负责定位、裁切以及挂载 MenuDrawer，二者职责不能合并。
             */}
            <div className={`${prefixCls}-sider-menu-scroll`}>
              <nav className={`${prefixCls}-sider-menu`}>
                {routes.map((route) => {
                  // icon 是可选配置；没有 icon 时仍保留标题和稳定的菜单项尺寸。
                  const Icon = route.icon
                  const title = resolveProLayoutTitle(intl, route.title)

                  // active 表示真实路由命中；hovered 只表示当前打开的 Drawer 正在展示该目录。
                  const active = selectedPath.includes(route.path)
                  const hovered = drawerOpen && firstDisplayPath === route.path

                  // 两种状态允许并存：用户可停留在当前页面，同时查看另一个一级目录的 Drawer。
                  const className = clsx(`${prefixCls}-sider-item`, {
                    [`${prefixCls}-sider-item-active`]: active,
                    [`${prefixCls}-sider-item-hover`]: hovered,
                  })

                  // 图标和标题复用同一内容节点，确保外链 a 与内部交互按钮拥有完全一致的结构。
                  const content = (
                    <dl>
                      <dt>{Icon ? <Icon /> : null}</dt>
                      <dd>
                        <span className={`${prefixCls}-sider-item-title`}>{title}</span>
                      </dd>
                    </dl>
                  )

                  // mouseenter 只负责一级目录的延迟切换；页面 chunk 等到点击后再由 lazyPage 加载。
                  const handleHoverIntent = () => {
                    // 新图标接管 hover intent 前先清除旧 timer，保证不会发生过期目录的延迟回写。
                    cancelHoverIntent()

                    // 叶子路由没有 Drawer 内容；已经显示的目录也无需重复计时和触发渲染。
                    if (!hasVisibleChildren(route) || route.path === firstDisplayPath)
                      return

                    // 只有指针在同一一级菜单上持续停留，才认为用户确实想切换 Drawer。
                    hoverTimerRef.current = window.setTimeout(() => {
                      // 回调开始执行后先释放 timer 标记，再提交新的显示目录。
                      hoverTimerRef.current = null
                      setHoverFirstPath(route.path)
                    }, MENU_HOVER_DELAY)
                  }

                  // 无 prompt 的外链保留原生链接语义；其余路由由 RouterCore 统一处理点击和键盘操作。
                  return route._blank && !route.prompt ? (
                    <a
                      key={route.path}
                      href={createHref(route.path)}
                      target={route.target || '_blank'}
                      rel={
                        // 新窗口外链必须隔离 opener；显式使用其他 target 时不强加该策略。
                        (route.target || '_blank') === '_blank'
                          ? 'noopener noreferrer'
                          : undefined
                      }
                      className={className}
                      title={title}
                      onMouseEnter={handleHoverIntent}
                      onMouseLeave={cancelHoverIntent}
                    >
                      {content}
                    </a>
                  ) : (
                    <div
                      key={route.path}
                      role="button"
                      tabIndex={0}
                      className={className}
                      title={title}
                      onClick={() => handleRoute(route)}
                      onMouseEnter={handleHoverIntent}
                      onMouseLeave={cancelHoverIntent}
                      onKeyDown={(event) => {
                        // div 模拟按钮时只响应原生按钮对应的 Enter 和 Space 键。
                        if (event.key !== 'Enter' && event.key !== ' ') return

                        // 阻止 Space 触发页面滚动，再复用与鼠标点击相同的确定性操作入口。
                        event.preventDefault()
                        handleRoute(route)
                      }}
                    >
                      {content}
                    </div>
                  )
                })}
              </nav>
            </div>
            {/* Drawer 使用与图标栏相同的显示目录和选中链，但独立管理内部布局与滚动。 */}
            <MenuDrawer
              prefixCls={prefixCls}
              hashId={hashId}
              left={siderWidth}
              open={drawerOpen}
              onClose={closeDrawer}
              displayRoutes={displayRoutes}
              selectedPath={selectedPath}
              className={classNames?.menuDrawer}
              style={styles?.menuDrawer}
            />
          </div>
          {/* 系统入口固定在图标栏底部；不存在可切换系统时不保留空白占位。 */}
          {systemList.length ? (
            <SystemSwitcher prefixCls={prefixCls} hashId={hashId} systemList={systemList} />
          ) : null}
        </div>
      </Layout.Sider>
    </>
  )
}

IconDrawerMenu.displayName = 'IconDrawerMenu'

/** 判断目录是否至少包含一个符合展示规则的直接或间接后代。 */
function hasVisibleChildren(route: ProLayoutRoute) {
  // some 会在第一个可见后代处短路，无需为仅做布尔判断的场景创建过滤数组。
  return Boolean(route.routes?.some(isVisibleRoute))
}

export default memo(IconDrawerMenu)
