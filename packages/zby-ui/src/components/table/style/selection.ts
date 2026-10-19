import { unit } from '@ant-design/cssinjs'
import type { CSSObject } from '@ant-design/cssinjs'

import { getTableCellHoverClassNames } from '../../_util/tableCellHover'
import type { GenerateStyle } from 'antd/es/theme/internal'
import type { TableToken } from './index'

const genSelectionStyle: GenerateStyle<TableToken, CSSObject> = (token) => {
  const {
    componentCls,
    antCls,
    iconCls,
    fontSizeIcon,
    padding,
    paddingXS,
    headerIconColor,
    headerIconHoverColor,
    tableSelectionColumnWidth,
    tableSelectedRowBg,
    tableSelectedRowHoverBg,
    tableRowHoverBg,
    colorPrimaryBg,
    colorPrimaryBgHover,
    tablePaddingHorizontal,
    calc,
  } = token
  const tableCellHoverHiddenStyle: CSSObject = {
    display: 'none',
    pointerEvents: 'none',
  }
  const tableCellHoverOpacityHiddenStyle: CSSObject = {
    opacity: 0,
    visibility: 'hidden',
    pointerEvents: 'none',
  }
  const tableCellHoverOpacityVisibleStyle: CSSObject = {
    opacity: 1,
    visibility: 'visible',
    pointerEvents: 'auto',
  }
  // componentCls 带前导点，类名生成函数接收的是表格 prefixCls。
  const tableCellHoverClassNames = getTableCellHoverClassNames(componentCls.slice(1))
  const currentRowHoverSelector = [
    `${componentCls}-row${componentCls}-row-current:hover > ${componentCls}-cell`,
    `${componentCls}-row${componentCls}-row-current > ${componentCls}-cell-row-hover`,
  ].join(', ')

  return {
    [`${componentCls}-wrapper`]: {
      // ========================== Selections ==========================
      [`${componentCls}-selection-col`]: {
        width: tableSelectionColumnWidth,
        [`&${componentCls}-selection-col-with-dropdown`]: {
          width: calc(tableSelectionColumnWidth)
            .add(fontSizeIcon)
            .add(calc(padding).div(4))
            .equal(),
        },
      },

      [`${componentCls}-bordered ${componentCls}-selection-col`]: {
        width: calc(tableSelectionColumnWidth).add(calc(paddingXS).mul(2)).equal(),
        [`&${componentCls}-selection-col-with-dropdown`]: {
          width: calc(tableSelectionColumnWidth)
            .add(fontSizeIcon)
            .add(calc(padding).div(4))
            .add(calc(paddingXS).mul(2))
            .equal(),
        },
      },

      [`
        table tr th${componentCls}-selection-column,
        table tr td${componentCls}-selection-column,
        ${componentCls}-selection-column
      `]: {
        paddingInlineEnd: token.paddingXS,
        paddingInlineStart: token.paddingXS,
        textAlign: 'center',

        [`${antCls}-radio-wrapper`]: {
          marginInlineEnd: 0,
        },
      },

      [`table tr th${componentCls}-selection-column${componentCls}-cell-fix-left`]: {
        zIndex: calc(token.zIndexTableFixed).add(1).equal({ unit: false }),
      },

      [`table tr th${componentCls}-selection-column::after`]: {
        backgroundColor: 'transparent !important',
      },

      [`${componentCls}-selection`]: {
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
      },

      [`${componentCls}-selection-extra`]: {
        position: 'absolute',
        top: 0,
        zIndex: 1,
        cursor: 'pointer',
        transition: `all ${token.motionDurationSlow}`,
        marginInlineStart: '100%',
        paddingInlineStart: unit(calc(tablePaddingHorizontal).div(4).equal()),

        [iconCls]: {
          color: headerIconColor,
          fontSize: fontSizeIcon,
          verticalAlign: 'baseline',

          '&:hover': {
            color: headerIconHoverColor,
          },
        },
      },

      // ============================= Rows =============================
      [`${componentCls}-tbody`]: {
        [`.${tableCellHoverClassNames.hoverToDisplayBlock}`]: tableCellHoverHiddenStyle,
        [`.${tableCellHoverClassNames.hoverToDisplayInline}`]: tableCellHoverHiddenStyle,
        [`.${tableCellHoverClassNames.hoverToDisplayInlineBlock}`]: tableCellHoverHiddenStyle,
        [`.${tableCellHoverClassNames.hoverToDisplayInlineFlex}`]: tableCellHoverHiddenStyle,
        [`.${tableCellHoverClassNames.hoverToDisplayFlex}`]: tableCellHoverHiddenStyle,
        [`.${tableCellHoverClassNames.hoverToOpacity1}`]: tableCellHoverOpacityHiddenStyle,

        [`.${tableCellHoverClassNames.hoverToOpacity1}:focus-within`]:
          tableCellHoverOpacityVisibleStyle,

        [`${componentCls}-row`]: {
          [`&${componentCls}-row-selected`]: {
            [`> ${componentCls}-cell`]: {
              background: tableSelectedRowBg,

              '&-row-hover': {
                background: tableSelectedRowHoverBg,
              },
            },
          },

          [`> ${componentCls}-cell-row-hover`]: {
            background: tableRowHoverBg,

            [`.${tableCellHoverClassNames.hoverToDisplayBlock}`]: {
              display: 'block',
              pointerEvents: 'auto',
            },

            [`.${tableCellHoverClassNames.hoverToDisplayInline}`]: {
              display: 'inline',
              pointerEvents: 'auto',
            },

            [`.${tableCellHoverClassNames.hoverToDisplayInlineBlock}`]: {
              display: 'inline-block',
              pointerEvents: 'auto',
            },

            [`.${tableCellHoverClassNames.hoverToDisplayInlineFlex}`]: {
              display: 'inline-flex',
              pointerEvents: 'auto',
            },

            [`.${tableCellHoverClassNames.hoverToDisplayFlex}`]: {
              display: 'flex',
              pointerEvents: 'auto',
            },

            [`.${tableCellHoverClassNames.hoverToOpacity1}`]: tableCellHoverOpacityVisibleStyle,
          },
        },
      },

      [`${componentCls}-row${componentCls}-row-current > ${componentCls}-cell`]: {
        background: colorPrimaryBg,
      },

      [currentRowHoverSelector]: {
        background: colorPrimaryBgHover,
      },
    },
  }
}

export default genSelectionStyle
