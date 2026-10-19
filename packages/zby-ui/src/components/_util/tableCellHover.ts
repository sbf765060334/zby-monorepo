/** 行悬停时由 Table 样式显示或隐藏的单元格标记。类名跟随表格 prefixCls。 */
export interface TableCellHoverClassNames {
  hoverToDisplayBlock: string
  hoverToDisplayInline: string
  hoverToDisplayInlineBlock: string
  hoverToDisplayInlineFlex: string
  hoverToDisplayFlex: string
  hoverToOpacity1: string
}

/** 用表格前缀生成悬停标记，例如 prefixCls 为 zby-table 时得到 zby-table-cell-hover-to-display-inline-flex。 */
export function getTableCellHoverClassNames(prefixCls: string): TableCellHoverClassNames {
  return {
    hoverToDisplayBlock: `${prefixCls}-cell-hover-to-display-block`,
    hoverToDisplayInline: `${prefixCls}-cell-hover-to-display-inline`,
    hoverToDisplayInlineBlock: `${prefixCls}-cell-hover-to-display-inline-block`,
    hoverToDisplayInlineFlex: `${prefixCls}-cell-hover-to-display-inline-flex`,
    hoverToDisplayFlex: `${prefixCls}-cell-hover-to-display-flex`,
    hoverToOpacity1: `${prefixCls}-cell-hover-to-opacity-1`,
  }
}

/** 行悬停时用透明度显示的标记，和 getTableCellHoverClassNames(prefixCls).hoverToOpacity1 相同。 */
export function getTableRowHoverRevealClassName(prefixCls: string) {
  return getTableCellHoverClassNames(prefixCls).hoverToOpacity1
}
