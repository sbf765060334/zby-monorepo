import type { DragEndEvent } from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  CSSProperties,
  HTMLAttributes,
  ReactNode,
  Ref,
} from 'react'
import * as React from 'react'

type SortableListRenderContext = {
  dragging: boolean
  dragHandleProps: HTMLAttributes<HTMLElement>
  rowRef: Ref<HTMLDivElement>
  sortable: boolean
  style: CSSProperties
}

type SortableListProps<Item> = {
  items: Item[]
  getKey: (item: Item) => string
  disabled?: boolean
  className?: string
  isItemSortable?: (item: Item) => boolean
  onReorder: (orderedKeys: string[]) => void
  renderItem: (item: Item, context: SortableListRenderContext) => ReactNode
}

function SortableListItem<Item>({
  item,
  itemKey,
  renderItem,
  sortable,
}: {
  item: Item
  itemKey: string
  renderItem: SortableListProps<Item>['renderItem']
  sortable: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: itemKey,
      disabled: !sortable,
    })
  const verticalTransform = transform
    ? {
        ...transform,
        x: 0,
      }
    : null

  return renderItem(item, {
    dragging: isDragging,
    dragHandleProps: sortable
      ? ({
          ...attributes,
          ...(listeners ?? {}),
        } as HTMLAttributes<HTMLElement>)
      : {},
    rowRef: setNodeRef,
    sortable,
    style: {
      position: isDragging ? 'relative' : undefined,
      transform: CSS.Transform.toString(verticalTransform),
      transition,
      zIndex: isDragging ? 1 : undefined,
    },
  })
}

export function SortableList<Item>({
  items,
  getKey,
  disabled = false,
  className,
  isItemSortable,
  onReorder,
  renderItem,
}: SortableListProps<Item>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const itemKeys = items.map(getKey)
  const sortableKeySet = new Set(
    items
      .filter((item) => isItemSortable?.(item) ?? true)
      .map((item) => getKey(item)),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return
    }

    const activeKey = String(active.id)
    const overKey = String(over.id)

    if (!sortableKeySet.has(activeKey)) {
      return
    }

    const activeIndex = itemKeys.indexOf(activeKey)
    const overIndex = itemKeys.indexOf(overKey)

    if (activeIndex < 0 || overIndex < 0) {
      return
    }

    const nextKeys = itemKeys.slice()
    const [movedKey] = nextKeys.splice(activeIndex, 1)
    nextKeys.splice(overIndex, 0, movedKey)
    onReorder(nextKeys)
  }

  if (disabled) {
    return (
      <div className={className}>
        {items.map((item) =>
          renderItem(item, {
            dragging: false,
            dragHandleProps: {},
            rowRef: null,
            sortable: false,
            style: {},
          }),
        )}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemKeys} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item) => {
            const itemKey = getKey(item)

            return (
              <SortableListItem
                key={itemKey}
                item={item}
                itemKey={itemKey}
                renderItem={renderItem}
                sortable={sortableKeySet.has(itemKey)}
              />
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
