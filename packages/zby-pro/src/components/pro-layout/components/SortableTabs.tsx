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
import { useMemo } from 'react'

import type { DragEndEvent } from '@dnd-kit/core'
import type { TabsProps } from 'antd'
import type { ReactNode } from 'react'

export interface SortableTabsProps extends Omit<TabsProps, 'items' | 'renderTabBar'> {
  prefixCls: string
  items: NonNullable<TabsProps['items']>
  fixedKeys: readonly string[]
  onReorder: (keys: string[]) => boolean
  onPreload?: (key: string) => void
}

/** 使用 dnd-kit 为 antd Tabs 增加键盘和指针可访问的横向排序。 */
export default function SortableTabs(props: SortableTabsProps) {
  const {
    activeKey,
    fixedKeys,
    items,
    onPreload,
    onReorder,
    prefixCls,
    ...tabsProps
  } = props
  const orderedItems = useMemo(
    () => sortByFixedGroup(items, fixedKeys),
    [fixedKeys, items],
  )
  const keys = useMemo(() => orderedItems.map((item) => String(item.key)), [orderedItems])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id)
      return

    const activeKey = String(active.id)
    const overKey = String(over.id)
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
              onPreload={onPreload}
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
  onPreload?: (key: string) => void
  children: ReactNode
}) {
  const { active, children, id, onPreload, prefixCls } = props
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      className={clsx(`${prefixCls}-tab-node`, {
        [`${prefixCls}-tab-node-active`]: active,
        [`${prefixCls}-tab-node-dragging`]: isDragging,
      })}
      style={{
        transform: CSS.Transform.toString(transform ? { ...transform, y: 0, scaleX: 1, scaleY: 1 } : null),
        transition,
      }}
      onFocus={() => onPreload?.(id)}
      onMouseEnter={() => onPreload?.(id)}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

function sortByFixedGroup(items: NonNullable<TabsProps['items']>, fixedKeys: readonly string[]) {
  return items
    .filter((item) => fixedKeys.includes(String(item.key)))
    .concat(items.filter((item) => !fixedKeys.includes(String(item.key))))
}
