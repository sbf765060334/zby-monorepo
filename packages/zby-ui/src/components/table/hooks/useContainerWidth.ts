import type { TableProps } from '@rc-component/table'

export default function useContainerWidth(prefixCls: string) {
  const getContainerWidth: TableProps['getContainerWidth'] = (ele, width) => {
    const container = ele.querySelector(`.${prefixCls}-container`)
    let returnWidth = width

    if (container) {
      const scrollAreaPrefixCls = prefixCls.replace('-table', '-scroll-area')
      const viewport = container.querySelector<HTMLElement>(
        `.${scrollAreaPrefixCls}-viewport`,
      )
      const clientWidth = viewport?.clientWidth || container.clientWidth
      if (clientWidth > 0) return clientWidth

      const style = getComputedStyle(container)
      const borderLeft = Number.parseInt(style.borderLeftWidth, 10)
      const borderRight = Number.parseInt(style.borderRightWidth, 10)
      returnWidth = width - borderLeft - borderRight
    }

    return returnWidth
  }

  return getContainerWidth
}
