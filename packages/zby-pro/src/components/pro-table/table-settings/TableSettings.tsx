import * as React from 'react'
import { useIntl } from '@zby/intl'
import { Button, ConfigProvider, Modal, Tabs } from 'antd'
import { clsx } from 'clsx'

import { ProModal } from '../../pro-modal'
import { ColumnSettingsPanel } from '../columns-state/ColumnSettingsPanel'
import { FilterSettingsPanel } from '../filters-state/FilterSettingsPanel'
import type {
  ProTableColumnPreference,
  ProTableFilter,
  ProTableFilterPreference,
  ProTableQueryRecord,
} from '../interface'
import useStyle from '../style'
import type { ProTableColumnDefinition } from '../utils/columns'
import { buildDefaultColumnPreferences, cloneColumnPreferences, mergeColumnSettingsDraft } from '../utils/field-config'
import { buildDefaultFilterPreferences, cloneFilterPreferences } from '../utils/filter-config'

type SettingsTab = 'columns' | 'filters'

export type TableSettingsProps<Query extends ProTableQueryRecord> = {
  open: boolean
  definitions: ProTableColumnDefinition[]
  currentColumnPreferences: ProTableColumnPreference[]
  maxVisible?: number
  maxFixed?: number
  filters: ProTableFilter<Query>[]
  currentFilterPreferences: ProTableFilterPreference[]
  onApply: (
    columns: ProTableColumnPreference[],
    filters: ProTableFilterPreference[],
  ) => void | Promise<void>
  onCancel: () => void
  getContainer?: () => HTMLElement
  prefixCls?: string
  className?: string
  rootClassName?: string
  style?: React.CSSProperties
}

export function TableSettings<Query extends ProTableQueryRecord>({
  open,
  definitions,
  currentColumnPreferences,
  maxVisible,
  maxFixed,
  filters,
  currentFilterPreferences,
  onApply,
  onCancel,
  getContainer,
  prefixCls: customizePrefixCls,
  className,
  rootClassName,
  style,
}: TableSettingsProps<Query>) {
  const { getPrefixCls } = React.useContext(ConfigProvider.ConfigContext)
  const prefixCls = getPrefixCls('pro-table', customizePrefixCls)
  const modalPrefix = getPrefixCls('modal')
  const intl = useIntl()
  const [hashId, cssVarCls] = useStyle(prefixCls)
  const [activeTab, setActiveTab] = React.useState<SettingsTab>('columns')
  const [resetTab, setResetTab] = React.useState<SettingsTab>('columns')
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false)
  const [columnDraft, setColumnDraft] = React.useState(currentColumnPreferences)
  const [filterDraft, setFilterDraft] = React.useState(currentFilterPreferences)
  const [settingsPanel, setSettingsPanel] = React.useState<HTMLElement | null>(null)
  const wasOpenRef = React.useRef(false)
  const columnsTabTitle = intl.getMessage('zby.pro.table.columnsModalTitle', '列设置')
  const filtersTabTitle = intl.getMessage('zby.pro.table.filtersModalTitle', '筛选设置')
  const resetTabTitle = resetTab === 'columns' ? columnsTabTitle : filtersTabTitle

  const renderSettingsPanel = React.useCallback((panel: React.ReactNode) => {
    if (!React.isValidElement(panel)) {
      return panel
    }
    return React.cloneElement(panel as React.ReactElement<{ ref?: React.Ref<HTMLElement> }>, {
      ref: (node: HTMLElement | null) => {
        setSettingsPanel(node?.closest<HTMLElement>(`.${modalPrefix}`) ?? node)
      },
    })
  }, [modalPrefix])

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      setColumnDraft(cloneColumnPreferences(currentColumnPreferences))
      setFilterDraft(cloneFilterPreferences(currentFilterPreferences))
      setActiveTab('columns')
      setResetTab('columns')
      setResetConfirmOpen(false)
    }
    wasOpenRef.current = open
  }, [currentColumnPreferences, currentFilterPreferences, open])

  const handleCancel = () => {
    if (resetConfirmOpen) {
      setResetConfirmOpen(false)
      return
    }
    onCancel()
  }

  const handleResetCurrent = () => {
    if (resetTab === 'columns') {
      setColumnDraft(buildDefaultColumnPreferences(definitions))
    } else {
      setFilterDraft(buildDefaultFilterPreferences(filters))
    }
    setResetConfirmOpen(false)
  }

  const handleResetAll = () => {
    setColumnDraft(buildDefaultColumnPreferences(definitions))
    setFilterDraft(buildDefaultFilterPreferences(filters))
    setResetConfirmOpen(false)
  }

  return (
    <>
      <ProModal
        title={(
          <Tabs
            className={clsx(`${prefixCls}-settings-modal-tabs`, hashId, cssVarCls)}
            activeKey={activeTab}
            size="small"
            items={[
              { key: 'columns', label: columnsTabTitle },
              { key: 'filters', label: filtersTabTitle },
            ]}
            onChange={(key) => setActiveTab(key as SettingsTab)}
          />
        )}
        open={open}
        onCancel={handleCancel}
        getContainer={getContainer}
        modalRender={renderSettingsPanel}
        destroyOnHidden
        keyboard={!resetConfirmOpen}
        mask={{
          closable: !resetConfirmOpen,
        }}
        width={800}
        bodyHeightMode="height"
        className={className}
        rootClassName={clsx(`${prefixCls}-columns-modal`, hashId, cssVarCls, rootClassName)}
        style={style}
        styles={{
          body: {
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
          },
          footer: { width: '100%' },
        }}
        footer={(
          <div className={`${prefixCls}-columns-modal-footer`}>
            <Button
              autoInsertSpace={false}
              disabled={resetConfirmOpen}
              onClick={() => {
                setResetTab(activeTab)
                setResetConfirmOpen(true)
              }}
            >
              {intl.getMessage('zby.pro.table.resetDefault', '恢复默认')}
            </Button>
            <div className={`${prefixCls}-columns-modal-footer-actions`}>
              <Button autoInsertSpace={false} disabled={resetConfirmOpen} onClick={handleCancel}>
                {intl.getMessage('zby.pro.table.cancel', '取消')}
              </Button>
              <Button
                autoInsertSpace={false}
                type="primary"
                disabled={resetConfirmOpen}
                onClick={() =>
                  void onApply(
                    mergeColumnSettingsDraft(columnDraft, currentColumnPreferences),
                    filterDraft,
                  )}
              >
                {intl.getMessage('zby.pro.table.confirm', '确定')}
              </Button>
            </div>
          </div>
        )}
      >
        <div className={`${prefixCls}-columns-modal-body`}>
          <div
            className={`${prefixCls}-settings-tab-panel`}
            hidden={activeTab !== 'columns'}
          >
            <ColumnSettingsPanel
              definitions={definitions}
              value={columnDraft}
              maxVisible={maxVisible}
              maxFixed={maxFixed}
              prefixCls={prefixCls}
              onChange={setColumnDraft}
            />
          </div>
          <div
            className={`${prefixCls}-settings-tab-panel`}
            hidden={activeTab !== 'filters'}
          >
            <FilterSettingsPanel
              className={clsx(hashId, cssVarCls)}
              filters={filters}
              value={filterDraft}
              prefixCls={prefixCls}
              onChange={setFilterDraft}
            />
          </div>
        </div>
      </ProModal>
      <Modal
        title={intl.getMessage('zby.pro.table.resetDefault', '恢复默认')}
        open={open && resetConfirmOpen}
        onCancel={() => setResetConfirmOpen(false)}
        getContainer={settingsPanel ?? getContainer}
        destroyOnHidden
        mask={{
          closable: true,
        }}
        width={480}
        rootClassName={clsx(`${prefixCls}-settings-reset-modal`, hashId, cssVarCls)}
        footer={(
          <div className={clsx(`${prefixCls}-settings-reset-footer`, hashId, cssVarCls)}>
            <Button autoInsertSpace={false} onClick={() => setResetConfirmOpen(false)}>
              {intl.getMessage('zby.pro.table.cancel', '取消')}
            </Button>
            <Button autoInsertSpace={false} onClick={handleResetAll}>
              {intl.getMessage('zby.pro.table.resetAllDefault', '全部恢复默认')}
            </Button>
            <Button autoInsertSpace={false} type="primary" onClick={handleResetCurrent}>
              {intl.getMessage('zby.pro.table.resetCurrentDefault', '仅恢复{{name}}', {
                name: resetTabTitle,
              })}
            </Button>
          </div>
        )}
      >
        <div className={`${prefixCls}-settings-reset-description`}>
          {intl.getMessage(
            'zby.pro.table.resetDefaultDescription',
            '此操作会将草稿恢复为系统默认，未保存的调整将丢失。你可以仅恢复当前页签，或同时恢复列设置和筛选设置。',
          )}
        </div>
      </Modal>
    </>
  )
}
