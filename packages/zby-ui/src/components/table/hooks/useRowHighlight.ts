import type { GetRowKey, TableProps as RcTableProps } from '../RcTableInner'
import * as React from 'react'

import useControllableValue from '../../_util/hooks/useControllableValue'
import type { TableRowHighlight } from '../interface'

interface UseRowHighlightOptions<RecordType extends object> {
  config?: TableRowHighlight<RecordType>
  getRowKey: GetRowKey<RecordType>
  onRow?: RcTableProps<RecordType>['onRow']
  prefixCls: string
}

export default function useRowHighlight<RecordType extends object>(
  options: UseRowHighlightOptions<RecordType>,
) {
  const { config, getRowKey, onRow, prefixCls } = options
  const highlightProps = config ?? {}
  const [currentRowKey, setCurrentRowKey] = useControllableValue<
    React.Key | null
  >(highlightProps, {
    defaultValue: null,
    valuePropName: 'currentRowKey',
    defaultValuePropName: 'defaultCurrentRowKey',
    trigger: 'onChange',
  })

  const getHighlightClassName = React.useCallback(
    (record: RecordType, index?: number) =>
      config && getRowKey(record, index) === currentRowKey
        ? `${prefixCls}-row-current`
        : '',
    [config, currentRowKey, getRowKey, prefixCls],
  )

  const mergedOnRow = React.useCallback(
    (record: RecordType, index?: number) => {
      const userRowProps = onRow?.(record, index) ?? {}
      if (!config) return userRowProps

      const recordKey = getRowKey(record, index)
      const isCurrent = recordKey === currentRowKey

      return {
        ...userRowProps,
        'aria-current': isCurrent ? ('true' as const) : undefined,
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          userRowProps.onClick?.(event)
          if (event.defaultPrevented) return

          if (isCurrent) setCurrentRowKey(null, null)
          else setCurrentRowKey(recordKey, record)
        },
      }
    },
    [config, currentRowKey, getRowKey, onRow, setCurrentRowKey],
  )

  return {
    getHighlightClassName,
    onRow: mergedOnRow,
  }
}
