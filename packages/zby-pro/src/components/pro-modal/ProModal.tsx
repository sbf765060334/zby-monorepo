import { Modal } from 'antd'
import { clsx } from 'clsx'

import type { ProModalProps } from './interface'
import useStyle from './style'

const DEFAULT_PREFIX_CLS = 'zby-pro-modal'

export function ProModal({
  bodyHeightMode = 'max-height',
  rootClassName,
  ...rest
}: ProModalProps) {
  const [hashId, cssVarCls] = useStyle(DEFAULT_PREFIX_CLS)

  return (
    <Modal
      {...rest}
      rootClassName={clsx(
        DEFAULT_PREFIX_CLS,
        `${DEFAULT_PREFIX_CLS}-body-height-mode-${bodyHeightMode}`,
        hashId,
        cssVarCls,
        rootClassName,
      )}
    />
  )
}

ProModal.displayName = 'ProModal'

export default ProModal
