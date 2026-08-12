import { genVirtualTable } from '../RcTableInner'

import type { AnyObject } from 'antd/es/_util/type'
import type { InternalTableProps } from '../InternalTable'

/**
 * Same as `rc-component/table` but we modify trigger children update logic instead.
 */
const RcVirtualTable = genVirtualTable((prev, next) => {
  const { _renderTimes: prevRenderTimes } = prev as Readonly<InternalTableProps<AnyObject>>
  const { _renderTimes: nextRenderTimes } = next as Readonly<InternalTableProps<AnyObject>>
  return prevRenderTimes !== nextRenderTimes
})

export default RcVirtualTable
