import type { CSSObject } from '@ant-design/cssinjs'

import type { GenerateStyle } from 'antd/es/theme/internal'
import type { TableToken } from './index'

const genZbyStyle: GenerateStyle<TableToken> = (token): CSSObject => {
  const {
    componentCls,
    motionDurationMid,
    tableHeaderCellSplitColor,
  } = token
  const wrapperCls = `${componentCls}-wrapper-zby`
  const fillCls = `${componentCls}-wrapper-zby-fill`
  const scrollAreaCls = componentCls.replace('-table', '-scroll-area')
  const spinCls = componentCls.replace('-table', '-spin')

  return {
    [wrapperCls]: {
      position: 'relative',
      minWidth: 0,

      [`${componentCls}-zby-resize-handle`]: {
        position: 'absolute',
        zIndex: 2,
        insetBlock: 0,
        insetInlineEnd: 0,
        width: 8,
        padding: 0,
        border: 0,
        outline: 0,
        background: 'transparent',
        cursor: 'col-resize',
        touchAction: 'none',

        '&:focus-visible': {
          boxShadow: `inset -1px 0 ${token.colorPrimary}`,
        },
      },

      [
      `${componentCls}${componentCls}-zby-column-resizing ` +
        `${componentCls}-tbody > tr > td${componentCls}-cell:not(${componentCls}-cell-fix), ` +
        `${componentCls}${componentCls}-zby-column-resizing ` +
        `${componentCls}-tbody-virtual ${componentCls}-cell:not(${componentCls}-cell-fix)`
      ]: {
        overflow: 'hidden',
      },

      [`${componentCls}-zby-filler-cell`]: {
        padding: '0 !important',
        pointerEvents: 'none',
      },

      [`${componentCls}-thead ${componentCls}-zby-filler-cell::before`]: {
        position: 'absolute',
        top: '50%',
        insetInlineEnd: 0,
        width: 1,
        height: '1.6em',
        backgroundColor: tableHeaderCellSplitColor,
        transform: 'translateY(-50%)',
        transition: `background-color ${motionDurationMid}`,
        content: '""',
      },

      [
      `${componentCls}-thead ` +
        `${componentCls}-zby-filler-cell-collapsed::before`
      ]: {
        display: 'none',
      },

      [`${componentCls}-row${componentCls}-row-current > ${componentCls}-cell`]: {
        background: token.colorPrimaryBg,
      },

      [
      `${componentCls}-row${componentCls}-row-current:hover > ${componentCls}-cell, ` +
          `${componentCls}-row${componentCls}-row-current > ${componentCls}-cell-row-hover`
      ]: {
        background: token.colorPrimaryBgHover,
      },

      [`${componentCls}-zby-scroll-body`]: {
        width: '100%',
        minWidth: 0,

        [`> ${scrollAreaCls}-viewport`]: {
          overscrollBehaviorX: 'contain',
          overscrollBehaviorY: 'auto',
        },

        table: {
          borderSpacing: 0,
        },
      },
    },

    [`${wrapperCls}${fillCls}`]: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,

      [
      `> ${spinCls}, ` +
          `> ${spinCls}-nested-loading, ` +
          `> ${spinCls} > ${spinCls}-container, ` +
          `> ${spinCls}-nested-loading > ${spinCls}-container`
      ]: {
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        minHeight: 0,
      },

      [componentCls]: {
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        minHeight: 0,
      },

      [`${componentCls}-container`]: {
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        minHeight: 0,
      },

      [`${componentCls}-zby-scroll-body`]: {
        flex: 1,
        height: 'auto',
        minHeight: 0,
      },

      [`${componentCls}-pagination`]: {
        flex: 'none',
      },
    },
  }
}

export default genZbyStyle
