import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Tabs } from 'antd'
import { clsx } from 'clsx'
import { Children, cloneElement, isValidElement, useMemo } from 'react'

import type { DragEndEvent } from '@dnd-kit/core'
import type { TabsProps } from 'antd'
import type { KeyboardEventHandler, ReactNode } from 'react'

export type TabReorderRejection = 'unfixedBeforeFixed' | 'fixedAfterUnfixed'

/** Header 页签拖拽层对 antd Tabs 的扩展属性。 */
export interface SortableTabsProps extends Omit<TabsProps, 'items' | 'renderTabBar'> {
  prefixCls: string
  items: NonNullable<TabsProps['items']>
  fixedKeys: readonly string[]
  onReorder: (keys: string[]) => boolean
  onReorderRejected?: (reason: TabReorderRejection) => void
}

/** 使用 dnd-kit 为 antd Tabs 增加键盘和指针可访问的横向排序。 */
export default function SortableTabs(props: SortableTabsProps) {
  const {
    activeKey,
    fixedKeys,
    items,
    onReorder,
    onReorderRejected,
    prefixCls,
    ...tabsProps
  } = props
  const orderedItems = useMemo(
    () => sortByFixedGroup(items, fixedKeys),
    [fixedKeys, items],
  )
  const keys = useMemo(() => orderedItems.map((item) => String(item.key)), [orderedItems])
  const { nextKey, previousKey } = useMemo(() => {
    const activeIndex = keys.indexOf(String(activeKey))
    return {
      previousKey: activeIndex > -1 ? keys[activeIndex - 1] || null : null,
      nextKey: activeIndex > -1 ? keys[activeIndex + 1] || null : null,
    }
  }, [activeKey, keys])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id)
      return

    const activeKey = String(active.id)
    const overKey = String(over.id)
    const rejection = getTabReorderRejection(activeKey, overKey, fixedKeys)
    if (rejection) {
      onReorderRejected?.(rejection)
      return
    }

    const from = keys.indexOf(activeKey)
    const to = keys.indexOf(overKey)
    if (from < 0 || to < 0)
      return

    const nextKeys = keys.slice()
    nextKeys.splice(from, 1)
    nextKeys.splice(to, 0, activeKey)
    // core 会再次校验完整性和固定/普通分组边界；false 时 UI 保持原顺序。
    onReorder(nextKeys)
  }

  const renderTabBar: TabsProps['renderTabBar'] = (tabBarProps, DefaultTabBar) => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={keys} strategy={horizontalListSortingStrategy}>
        <DefaultTabBar {...tabBarProps}>
          {(node) => (
            <SortableTabNode
              key={node.key}
              id={String(node.key)}
              prefixCls={prefixCls}
              active={String(activeKey) === String(node.key)}
              activePrevious={previousKey === String(node.key)}
              activeNext={nextKey === String(node.key)}
            >
              {node}
            </SortableTabNode>
          )}
        </DefaultTabBar>
      </SortableContext>
    </DndContext>
  )

  return (
    <Tabs
      {...tabsProps}
      activeKey={activeKey}
      items={orderedItems}
      renderTabBar={renderTabBar}
    />
  )
}

function SortableTabNode(props: {
  id: string
  prefixCls: string
  active: boolean
  activePrevious: boolean
  activeNext: boolean
  children: ReactNode
}) {
  const {
    active,
    activeNext,
    activePrevious,
    children,
    id,
    prefixCls,
  } = props
  const {
    attributes,
    isDragging,
    isOver,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id })
  const tabNode = attachSortableKeyboardControl(
    children,
    (event) => listeners?.onKeyDown?.(event),
    attributes['aria-describedby'],
  )

  return (
    <>
      <div
        ref={setNodeRef}
        className={clsx(`${prefixCls}-tab-node`, {
          [`${prefixCls}-tab-node-active`]: active,
          [`${prefixCls}-tab-node-active-prev`]: activePrevious,
          [`${prefixCls}-tab-node-active-next`]: activeNext,
          [`${prefixCls}-tab-node-dragging`]: isDragging,
          [`${prefixCls}-tab-node-dropping`]: isOver,
        })}
        style={{
          transform: CSS.Transform.toString(
            transform ? { ...transform, y: 0, scaleX: 1, scaleY: 1 } : null,
          ),
          transition,
        }}
        onPointerDown={(event) => {
          if (!isNestedInteractiveControl(event.target))
            listeners?.onPointerDown?.(event)
        }}
      >
        {tabNode}
      </div>
      <div
        className={clsx(`${prefixCls}-tab-split`, {
          [`${prefixCls}-tab-split-hidden`]: active || activePrevious,
        })}
      />
    </>
  )
}

type TabControlProps = {
  children?: ReactNode
  role?: string
  onKeyDown?: KeyboardEventHandler<HTMLElement>
  'aria-describedby'?: string
}

function attachSortableKeyboardControl(
  node: ReactNode,
  onKeyDown: KeyboardEventHandler<HTMLElement>,
  describedBy: string,
): ReactNode {
  if (!isValidElement<TabControlProps>(node))
    return node

  if (node.props.role === 'tab') {
    const originalOnKeyDown = node.props.onKeyDown
    const ariaDescribedBy = [node.props['aria-describedby'], describedBy]
      .filter(Boolean)
      .join(' ')

    return cloneElement(node, {
      'aria-describedby': ariaDescribedBy,
      onKeyDown: (event) => {
        onKeyDown(event)
        if (!event.defaultPrevented)
          originalOnKeyDown?.(event)
      },
    })
  }

  return cloneElement(
    node,
    undefined,
    Children.map(
      node.props.children,
      (child) => attachSortableKeyboardControl(child, onKeyDown, describedBy),
    ),
  )
}

function isNestedInteractiveControl(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(
    target.closest('button, a, input, select, textarea, [role="button"]'),
  )
}

export function getTabReorderRejection(
  activeKey: string,
  overKey: string,
  fixedKeys: readonly string[],
): TabReorderRejection | null {
  const activeFixed = fixedKeys.includes(activeKey)
  const overFixed = fixedKeys.includes(overKey)
  if (!activeFixed && overFixed)
    return 'unfixedBeforeFixed'
  if (activeFixed && !overFixed)
    return 'fixedAfterUnfixed'
  return null
}

function sortByFixedGroup(items: NonNullable<TabsProps['items']>, fixedKeys: readonly string[]) {
  const fixedKeySet = new Set(fixedKeys)
  return items
    .filter((item) => fixedKeySet.has(String(item.key)))
    .concat(items.filter((item) => !fixedKeySet.has(String(item.key))))
}
