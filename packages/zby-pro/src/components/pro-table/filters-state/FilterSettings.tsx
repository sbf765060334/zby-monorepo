import * as React from 'react'
import { useIntl } from '@zby/intl'
import { Button, ConfigProvider } from 'antd'
import { clsx } from 'clsx'

import { ProModal } from '../../pro-modal'
import type { ProTableFilter, ProTableFilterPreference } from '../interface'
import useStyle from '../style'
import { buildDefaultFilterPreferences, cloneFilterPreferences } from '../utils/filter-config'
import { FilterSettingsPanel } from './FilterSettingsPanel'

export type FilterSettingsProps<Query extends Record<string, unknown>> = {
  open: boolean
  filters: ProTableFilter<Query>[]
  currentPreferences: ProTableFilterPreference[]
  onApply: (items: ProTableFilterPreference[]) => void | Promise<void>
  onCancel: () => void
  prefixCls?: string
}

export function FilterSettings<Query extends Record<string, unknown>>({
  open,
  filters,
  currentPreferences,
  onApply,
  onCancel,
  prefixCls: customizePrefixCls,
}: FilterSettingsProps<Query>) {
  const { getPrefixCls } = React.useContext(ConfigProvider.ConfigContext)
  const prefixCls = getPrefixCls('pro-table', customizePrefixCls)
  const intl = useIntl()
  const [hashId, cssVarCls] = useStyle(prefixCls)
  const [draft, setDraft] = React.useState<ProTableFilterPreference[]>(currentPreferences)

  React.useEffect(() => {
    if (open) {
      setDraft(cloneFilterPreferences(currentPreferences))
    }
  }, [currentPreferences, open])

  return (
    <ProModal
      title={intl.getMessage('zby.pro.table.filtersModalTitle', '筛选设置')}
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      width="fit-content"
      bodyHeightMode="height"
      rootClassName={clsx(`${prefixCls}-columns-modal`, hashId, cssVarCls)}
      className={clsx(hashId, cssVarCls)}
      styles={{
        body: { padding: 0 },
        footer: { width: '100%' },
      }}
      footer={(
        <div className={`${prefixCls}-columns-modal-footer`}>
          <Button
            autoInsertSpace={false}
            onClick={() => setDraft(buildDefaultFilterPreferences(filters))}
          >
            {intl.getMessage('zby.pro.table.resetDefault', '恢复默认')}
          </Button>
          <div className={`${prefixCls}-columns-modal-footer-actions`}>
            <Button autoInsertSpace={false} onClick={onCancel}>
              {intl.getMessage('zby.pro.table.cancel', '取消')}
            </Button>
            <Button autoInsertSpace={false} type="primary" onClick={() => void onApply(draft)}>
              {intl.getMessage('zby.pro.table.confirm', '确定')}
            </Button>
          </div>
        </div>
      )}
    >
      <div className={clsx(`${prefixCls}-filters-modal-body`, hashId, cssVarCls)}>
        <FilterSettingsPanel
          className={clsx(hashId, cssVarCls)}
          filters={filters}
          value={draft}
          prefixCls={prefixCls}
          onChange={setDraft}
        />
      </div>
    </ProModal>
  )
}
