import * as React from 'react'
import {
  DoubleLeftOutlined,
  DoubleRightOutlined,
  HolderOutlined,
  LeftOutlined,
  RightOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { ActionIcon } from '@zby/ui'
import { Button, Checkbox, Empty } from 'antd'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

import { SortableList } from '../../pro-sortable-list'
import { restrictToFirstScrollableAncestor } from '../../pro-sortable-list/restrict-transform'
import type { ProTableFilter, ProTableFilterPreference } from '../interface'
import {
  groupFilterPreferencesByPlacement,
  moveGroupedFilterToTop,
  replacePlacementFilterOrder,
  setFilterPlacements,
} from '../utils/filter-config'

const filterDragModifiers = [restrictToFirstScrollableAncestor]

type FilterSettingsPanelProps<Query extends Record<string, unknown>> = {
  filters: ProTableFilter<Query>[]
  value: ProTableFilterPreference[]
  prefixCls: string
  className?: string
  onChange: (next: ProTableFilterPreference[]) => void
}

type TransferFilterRowProps = {
  checked: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  dragging?: boolean
  label: ReactNode
  prefixCls: string
  rowRef?: React.Ref<HTMLDivElement>
  style?: React.CSSProperties
  onMoveTop: () => void
  onShuttle: () => void
  onToggle: () => void
}

function getFilterLabelText(label: ReactNode, key: string) {
  if (typeof label === 'string' || typeof label === 'number') {
    return String(label)
  }
  return key
}

function TransferFilterRow({
  checked,
  dragHandleProps,
  dragging = false,
  label,
  prefixCls,
  rowRef,
  style,
  onMoveTop,
  onShuttle,
  onToggle,
}: TransferFilterRowProps) {
  const intl = useIntl()
  const pinTopTitle = intl.getMessage('zby.pro.table.pinTop', '置顶')
  const labelText = getFilterLabelText(label, '')

  return (
    <div
      ref={rowRef}
      className={clsx(
        `${prefixCls}-columns-selected-row`,
        `${prefixCls}-filters-pane-row`,
        checked && `${prefixCls}-filters-pane-row-selected`,
        dragging && `${prefixCls}-columns-selected-row-dragging`,
      )}
      style={style}
      onClick={onToggle}
      onDoubleClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onShuttle()
      }}
    >
      <span
        className={`${prefixCls}-columns-selected-dragger`}
        {...dragHandleProps}
        onClick={(event) => event.stopPropagation()}
      >
        <HolderOutlined />
      </span>
      <span
        className={`${prefixCls}-filters-pane-check`}
        onClick={(event) => event.stopPropagation()}
      >
        <Checkbox checked={checked} onChange={onToggle}>
          <span className={`${prefixCls}-columns-selected-title`} title={labelText}>
            {label}
          </span>
        </Checkbox>
      </span>
      <span className={`${prefixCls}-columns-selected-actions`} onClick={(event) => event.stopPropagation()}>
        <ActionIcon
          className={`${prefixCls}-columns-selected-action`}
          icon={<VerticalAlignTopOutlined />}
          size="small"
          title={pinTopTitle}
          aria-label={pinTopTitle}
          onClick={onMoveTop}
        />
      </span>
    </div>
  )
}

function FilterTransferPane<Query extends Record<string, unknown>>({
  emptyText,
  filterMap,
  items,
  onChange,
  onToggle,
  onShuttle,
  prefixCls,
  selectedKeys,
  title,
  value,
  placement,
}: {
  emptyText: string
  filterMap: Map<string, ProTableFilter<Query>>
  items: ProTableFilterPreference[]
  onChange: (next: ProTableFilterPreference[]) => void
  onToggle: (key: string) => void
  onShuttle: (key: string) => void
  prefixCls: string
  selectedKeys: Set<string>
  title: string
  value: ProTableFilterPreference[]
  placement: ProTableFilterPreference['placement']
}) {
  return (
    <section className={`${prefixCls}-filters-pane`}>
      <div className={`${prefixCls}-filters-pane-header`}>
        <span className={`${prefixCls}-filters-pane-title`}>{title}</span>
        <span className={`${prefixCls}-filters-pane-count`}>{items.length}</span>
      </div>
      <div className={`${prefixCls}-filters-pane-list`}>
        {items.length === 0 ? (
          <div className={`${prefixCls}-filters-pane-empty`}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
          </div>
        ) : (
          <SortableList
            className={`${prefixCls}-columns-selected-list-clip`}
            items={items}
            getKey={(item) => item.key}
            modifiers={filterDragModifiers}
            onReorder={(orderedKeys) =>
              onChange(replacePlacementFilterOrder(value, placement, orderedKeys))
            }
            renderItem={(preference, { dragHandleProps, rowRef, dragging, style }) => {
              const filter = filterMap.get(preference.key)
              if (!filter) {
                return null
              }
              return (
                <TransferFilterRow
                  key={preference.key}
                  checked={selectedKeys.has(preference.key)}
                  dragHandleProps={dragHandleProps}
                  dragging={dragging}
                  label={filter.label}
                  prefixCls={prefixCls}
                  rowRef={rowRef}
                  style={style}
                  onMoveTop={() => onChange(moveGroupedFilterToTop(value, preference.key))}
                  onShuttle={() => onShuttle(preference.key)}
                  onToggle={() => onToggle(preference.key)}
                />
              )
            }}
          />
        )}
      </div>
    </section>
  )
}

export function FilterSettingsPanel<Query extends Record<string, unknown>>({
  filters,
  value,
  prefixCls,
  className,
  onChange,
}: FilterSettingsPanelProps<Query>) {
  const intl = useIntl()
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(() => new Set())
  const filterMap = React.useMemo(
    () => new Map(filters.map((filter) => [String(filter.key), filter])),
    [filters],
  )
  const orderedItems = React.useMemo(() => groupFilterPreferencesByPlacement(value), [value])
  const rowItems = orderedItems.filter((item) => item.placement === 'row')
  const moreItems = orderedItems.filter((item) => item.placement === 'more')

  const selectedIn = (items: ProTableFilterPreference[]) =>
    items.map((item) => item.key).filter((key) => selectedKeys.has(key))

  const moveKeys = (keys: string[], placement: ProTableFilterPreference['placement']) => {
    if (keys.length === 0) {
      return
    }
    onChange(setFilterPlacements(value, keys, placement))
    setSelectedKeys((current) => {
      const next = new Set(current)
      keys.forEach((key) => next.delete(key))
      return next
    })
  }

  const toggleKey = (key: string) => {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const selectedRowKeys = selectedIn(rowItems)
  const selectedMoreKeys = selectedIn(moreItems)

  return (
    <div className={clsx(`${prefixCls}-filters-panel`, className)}>
      <div className={`${prefixCls}-filters-panel-layout`}>
        <FilterTransferPane
          emptyText={intl.getMessage('zby.pro.table.filterOutsideEmpty', '暂无默认展示的筛选')}
          filterMap={filterMap}
          items={rowItems}
          onChange={onChange}
          onShuttle={(key) => moveKeys([key], 'more')}
          onToggle={toggleKey}
          placement="row"
          prefixCls={prefixCls}
          selectedKeys={selectedKeys}
          title={intl.getMessage('zby.pro.table.filterOutsideTitle', '默认展示')}
          value={value}
        />
        <div className={`${prefixCls}-filters-operations`}>
          <Button
            type="primary"
            size="small"
            icon={<RightOutlined />}
            disabled={selectedRowKeys.length === 0}
            title={intl.getMessage('zby.pro.table.filterMoveToMore', '移到更多筛选')}
            aria-label={intl.getMessage('zby.pro.table.filterMoveToMore', '移到更多筛选')}
            onClick={() => moveKeys(selectedRowKeys, 'more')}
          />
          <Button
            type="primary"
            size="small"
            icon={<LeftOutlined />}
            disabled={selectedMoreKeys.length === 0}
            title={intl.getMessage('zby.pro.table.filterMoveToRow', '移到默认展示')}
            aria-label={intl.getMessage('zby.pro.table.filterMoveToRow', '移到默认展示')}
            onClick={() => moveKeys(selectedMoreKeys, 'row')}
          />
          <Button
            size="small"
            icon={<DoubleRightOutlined />}
            disabled={rowItems.length === 0}
            title={intl.getMessage('zby.pro.table.filterMoveAllToMore', '全部移到更多筛选')}
            aria-label={intl.getMessage('zby.pro.table.filterMoveAllToMore', '全部移到更多筛选')}
            onClick={() => moveKeys(rowItems.map((item) => item.key), 'more')}
          />
          <Button
            size="small"
            icon={<DoubleLeftOutlined />}
            disabled={moreItems.length === 0}
            title={intl.getMessage('zby.pro.table.filterMoveAllToRow', '全部移到默认展示')}
            aria-label={intl.getMessage('zby.pro.table.filterMoveAllToRow', '全部移到默认展示')}
            onClick={() => moveKeys(moreItems.map((item) => item.key), 'row')}
          />
        </div>
        <FilterTransferPane
          emptyText={intl.getMessage('zby.pro.table.filterMoreEmpty', '暂无更多筛选')}
          filterMap={filterMap}
          items={moreItems}
          onChange={onChange}
          onShuttle={(key) => moveKeys([key], 'row')}
          onToggle={toggleKey}
          placement="more"
          prefixCls={prefixCls}
          selectedKeys={selectedKeys}
          title={intl.getMessage('zby.pro.table.moreFilters', '更多筛选')}
          value={value}
        />
      </div>
    </div>
  )
}
