import { ConfigProvider, Modal } from 'antd'
import { clsx } from 'clsx'
import * as React from 'react'

import type { ProModalProps } from './interface'
import useStyle from './style'

function toCssSize(value: React.CSSProperties['maxHeight']) {
  return typeof value === 'number' ? `${value}px` : value
}

export function ProModal({
  bodyHeightMode = 'max-height',
  prefixCls: customizePrefixCls,
  rootClassName,
  style,
  viewportMaxHeight,
  ...rest
}: ProModalProps) {
  const { getPrefixCls } = React.useContext(ConfigProvider.ConfigContext)
  const prefixCls = getPrefixCls('pro-modal', customizePrefixCls)
  const [hashId, cssVarCls] = useStyle(prefixCls)
  const maxHeightVar = `--${prefixCls}-max-height`

  return (
    <Modal
      {...rest}
      style={{
        ...style,
        ...(viewportMaxHeight == null
          ? null
          : { [maxHeightVar]: toCssSize(viewportMaxHeight) }),
      }}
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
