import * as React from 'react'
import { CloseOutlined, HolderOutlined, SearchOutlined, VerticalAlignTopOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { ActionIcon } from '@zby/ui'
import { Button, Checkbox, Empty, Input, Typography, message } from 'antd'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

import { SortableList } from '../../pro-sortable-list'
import { restrictToFirstScrollableAncestor } from '../../pro-sortable-list/restrict-transform'
import type { ProTableFilter, ProTableFilterPlacement, ProTableFilterPreference } from '../interface'
import {
  getFilterReorderRejection,
  groupFilterPreferencesByPlacement,
  moveGroupedFilterToTop,
  replaceGroupedFilterOrder,
  setFilterPlacement,
  setFilterPlacements,
} from '../utils/filter-config'

const filterDragModifiers = [restrictToFirstScrollableAncestor]

type FilterSettingsPanelProps<Query extends Record<string, unknown>> = {
  filters: ProTableFilter<Query>[]
  value: ProTableFilterPreference[]
  prefixCls: string
  onChange: (next: ProTableFilterPreference[]) => void
}

type OrderedFilterRowProps = {
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  dragging?: boolean
  label: ReactNode
  moreStart?: boolean
  placement: ProTableFilterPlacement
  prefixCls: string
  rowRef?: React.Ref<HTMLDivElement>
  style?: React.CSSProperties
  onMoveTop: () => void
  onRemove?: () => void
}

function getFilterLabelText(label: ReactNode, key: string) {
  if (typeof label === 'string' || typeof label === 'number') {
    return String(label)
  }
  return key
}

function OrderedFilterRow({
  dragHandleProps,
  dragging = false,
  label,
  moreStart = false,
  placement,
  prefixCls,
  rowRef,
  style,
  onMoveTop,
  onRemove,
}: OrderedFilterRowProps) {
  const intl = useIntl()
  const removeTitle = intl.getMessage('zby.pro.table.removeColumn', '移除')
  const pinTopTitle = intl.getMessage('zby.pro.table.pinTop', '置顶')

  return (
    <div
      ref={rowRef}
      className={clsx(
        `${prefixCls}-columns-selected-row`,
        dragging && `${prefixCls}-columns-selected-row-dragging`,
        placement === 'more' && `${prefixCls}-columns-selected-row-more`,
        moreStart && `${prefixCls}-columns-selected-row-more-start`,
      )}
      style={style}
    >
      <span className={`${prefixCls}-columns-selected-dragger`} {...dragHandleProps}>
        <HolderOutlined />
      </span>
      <span className={`${prefixCls}-columns-selected-title`} title={getFilterLabelText(label, '')}>
        {label}
      </span>
      <span className={`${prefixCls}-columns-selected-actions`}>
        {onRemove ? (
          <ActionIcon
            className={`${prefixCls}-columns-selected-action`}
            icon={<CloseOutlined />}
            size="small"
            title={removeTitle}
            aria-label={removeTitle}
            onClick={onRemove}
          />
        ) : null}
        <ActionIcon
          className={`${prefixCls}-columns-selected-action`}
          icon={<VerticalAlignTopOutlined />}
          size="small"
          title={pinTopTitle}
          aria-label={pinTopTitle}
          onClick={onMoveTop}
        />
        {placement === 'more' ? (
          <Typography.Text type="secondary">
            {intl.getMessage('zby.pro.table.more', '更多')}
          </Typography.Text>
        ) : null}
      </span>
    </div>
  )
}

export function FilterSettingsPanel<Query extends Record<string, unknown>>({
  filters,
  value,
  prefixCls,
  onChange,
}: FilterSettingsPanelProps<Query>) {
  const intl = useIntl()
  const [messageApi, messageContextHolder] = message.useMessage()
  const [keyword, setKeyword] = React.useState('')
  const filterMap = React.useMemo(
    () => new Map(filters.map((filter) => [String(filter.key), filter])),
    [filters],
  )
  const orderedItems = React.useMemo(() => groupFilterPreferencesByPlacement(value), [value])
  const selectedCount = orderedItems.filter((item) => item.placement === 'row').length
  const firstMoreKey = orderedItems.find((item) => item.placement === 'more')?.key
  const filteredFilters = React.useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    const ordered = orderedItems
      .map((item) => filterMap.get(item.key))
      .filter((item): item is ProTableFilter<Query> => Boolean(item))
    if (!normalizedKeyword) {
      return ordered
    }
    return ordered.filter((item) =>
      getFilterLabelText(item.label, String(item.key)).toLowerCase().includes(normalizedKeyword),
    )
  }, [filterMap, keyword, orderedItems])

  const toggleField = (key: string, checked: boolean) => {
    onChange(setFilterPlacement(value, key, checked ? 'row' : 'more'))
  }

  const toggleAll = (checked: boolean) => {
    const editableKeys = filteredFilters.map((item) => String(item.key))
    onChange(setFilterPlacements(value, editableKeys, checked ? 'row' : 'more'))
  }

  const rejectCrossGroupReorder = (activeKey: string, overKey: string) => {
    if (!getFilterReorderRejection(activeKey, overKey, orderedItems)) {
      return true
    }
    void messageApi.info(
      intl.getMessage(
        'zby.pro.table.filterReorderCrossGroup',
        '外面的筛选和更多筛选不能交叉排序',
      ),
    )
    return false
  }

  const sectionKeys = filteredFilters.map((item) => String(item.key))
  const checkedCount = sectionKeys.filter(
    (key) => value.find((item) => item.key === key)?.placement === 'row',
  ).length
  const allChecked = checkedCount === sectionKeys.length && sectionKeys.length > 0
  const showCatalogEmpty = keyword.trim().length > 0 && filteredFilters.length === 0

  return (
    <div className={`${prefixCls}-columns-panel`}>
      {messageContextHolder}
      <div className={`${prefixCls}-columns-panel-layout`}>
        <div className={`${prefixCls}-columns-catalog`}>
          <Input
            allowClear
            className={`${prefixCls}-columns-catalog-search`}
            prefix={<SearchOutlined />}
            placeholder={intl.getMessage('zby.pro.table.columnSearchPlaceholder', '请输入查询')}
            value={keyword}
            variant="underlined"
            onChange={(event) => setKeyword(event.target.value)}
          />
          <div className={`${prefixCls}-columns-catalog-list`}>
            {showCatalogEmpty ? (
              <div className={`${prefixCls}-columns-catalog-empty`}>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              <section className={`${prefixCls}-columns-catalog-section`}>
                <div className={`${prefixCls}-columns-catalog-section-header`}>
                  <span className={`${prefixCls}-columns-catalog-section-title`}>
                    {intl.getMessage('zby.pro.table.fieldInfo', '字段信息')}
                  </span>
                  <Button type="link" autoInsertSpace={false} onClick={() => toggleAll(!allChecked)}>
                    {allChecked
                      ? intl.getMessage('zby.pro.table.deselectAll', '取消全选')
                      : intl.getMessage('zby.pro.table.selectAll', '全选')}
                  </Button>
                </div>
                <div className={`${prefixCls}-columns-catalog-grid`}>
                  {filteredFilters.map((filter) => {
                    const preference = value.find((item) => item.key === String(filter.key))
                    const checked = preference?.placement === 'row'
                    const labelText = getFilterLabelText(filter.label, String(filter.key))

                    return (
                      <label key={String(filter.key)} className={`${prefixCls}-columns-catalog-item`}>
                        <Checkbox
                          checked={checked}
                          onChange={(event) => toggleField(String(filter.key), event.target.checked)}
                        >
                          <Typography.Text
                            className={`${prefixCls}-columns-catalog-text`}
                            ellipsis={{ tooltip: labelText }}
                          >
                            {filter.label}
                          </Typography.Text>
                        </Checkbox>
                      </label>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
        <div className={`${prefixCls}-columns-selected`}>
          <div className={`${prefixCls}-columns-selected-header`}>
            <span>
              {intl.getMessage('zby.pro.table.selectedCount', '已选 {{count}}', {
                count: selectedCount,
              })}
            </span>
          </div>
          <div className={`${prefixCls}-columns-selected-list`}>
            <SortableList
              className={`${prefixCls}-columns-selected-list-clip`}
              items={orderedItems}
              getKey={(item) => item.key}
              modifiers={filterDragModifiers}
              onBeforeReorder={rejectCrossGroupReorder}
              onReorder={(orderedKeys) => onChange(replaceGroupedFilterOrder(value, orderedKeys))}
              renderItem={(preference, { dragHandleProps, rowRef, dragging, style }) => {
                const filter = filterMap.get(preference.key)
                if (!filter) {
                  return null
                }
                return (
                  <OrderedFilterRow
                    key={preference.key}
                    dragHandleProps={dragHandleProps}
                    dragging={dragging}
                    label={filter.label}
                    moreStart={preference.key === firstMoreKey}
                    placement={preference.placement}
                    prefixCls={prefixCls}
                    rowRef={rowRef}
                    style={style}
                    onMoveTop={() => onChange(moveGroupedFilterToTop(value, preference.key))}
                    onRemove={
                      preference.placement === 'row'
                        ? () => onChange(setFilterPlacement(value, preference.key, 'more'))
                        : undefined
                    }
                  />
                )
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
