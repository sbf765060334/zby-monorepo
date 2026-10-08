import * as React from 'react'
import { useIntl } from '@zby/intl'
import { Button, ConfigProvider } from 'antd'
import { clsx } from 'clsx'

import { ProModal } from '../../pro-modal'
import type { ProTableColumnPreference } from '../interface'
import useStyle from '../style'
import type { ProTableColumnDefinition } from '../utils/columns'
import { buildDefaultColumnPreferences, cloneColumnPreferences, mergeColumnSettingsDraft } from '../utils/field-config'
import { ColumnSettingsPanel } from './ColumnSettingsPanel'

export type ColumnSettingsProps = {
  open: boolean
  definitions: ProTableColumnDefinition[]
  currentPreferences: ProTableColumnPreference[]
  maxVisible?: number
  maxFixed?: number
  onApply: (items: ProTableColumnPreference[]) => void | Promise<void>
  onCancel: () => void
  getContainer?: () => HTMLElement
  prefixCls?: string
  className?: string
  rootClassName?: string
  style?: React.CSSProperties
}

export function ColumnSettings({
  open,
  definitions,
  currentPreferences,
  maxVisible,
  maxFixed,
  onApply,
  onCancel,
  getContainer,
  prefixCls: customizePrefixCls,
  className,
  rootClassName,
  style,
}: ColumnSettingsProps) {
  const { getPrefixCls } = React.useContext(ConfigProvider.ConfigContext)
  const prefixCls = getPrefixCls('pro-table', customizePrefixCls)
  const intl = useIntl()
  const [hashId, cssVarCls] = useStyle(prefixCls)
  const [draft, setDraft] = React.useState<ProTableColumnPreference[]>(currentPreferences)
  const wasOpenRef = React.useRef(false)

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      setDraft(cloneColumnPreferences(currentPreferences))
    }
    wasOpenRef.current = open
  }, [currentPreferences, open])

  return (
    <ProModal
      title={intl.getMessage('zby.pro.table.columnsModalTitle', '列设置')}
      open={open}
      onCancel={onCancel}
      getContainer={getContainer}
      destroyOnHidden
      width="fit-content"
      bodyHeightMode="height"
      className={className}
      rootClassName={clsx(`${prefixCls}-columns-modal`, hashId, cssVarCls, rootClassName)}
      style={style}
      styles={{
        body: { padding: 0 },
        footer: { width: '100%' },
      }}
      footer={(
        <div className={`${prefixCls}-columns-modal-footer`}>
          <Button
            autoInsertSpace={false}
            onClick={() => setDraft(buildDefaultColumnPreferences(definitions))}
          >
            {intl.getMessage('zby.pro.table.resetDefault', '恢复默认')}
          </Button>
          <div className={`${prefixCls}-columns-modal-footer-actions`}>
            <Button autoInsertSpace={false} onClick={onCancel}>
              {intl.getMessage('zby.pro.table.cancel', '取消')}
            </Button>
            <Button
              autoInsertSpace={false}
              type="primary"
              onClick={() => void onApply(mergeColumnSettingsDraft(draft, currentPreferences))}
            >
              {intl.getMessage('zby.pro.table.confirm', '确定')}
            </Button>
          </div>
        </div>
      )}
    >
      <div className={`${prefixCls}-columns-modal-body`}>
        <ColumnSettingsPanel
          definitions={definitions}
          value={draft}
          maxVisible={maxVisible}
          maxFixed={maxFixed}
          prefixCls={prefixCls}
          onChange={setDraft}
        />
      </div>
    </ProModal>
  )
}

export default ColumnSettings
