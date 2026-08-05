import { genTable } from '@rc-component/table'

import type { AnyObject } from 'antd/es/_util/type'
import type { InternalTableProps } from '../InternalTable'

/**
 * Same as `rc-component/table` but we modify trigger children update logic instead.
 */
// Row virtualization is owned by the local VirtualBody so virtual and regular
// tables can share the same ScrollArea viewport and ordinary horizontal scroll.
const RcVirtualTable = genTable((prev, next) => {
  const { _renderTimes: prevRenderTimes } = prev as Readonly<InternalTableProps<AnyObject>>
  const { _renderTimes: nextRenderTimes } = next as Readonly<InternalTableProps<AnyObject>>
  return prevRenderTimes !== nextRenderTimes
})

export default RcVirtualTable
