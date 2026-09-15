import * as React from 'react'
import {
  CloseOutlined,
  HolderOutlined,
  PushpinFilled,
  PushpinOutlined,
  SearchOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { ActionIcon } from '@zby/ui'
import { Button, Checkbox, Empty, Input, Tooltip, Typography } from 'antd'
import { clsx } from 'clsx'

import { SortableList } from '../../pro-sortable-list'
import type { ProTableColumnPreference } from '../interface'
import type { ProTableColumnDefinition } from '../utils/columns'
import { updateColumnPreference } from '../utils/field-config'

type ColumnSettingsPanelProps = {
  definitions: ProTableColumnDefinition[]
  value: ProTableColumnPreference[]
  maxVisible?: number
  maxFixed?: number
  prefixCls: string
  onChange: (next: ProTableColumnPreference[]) => void
}

type SelectedColumnRowProps = {
  definition: ProTableColumnDefinition
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  dragging?: boolean
  fixedCount: number
  maxFixed?: number
  preference: ProTableColumnPreference
  prefixCls: string
  rowRef?: React.Ref<HTMLDivElement>
  sortable: boolean
  style?: React.CSSProperties
  localeText: {
    remove: string
    pinTop: string
    pinLeft: string
    pinRight: string
    unpinLeft: string
    unpinRight: string
    fixedLimitReached: string
  }
  onChange: (patch: Partial<ProTableColumnPreference>) => void
  onMoveTop: () => void
  onRemove: () => void
}

function normalizePreferenceOrder(items: ProTableColumnPreference[]) {
  return items.map((item, index) => ({ ...item, order: index }))
}

function sortSelectedPreferences(items: ProTableColumnPreference[]) {
  return items
    .filter((item) => item.visible)
    .slice()
    .sort((left, right) => {
      const weight = (item: ProTableColumnPreference) =>
        item.pin === 'left' ? 0 : item.pin === 'right' ? 2 : 1
      const leftWeight = weight(left)
      const rightWeight = weight(right)
      return leftWeight === rightWeight ? left.order - right.order : leftWeight - rightWeight
    })
}

function replaceVisibleOrder(items: ProTableColumnPreference[], orderedVisibleKeys: string[]) {
  const orderMap = new Map(orderedVisibleKeys.map((key, index) => [key, index]))
  const visibleCount = orderedVisibleKeys.length

  return normalizePreferenceOrder(
    items
      .map((item) => ({
        ...item,
        order: item.visible ? (orderMap.get(item.key) ?? item.order) : visibleCount + item.order,
      }))
      .sort((left, right) => left.order - right.order),
  )
}

function moveVisibleToTop(items: ProTableColumnPreference[], key: string) {
  const selected = sortSelectedPreferences(items)
  const leftFixedKeys = selected.filter((item) => item.pin === 'left').map((item) => item.key)
  const rightFixedKeys = selected.filter((item) => item.pin === 'right').map((item) => item.key)
  const restKeys = selected.filter((item) => !item.pin && item.key !== key).map((item) => item.key)
  return replaceVisibleOrder(items, leftFixedKeys.concat(key, restKeys, rightFixedKeys))
}

function getColumnLabelText(definition: ProTableColumnDefinition) {
  if (typeof definition.label === 'string' || typeof definition.label === 'number') {
    return String(definition.label)
  }
  return definition.key
}

function SelectedColumnRow({
  definition,
  dragHandleProps,
  dragging = false,
  fixedCount,
  maxFixed,
  onChange,
  onMoveTop,
  onRemove,
  preference,
  prefixCls,
  rowRef,
  sortable,
  style,
  localeText,
}: SelectedColumnRowProps) {
  const canRemove = definition.capabilities?.visibility !== false
  const canPin = definition.capabilities?.pinning !== false
  const fixed = preference.pin ?? null
  const pinDisabled = !fixed && typeof maxFixed === 'number' && fixedCount >= maxFixed
  const fixedPinAction = fixed ? (
    <ActionIcon
      className={clsx(
        `${prefixCls}-columns-selected-action`,
        `${prefixCls}-columns-selected-action-pin-fixed`,
        fixed === 'right' && `${prefixCls}-columns-selected-action-pin-right-fixed`,
      )}
      disabled={!canPin}
      icon={<PushpinFilled />}
      size="small"
      aria-label={fixed === 'right' ? localeText.unpinRight : localeText.unpinLeft}
      onClick={canPin ? () => onChange({ pin: null }) : undefined}
    />
  ) : null

  return (
    <div
      ref={rowRef}
      className={clsx(
        `${prefixCls}-columns-selected-row`,
        fixed && `${prefixCls}-columns-selected-row-fixed`,
        dragging && `${prefixCls}-columns-selected-row-dragging`,
      )}
      style={style}
    >
      <span className={`${prefixCls}-columns-selected-dragger`} {...(sortable ? dragHandleProps : {})}>
        {!fixed && sortable ? <HolderOutlined /> : null}
      </span>
      <span className={`${prefixCls}-columns-selected-title`}>{definition.label}</span>
      <span className={`${prefixCls}-columns-selected-actions`}>
        {canRemove ? (
          <Tooltip title={localeText.remove}>
            <ActionIcon
              className={`${prefixCls}-columns-selected-action`}
              icon={<CloseOutlined />}
              size="small"
              aria-label={localeText.remove}
              onClick={onRemove}
            />
          </Tooltip>
        ) : null}
        {fixed ? (
          canPin ? (
            <Tooltip title={fixed === 'right' ? localeText.unpinRight : localeText.unpinLeft}>
              {fixedPinAction}
            </Tooltip>
          ) : (
            fixedPinAction
          )
        ) : null}
        {!fixed && sortable ? (
          <Tooltip title={localeText.pinTop}>
            <ActionIcon
              className={`${prefixCls}-columns-selected-action`}
              icon={<VerticalAlignTopOutlined />}
              size="small"
              aria-label={localeText.pinTop}
              onClick={onMoveTop}
            />
          </Tooltip>
        ) : null}
        {!fixed && canPin ? (
          <>
            <Tooltip title={pinDisabled ? localeText.fixedLimitReached : localeText.pinLeft}>
              <span className={pinDisabled ? `${prefixCls}-columns-selected-action-wrap` : undefined}>
                <ActionIcon
                  className={`${prefixCls}-columns-selected-action`}
                  disabled={pinDisabled}
                  icon={<PushpinOutlined />}
                  size="small"
                  aria-label={localeText.pinLeft}
                  onClick={pinDisabled ? undefined : () => onChange({ pin: 'left' })}
                />
              </span>
            </Tooltip>
            <Tooltip title={pinDisabled ? localeText.fixedLimitReached : localeText.pinRight}>
              <span className={pinDisabled ? `${prefixCls}-columns-selected-action-wrap` : undefined}>
                <ActionIcon
                  className={clsx(
                    `${prefixCls}-columns-selected-action`,
                    `${prefixCls}-columns-selected-action-pin-right`,
                  )}
                  disabled={pinDisabled}
                  icon={<PushpinOutlined />}
                  size="small"
                  aria-label={localeText.pinRight}
                  onClick={pinDisabled ? undefined : () => onChange({ pin: 'right' })}
                />
              </span>
            </Tooltip>
          </>
        ) : null}
      </span>
    </div>
  )
}

export function ColumnSettingsPanel({
  definitions,
  value,
  maxVisible,
  maxFixed,
  prefixCls,
  onChange,
}: ColumnSettingsPanelProps) {
  const intl = useIntl()
  const [keyword, setKeyword] = React.useState('')
  const definitionMap = React.useMemo(
    () => new Map(definitions.map((item) => [item.key, item])),
    [definitions],
  )
  const visibleCount = value.filter((item) => item.visible).length
  const fixedCount = value.filter((item) => item.visible && item.pin).length
  const selectedItems = React.useMemo(() => sortSelectedPreferences(value), [value])
  const leftFixedSelectedItems = selectedItems.filter((item) => item.pin === 'left')
  const rightFixedSelectedItems = selectedItems.filter((item) => item.pin === 'right')
  const sortableSelectedItems = selectedItems.filter((item) => !item.pin)
  const filteredDefinitions = React.useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    const ordered = value
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((item) => definitionMap.get(item.key))
      .filter((item): item is ProTableColumnDefinition => Boolean(item))
    if (!normalizedKeyword) return ordered
    return ordered.filter((item) => getColumnLabelText(item).toLowerCase().includes(normalizedKeyword))
  }, [definitionMap, keyword, value])
  const rowLocaleText = React.useMemo(
    () => ({
      remove: intl.getMessage('zby.pro.table.removeColumn', '移除'),
      pinTop: intl.getMessage('zby.pro.table.pinTop', '置顶'),
      pinLeft: intl.getMessage('zby.pro.table.pinLeft', '左固定'),
      pinRight: intl.getMessage('zby.pro.table.pinRight', '右固定'),
      unpinLeft: intl.getMessage('zby.pro.table.unpinLeft', '取消左固定'),
      unpinRight: intl.getMessage('zby.pro.table.unpinRight', '取消右固定'),
      fixedLimitReached: intl.getMessage('zby.pro.table.fixedLimitReached', '已达到固定上限'),
    }),
    [intl],
  )

  const toggleField = (key: string, checked: boolean) => {
    if (checked && typeof maxVisible === 'number' && visibleCount >= maxVisible) {
      return
    }
    onChange(updateColumnPreference(value, key, { visible: checked }))
  }

  const toggleAll = (checked: boolean) => {
    const editableKeys = filteredDefinitions
      .filter((item) => item.capabilities?.visibility !== false)
      .map((item) => item.key)
    const nextVisibleCount = checked
      ? visibleCount +
        editableKeys.filter((key) => !value.find((item) => item.key === key)?.visible).length
      : visibleCount -
        editableKeys.filter((key) => value.find((item) => item.key === key)?.visible).length

    if (checked && typeof maxVisible === 'number' && nextVisibleCount > maxVisible) {
      return
    }

    onChange(
      normalizePreferenceOrder(
        value.map((item) =>
          editableKeys.includes(item.key) ? { ...item, visible: checked } : item,
        ),
      ),
    )
  }

  const reorderSortableItems = (orderedKeys: string[]) => {
    onChange(
      replaceVisibleOrder(
        value,
        leftFixedSelectedItems
          .map((item) => item.key)
          .concat(orderedKeys, rightFixedSelectedItems.map((item) => item.key)),
      ),
    )
  }

  const sectionKeys = filteredDefinitions.map((item) => item.key)
  const checkedCount = sectionKeys.filter(
    (key) => value.find((item) => item.key === key)?.visible,
  ).length
  const allChecked = checkedCount === sectionKeys.length && sectionKeys.length > 0
  const showCatalogEmpty = keyword.trim().length > 0 && filteredDefinitions.length === 0

  return (
    <div className={`${prefixCls}-columns-panel`}>
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
                  {filteredDefinitions.map((definition) => {
                    const preference = value.find((item) => item.key === definition.key)
                    const checked = Boolean(preference?.visible)
                    const disabled =
                      definition.capabilities?.visibility === false ||
                      (!checked && typeof maxVisible === 'number' && visibleCount >= maxVisible)

                    return (
                      <label key={definition.key} className={`${prefixCls}-columns-catalog-item`}>
                        <Checkbox
                          checked={checked}
                          disabled={disabled}
                          onChange={(event) => toggleField(definition.key, event.target.checked)}
                        >
                          <Typography.Text
                            className={`${prefixCls}-columns-catalog-text`}
                            ellipsis={{ tooltip: getColumnLabelText(definition) }}
                          >
                            {definition.label}
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
                count: selectedItems.length,
              })}
              {typeof maxVisible === 'number'
                ? ` / ${intl.getMessage('zby.pro.table.selectedMax', '最多 {{count}}', {
                  count: maxVisible,
                })}`
                : ''}
            </span>
            {typeof maxFixed === 'number' ? (
              <span className={`${prefixCls}-columns-selected-fixed-limit`}>
                {intl.getMessage('zby.pro.table.maxFixed', '最多可固定 {{count}} 项', {
                  count: maxFixed,
                })}
              </span>
            ) : null}
          </div>
          <div className={`${prefixCls}-columns-selected-list`}>
            {leftFixedSelectedItems.map((preference) => {
              const definition = definitionMap.get(preference.key)
              if (!definition) return null
              return (
                <SelectedColumnRow
                  key={preference.key}
                  definition={definition}
                  fixedCount={fixedCount}
                  localeText={rowLocaleText}
                  maxFixed={maxFixed}
                  preference={preference}
                  prefixCls={prefixCls}
                  sortable={false}
                  onChange={(patch) => onChange(updateColumnPreference(value, preference.key, patch))}
                  onMoveTop={() => onChange(moveVisibleToTop(value, preference.key))}
                  onRemove={() =>
                    onChange(updateColumnPreference(value, preference.key, { visible: false }))
                  }
                />
              )
            })}
            <SortableList
              items={sortableSelectedItems}
              getKey={(item) => item.key}
              onReorder={reorderSortableItems}
              renderItem={(preference, { dragHandleProps, rowRef, dragging, style, sortable }) => {
                const definition = definitionMap.get(preference.key)
                if (!definition) return null
                return (
                  <SelectedColumnRow
                    key={preference.key}
                    definition={definition}
                    dragHandleProps={dragHandleProps}
                    dragging={dragging}
                    fixedCount={fixedCount}
                    localeText={rowLocaleText}
                    maxFixed={maxFixed}
                    preference={preference}
                    prefixCls={prefixCls}
                    rowRef={rowRef}
                    sortable={sortable}
                    style={style}
                    onChange={(patch) =>
                      onChange(updateColumnPreference(value, preference.key, patch))
                    }
                    onMoveTop={() => onChange(moveVisibleToTop(value, preference.key))}
                    onRemove={() =>
                      onChange(updateColumnPreference(value, preference.key, { visible: false }))
                    }
                  />
                )
              }}
            />
            {rightFixedSelectedItems.map((preference) => {
              const definition = definitionMap.get(preference.key)
              if (!definition) return null
              return (
                <SelectedColumnRow
                  key={preference.key}
                  definition={definition}
                  fixedCount={fixedCount}
                  localeText={rowLocaleText}
                  maxFixed={maxFixed}
                  preference={preference}
                  prefixCls={prefixCls}
                  sortable={false}
                  onChange={(patch) => onChange(updateColumnPreference(value, preference.key, patch))}
                  onMoveTop={() => onChange(moveVisibleToTop(value, preference.key))}
                  onRemove={() =>
                    onChange(updateColumnPreference(value, preference.key, { visible: false }))
                  }
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
