export const TableCellHoverRelatedClassNames = {
  hoverToDisplayBlock: 'shuzhi-table-cell-hover-to-display-block',
  hoverToDisplayInline: 'shuzhi-table-cell-hover-to-display-inline',
  hoverToDisplayInlineBlock: 'shuzhi-table-cell-hover-to-display-inline-block',
  hoverToDisplayInlineFlex: 'shuzhi-table-cell-hover-to-display-inline-flex',
  hoverToDisplayFlex: 'shuzhi-table-cell-hover-to-display-flex',
  hoverToOpacity1: 'shuzhi-table-cell-hover-to-opacity-1',
} as const

export const TABLE_ROW_HOVER_REVEAL_CLASS_NAME =
  TableCellHoverRelatedClassNames.hoverToOpacity1
