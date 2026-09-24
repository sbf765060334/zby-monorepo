import { ConfigProvider, Modal } from 'antd'
import { clsx } from 'clsx'
import * as React from 'react'

import type { ProModalProps } from './interface'
import useStyle from './style'

export function ProModal({
  bodyHeightMode = 'max-height',
  prefixCls: customizePrefixCls,
  rootClassName,
  ...rest
}: ProModalProps) {
  const { getPrefixCls } = React.useContext(ConfigProvider.ConfigContext)
  const prefixCls = getPrefixCls('pro-modal', customizePrefixCls)
  const [hashId, cssVarCls] = useStyle(prefixCls)

  return (
    <Modal
      {...rest}
      rootClassName={clsx(
        prefixCls,
        `${prefixCls}-body-height-mode-${bodyHeightMode}`,
        hashId,
        cssVarCls,
        rootClassName,
      )}
    />
  )
}

ProModal.displayName = 'ProModal'

export default ProModal
