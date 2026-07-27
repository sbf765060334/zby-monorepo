import { AppstoreOutlined } from '@ant-design/icons'
import { useIntl } from '@zby/intl'
import { Button, Popover } from 'antd'
import { clsx } from 'clsx'
import { memo, useState } from 'react'

import type { ProLayoutSystemItem } from '../types'

export interface SystemSwitcherProps {
  prefixCls: string
  hashId: string
  systemList: ProLayoutSystemItem[]
}

/** IconDrawerMenu 图标栏底部的系统切换入口，交互与 Shuzhi Drawer 模式保持一致。 */
function SystemSwitcher(props: SystemSwitcherProps) {
  const { hashId, prefixCls, systemList } = props
  const intl = useIntl()
  const [open, setOpen] = useState(false)
  const triggerLabel = intl.getMessage('zby.pro.layout.menu.switchSystem', '切换系统')

  return (
    <Popover
      arrow={false}
      trigger="hover"
      placement="right"
      open={open}
      onOpenChange={setOpen}
      rootClassName={clsx(`${prefixCls}-system-popover`, hashId)}
      content={(
        <div className={`${prefixCls}-system-list`}>
          {systemList.map((system) => (
            <Button
              key={system.systemName}
              type="text"
              block
              disabled={system.active}
              className={clsx(`${prefixCls}-system-item`, {
                [`${prefixCls}-system-item-active`]: system.active,
              })}
              onClick={() => {
                if (system.active)
                  return

                setOpen(false)
                if (typeof window !== 'undefined')
                  window.open(system.url || window.location.origin, '_blank')
              }}
            >
              <span className={`${prefixCls}-system-item-content`}>
                {system.logo ? (
                  <span className={`${prefixCls}-system-logo`}>
                    <img src={system.logo} alt={system.description || system.name} />
                  </span>
                ) : null}
                <span>{system.description || system.name}</span>
              </span>
            </Button>
          ))}
        </div>
      )}
    >
      <button
        type="button"
        className={`${prefixCls}-system-trigger`}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={triggerLabel}
      >
        <AppstoreOutlined />
      </button>
    </Popover>
  )
}

export default memo(SystemSwitcher)
