import type { GetRowKey, TableProps as RcTableProps } from '../RcTableInner'
import { ConfigContext } from 'antd/es/config-provider/context'
import * as React from 'react'

import useControllableValue from '../../_util/hooks/useControllableValue'
import type { TableRowHighlight } from '../interface'

interface UseRowHighlightOptions<RecordType extends object> {
  config?: boolean | TableRowHighlight<RecordType>
  getRowKey: GetRowKey<RecordType>
  onRow?: RcTableProps<RecordType>['onRow']
  prefixCls: string
}

const INTERACTIVE_SELECTOR_CORE = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="combobox"]',
  '[role="menuitem"]',
  '[role="slider"]',
  '[data-row-click-ignore]',
].join(', ')

function getInteractiveSelector(getPrefixCls: (suffixCls?: string) => string) {
  return [
    INTERACTIVE_SELECTOR_CORE,
    `.${getPrefixCls('select')}`,
    `.${getPrefixCls('picker')}`,
    `.${getPrefixCls('dropdown')}-trigger`,
    `.${getPrefixCls('input-number')}`,
  ].join(', ')
}

function isInteractiveEventTarget(
  target: EventTarget | null,
  selector: string,
) {
  const element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null
  return Boolean(element?.closest(selector))
}

export default function useRowHighlight<RecordType extends object>(
  options: UseRowHighlightOptions<RecordType>,
) {
  const { config, getRowKey, onRow, prefixCls } = options
  const { getPrefixCls } = React.useContext(ConfigContext)
  const interactiveSelector = React.useMemo(
    () => getInteractiveSelector(getPrefixCls),
    [getPrefixCls],
  )
  const enabled = Boolean(config)
  const highlightProps =
    typeof config === 'object'
      ? {
          currentRowKey: config.currentRowKey,
          onChange: config.onChange,
        }
      : {}
  const [currentRowKey, setCurrentRowKey] = useControllableValue<
    React.Key | null
  >(highlightProps, {
    defaultValue: null,
    valuePropName: 'currentRowKey',
    trigger: 'onChange',
  })

  const getHighlightClassName = React.useCallback(
    (record: RecordType, index?: number) =>
      enabled && getRowKey(record, index) === currentRowKey
        ? `${prefixCls}-row-current`
        : '',
    [currentRowKey, enabled, getRowKey, prefixCls],
  )

  const mergedOnRow = React.useCallback(
    (record: RecordType, index?: number) => {
      const userRowProps = onRow?.(record, index) ?? {}
      if (!enabled) return userRowProps

      const recordKey = getRowKey(record, index)
      const isCurrent = recordKey === currentRowKey

      return {
        ...userRowProps,
        'aria-current': isCurrent ? ('true' as const) : undefined,
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          userRowProps.onClick?.(event)
          if (event.defaultPrevented) return
          if (isInteractiveEventTarget(event.target, interactiveSelector)) {
            return
          }

          if (isCurrent) setCurrentRowKey(null, null)
          else setCurrentRowKey(recordKey, record)
        },
      }
    },
    [
      currentRowKey,
      enabled,
      getRowKey,
      interactiveSelector,
      onRow,
      setCurrentRowKey,
    ],
  )

  return {
    getHighlightClassName,
    onRow: mergedOnRow,
  }
}
