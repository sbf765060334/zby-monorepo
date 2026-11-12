import * as React from 'react'
import { DownOutlined, EllipsisOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { Button, ConfigProvider, Dropdown, Popconfirm, theme, Tooltip } from 'antd'
import type { MenuProps, TooltipProps } from 'antd'
import { clsx } from 'clsx'

import type { ProTableActionInfo, ProTableActionItem, ProTableActionsProps, ProTableActionTooltip } from '../interface'
import { distributeActionWidths, normalizeActionCount } from './layout'

const DEFAULT_MORE_ICON = <EllipsisOutlined />
const DEFAULT_MORE_ARROW = <DownOutlined aria-hidden />
const EXPOSED_BUTTON_STYLE = { paddingInline: 0, marginInline: 0 }

function isTooltipProps(tooltip: ProTableActionTooltip): tooltip is Omit<TooltipProps, 'children'> {
  return (
    typeof tooltip === 'object' &&
    tooltip !== null &&
    !Array.isArray(tooltip) &&
    !React.isValidElement(tooltip)
  )
}

function renderTooltip(node: React.ReactElement, tooltip: ProTableActionTooltip | undefined) {
  if (!tooltip) return node
  const tooltipProps: Omit<TooltipProps, 'children'> = isTooltipProps(tooltip)
    ? tooltip
    : { title: tooltip }
  if (!tooltipProps.title && !tooltipProps.overlay) return node
  return <Tooltip {...tooltipProps}>{node}</Tooltip>
}

function isActionShown<RecordType>(
  item: ProTableActionItem<RecordType>,
  record: RecordType | undefined,
  index: number | undefined,
) {
  const show = typeof item.show === 'function'
    ? item.show({ record, index, key: item.key })
    : item.show
  return show !== false
}

// 与文案省略场景一致：优先使用业务 title，否则从可读取的 children 提取全文。
// 自定义组件内部渲染的文案无法静态提取，需要业务显式提供 title。
function collectText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(collectText).join('')
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return collectText(node.props.children)
  return ''
}

// 文案被压缩后，scrollWidth 仍保留其完整宽度；图标、gap、padding 和边框也计入需求。
// 这里按 Button 的直接子元素估算自然宽度，不通过克隆 DOM 测量。
function naturalButtonWidth(slot: HTMLElement): number {
  const button = slot.querySelector('button')
  if (!button) return 0
  const css = getComputedStyle(button)
  const children = Array.from(button.children) as HTMLElement[]
  const content = children.reduce((sum, child) => sum + Math.max(child.scrollWidth, child.getBoundingClientRect().width), 0)
  return content + Math.max(0, children.length - 1) * (Number.parseFloat(css.columnGap) || 0) +
    (Number.parseFloat(css.paddingLeft) || 0) + (Number.parseFloat(css.paddingRight) || 0) +
    (Number.parseFloat(css.borderLeftWidth) || 0) + (Number.parseFloat(css.borderRightWidth) || 0)
}

export function ProTableActions<RecordType>({
  actions,
  record,
  index,
  layout,
  width,
  moreText,
  moreButtonProps,
  dropdownProps,
  className,
  style,
  prefixCls: customizePrefixCls,
}: ProTableActionsProps<RecordType>) {
  const { getPrefixCls } = React.useContext(ConfigProvider.ConfigContext)
  const prefixCls = getPrefixCls('pro-table', customizePrefixCls)
  const { token } = theme.useToken()
  const intl = useIntl()
  const moreHint = intl.getMessage('zby.pro.table.moreActions', '更多操作')
  // 先过滤权限/状态隐藏项，再计算外露数量，隐藏项不占网格槽位。
  const items = actions.filter((item): item is ProTableActionItem<RecordType> => {
    if (!item) return false
    return isActionShown(item, record, index)
  })
  const grid = layout?.rows !== undefined && layout.columns !== undefined
  const rows = grid ? normalizeActionCount(layout.rows, 1) : 1
  const columns = grid ? normalizeActionCount(layout.columns, 1) : 1
  const direction = layout?.direction ?? 'horizontal'
  const capacity = rows * columns
  // 数量模式只计算业务操作；网格容量包含更多入口，确有溢出时才预留最后一格。
  const visibleLimit = grid
    ? (items.length > capacity ? capacity - 1 : items.length)
    : layout?.visibleCount === 'all' ? items.length : normalizeActionCount(layout?.visibleCount)
  // 入口外观由配置模式决定，极窄收起时仍保持同一种入口，避免测量宽度反复切换。
  const useTextMore = grid || layout?.visibleCount === 'all' || visibleLimit > 0
  const resolvedMoreText = moreText === undefined && useTextMore
    ? intl.getMessage('zby.pro.table.more', '更多')
    : moreText
  const candidates = items.slice(0, visibleLimit)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [measurement, setMeasurement] = React.useState<{ available: number; widths: number[]; more: number }>({ available: 0, widths: [], more: 0 })
  const constrained = (width ?? style?.width) !== undefined
  const gap = grid ? token.marginXS : token.marginXXS
  const cellWidth = (measurement.available - (columns - 1) * gap) / columns
  const hasOverflow = items.length > candidates.length
  const measured = measurement.more > 0
  const naturalTotal = measurement.widths.reduce((sum, value) => sum + value, 0) +
    (hasOverflow ? measurement.more : 0) + Math.max(0, candidates.length + Number(hasOverflow) - 1) * gap
  // 普通模式需先判断是否真的放不下，避免隐藏的更多入口挤掉本来能完整显示的操作。
  // 极窄时整组收进菜单；网格则要求更多入口能完整放入所在列。
  const collapsed = constrained && measured && items.length > 0 && (grid
    ? hasOverflow && cellWidth < measurement.more
    : direction === 'horizontal' && naturalTotal > measurement.available && measurement.available <= measurement.more + candidates.length * gap)
  const visible = collapsed ? [] : candidates
  const overflow = collapsed ? items : items.slice(visibleLimit)
  // 扣除实际存在的更多入口和所有间距后，再公平分配业务按钮的空间。
  // 没有溢出操作时，不为仅用于测量的隐藏入口预留宽度。
  const widths = constrained && !grid && direction === 'horizontal' && measured
    ? distributeActionWidths(measurement.widths, measurement.available - (hasOverflow ? measurement.more : 0) -
        Math.max(0, candidates.length + Number(hasOverflow) - 1) * gap)
    : undefined

  // 首帧绘制前测量；每次提交后重新读取，覆盖 props、语言和主题切换。
  // ResizeObserver 负责盒子尺寸变化；MutationObserver 补充盒子未变时的内部文案更新。
  // 字体加载完成后也需重新计算。
  React.useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !constrained) return
    const measure = () => {
      const slots = Array.from(root.querySelectorAll<HTMLElement>('[data-action-slot]'))
      const more = root.querySelector<HTMLElement>('[data-more-slot]')
      const rootStyle = getComputedStyle(root)
      const next = {
        // clientWidth 已排除边框，但包含 padding；两种盒模型都需扣除实际内边距。
        available: Math.max(0, root.clientWidth - (Number.parseFloat(rootStyle.paddingLeft) || 0) -
          (Number.parseFloat(rootStyle.paddingRight) || 0)),
        widths: slots.map(naturalButtonWidth),
        more: more ? Math.max(naturalButtonWidth(more), more.querySelector('button')?.getBoundingClientRect().width ?? 0) : 0,
      }
      // 宽度不变时复用状态，避免“测量 → setState → 测量”的重复渲染。
      setMeasurement((prev) => prev.available === next.available && prev.more === next.more &&
        prev.widths.length === next.widths.length && prev.widths.every((w, i) => w === next.widths[i]) ? prev : next)
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    observer?.observe(root)
    root.querySelectorAll('[data-action-slot] button, [data-more-slot] button').forEach((node) => observer?.observe(node))
    const contentObserver = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(measure)
    // 只监听文本和节点增删，不监听本组件计算后写回的 style，避免宽度更新反复触发测量。
    contentObserver?.observe(root, { subtree: true, childList: true, characterData: true })
    document.fonts?.addEventListener('loadingdone', measure)
    return () => {
      observer?.disconnect()
      contentObserver?.disconnect()
      document.fonts?.removeEventListener('loadingdone', measure)
    }
  })
  // 菜单内确认框打开期间阻止非受控 Dropdown 收起，避免点击确认前触发器被卸载。
  // ref 供事件同步读取，state 驱动 open 的渲染。
  const holdOpenRef = React.useRef(false)
  const [holdingConfirm, setHoldingConfirm] = React.useState(false)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const isOpenControlled = Boolean(dropdownProps && 'open' in dropdownProps)
  const info = (item: ProTableActionItem<RecordType>): ProTableActionInfo<RecordType> => ({ record, index, key: item.key })
  const executeClick = (item: ProTableActionItem<RecordType>) => {
    if (!item.disabled) void item.onClick?.(info(item))
  }
  // 配置二次确认时只在确认后执行；专用 onConfirm 优先，否则回退到 onClick。
  // 原样返回 Promise，由 Popconfirm 管理 loading、成功关闭及失败后保留确认框。
  const executeConfirm = (item: ProTableActionItem<RecordType>) => {
    if (item.disabled || !item.popconfirm) return
    if (item.popconfirm.onConfirm) {
      return item.popconfirm.onConfirm(info(item))
    }
    return item.onClick?.(info(item))
  }
  const wrapAction = (
    item: ProTableActionItem<RecordType>,
    trigger: React.ReactElement,
    overlay?: boolean,
  ) => {
    const popconfirm = item.popconfirm
    const content = popconfirm ? (
      <Popconfirm
        {...popconfirm}
        onOpenChange={(open) => {
          popconfirm.onOpenChange?.(open)
          if (!overlay) return
          holdOpenRef.current = open
          setHoldingConfirm(open)
          if (!open) {
            setMoreOpen(false)
          }
        }}
        onConfirm={() => executeConfirm(item)}
      >
        {trigger}
      </Popconfirm>
    ) : trigger
    return renderTooltip(content, item.tooltip)
  }
  const menuItems: MenuProps['items'] = overflow.map((item) => ({
    key: String(item.key),
    label: wrapAction(
      item,
      <span onClick={item.popconfirm ? (event) => event.stopPropagation() : undefined}>
        {item.label}
      </span>,
      true,
    ),
    disabled: item.disabled,
    danger: item.danger,
    onClick: item.popconfirm ? undefined : () => executeClick(item),
  }))
  const moreButton = (
    <Button
      {...moreButtonProps}
      type={moreButtonProps?.type ?? 'link'}
      size={moreButtonProps?.size ?? 'small'}
      style={{ ...EXPOSED_BUTTON_STYLE, ...moreButtonProps?.style }}
      className={clsx(`${prefixCls}-actions-more`, moreButtonProps?.className)}
      icon={moreButtonProps?.icon !== undefined ? moreButtonProps.icon
        : useTextMore ? DEFAULT_MORE_ARROW : moreText === undefined ? DEFAULT_MORE_ICON : undefined}
      iconPlacement={moreButtonProps?.iconPlacement ?? moreButtonProps?.iconPosition ?? (useTextMore ? 'end' : 'start')}
      aria-label={
        moreButtonProps?.['aria-label'] ??
        (moreText === undefined ? moreHint : undefined)
      }
    >
      {resolvedMoreText}
    </Button>
  )

  return (
    <div
      ref={rootRef}
      className={clsx(`${prefixCls}-actions`, className)}
      style={{ display: 'inline-block', ...style, width: width ?? style?.width, minWidth: 0 }}
    >
      <div style={{
        display: grid && !collapsed ? 'inline-grid' : 'inline-flex',
        flexDirection: direction === 'vertical' && !grid ? 'column' : 'row',
        alignItems: 'start',
        columnGap: gap,
        rowGap: token.marginXXS,
        width: constrained && !collapsed && (grid || direction === 'vertical') ? '100%' : undefined,
        gridTemplateColumns: grid && !collapsed ? `repeat(${columns}, ${constrained ? 'minmax(0, 1fr)' : 'max-content'})` : undefined,
      }}
      >
        {candidates.map((item, position) => {
          const { key, label, show: _show, tooltip: _tooltip, popconfirm, onClick: _onClick, ...buttonProps } = item
          const button = (
            <Button
              {...buttonProps}
              type={buttonProps.type ?? 'link'}
              size={buttonProps.size ?? 'small'}
              title={buttonProps.title ?? ((constrained || grid) ? collectText(label) || undefined : undefined)}
              style={{
                ...EXPOSED_BUTTON_STYLE,
                ...buttonProps.style,
                ...(constrained && !collapsed ? {
                  // 槽位负责列宽和对齐；按钮仅占内容宽度，槽位留白不参与按钮点击或弹层触发。
                  // 普通横向模式仍沿用已分配的槽位宽度；显式 width/block 保留业务的扩展意图。
                  width: grid || direction === 'vertical'
                    ? buttonProps.style?.width ?? (buttonProps.block ? '100%' : 'fit-content')
                    : '100%',
                  maxWidth: buttonProps.style?.maxWidth ?? '100%',
                  minWidth: 0,
                  justifyContent: 'flex-start',
                } : {}),
              }}
              onClick={popconfirm ? undefined : () => executeClick(item)}
            >
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
            </Button>
          )
          return (
            <div
              key={String(key)}
              data-action-slot=""
              aria-hidden={collapsed || undefined}
              style={{
                minWidth: 0,
                flex: 'none',
                width: constrained && !grid && direction === 'vertical' ? '100%' : widths?.[position],
                // 显式定位保证 DOM/键盘顺序与 actions 一致；vertical 按列填充，horizontal 按行填充。
                gridColumn: grid ? (direction === 'vertical' ? Math.floor(position / rows) : position % columns) + 1 : undefined,
                gridRow: grid ? (direction === 'vertical' ? position % rows : Math.floor(position / columns)) + 1 : undefined,
                // 收起时保留候选项用于测量，容器变宽后可恢复；隐藏项不占正常布局空间。
                ...(collapsed ? { position: 'absolute', visibility: 'hidden', pointerEvents: 'none' } : {}),
              }}
            >{wrapAction(item, button)}
            </div>
          )
        })}
        {(items.length > 0 && (constrained || overflow.length > 0)) && (
          <div
            data-more-slot=""
            aria-hidden={!overflow.length || undefined}
            style={{
              flex: 'none',
              gridColumn: grid && !collapsed ? (direction === 'vertical' ? Math.floor(visible.length / rows) : visible.length % columns) + 1 : undefined,
              gridRow: grid && !collapsed ? (direction === 'vertical' ? visible.length % rows : Math.floor(visible.length / columns)) + 1 : undefined,
              // 即使没有溢出，也保留一个不参与布局的入口以测量极窄兜底所需的最小宽度。
              ...(!overflow.length ? { position: 'absolute', visibility: 'hidden', pointerEvents: 'none' } : {}),
            }}
          >
            {overflow.length > 0 ? (
              <Dropdown
                {...dropdownProps}
                menu={{ items: menuItems }}
                trigger={dropdownProps?.trigger ?? ['hover']}
                open={isOpenControlled ? dropdownProps?.open : holdingConfirm || moreOpen}
                onOpenChange={(open, openInfo) => {
                  dropdownProps?.onOpenChange?.(open, openInfo)
                  if (isOpenControlled) return
                  if (!open && holdOpenRef.current) return
                  setMoreOpen(open)
                }}
              >
                {moreButton}
              </Dropdown>
            ) : moreButton}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProTableActions
