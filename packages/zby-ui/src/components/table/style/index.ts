import { useStyleRegister } from '@ant-design/cssinjs'
import type { CSSObject } from '@ant-design/cssinjs'
import { theme as antdTheme } from 'antd'

type GlobalToken = ReturnType<typeof antdTheme.useToken>['token']

interface TableStyleToken extends GlobalToken {
  componentCls: string
  tableCls: string
}

function genTableStyle(token: TableStyleToken): CSSObject {
  const { componentCls, tableCls } = token

  return {
    [componentCls]: {
      position: 'relative',
      minWidth: 0,

      [`${tableCls}-zby-resize-guide`]: {
        position: 'absolute',
        zIndex: token.zIndexPopupBase,
        top: 0,
        left: 0,
        display: 'none',
        width: 0,
        height: 0,
        borderInlineStart: `1px dashed ${token.colorPrimary}`,
        pointerEvents: 'none',
      },

      [`${tableCls}-zby-resize-handle`]: {
        position: 'absolute',
        zIndex: 2,
        insetBlock: 0,
        insetInlineEnd: -4,
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

      [`${tableCls}-thead > tr > th${tableCls}-cell`]: {
        position: 'relative',
      },

      [`${tableCls}-row${tableCls}-row-current > ${tableCls}-cell`]: {
        background: token.colorPrimaryBg,
      },

      [
      `${tableCls}-row${tableCls}-row-current:hover > ${tableCls}-cell, ` +
          `${tableCls}-row${tableCls}-row-current > ${tableCls}-cell-row-hover`
      ]: {
        background: token.colorPrimaryBgHover,
      },

      [`${tableCls}-zby-scroll-body`]: {
        width: '100%',
        minWidth: 0,

        [`> ${tableCls.replace('-table', '-scroll-area')}-viewport`]: {
          overscrollBehavior: 'contain',
        },

        table: {
          borderSpacing: 0,
        },
      },

      [`&${componentCls}-fill`]: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,

        [`> ${tableCls}-wrapper`]: {
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          minHeight: 0,
        },

        [
        `> ${tableCls}-wrapper > ${tableCls.replace('-table', '-spin')}-nested-loading, ` +
            `> ${tableCls}-wrapper > ${tableCls.replace('-table', '-spin')}-nested-loading > ${tableCls.replace('-table', '-spin')}-container, ` +
            `> ${tableCls}-wrapper > ${tableCls.replace('-table', '-spin')}, ` +
            `> ${tableCls}-wrapper > ${tableCls.replace('-table', '-spin')} > ${tableCls.replace('-table', '-spin')}-container, ` +
            `> ${tableCls}-wrapper > ${tableCls.replace('-table', '-spin')}-container`
        ]: {
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          minHeight: 0,
        },

        [`${tableCls}`]: {
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          minHeight: 0,
        },

        [`${tableCls}-container`]: {
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          minHeight: 0,
        },

        [`${tableCls}-zby-scroll-body`]: {
          flex: 1,
          height: 'auto',
          minHeight: 0,
        },

        [`${tableCls}-pagination`]: {
          flex: 'none',
        },
      },
    },
  }
}

export default function useStyle(prefixCls: string) {
  const { theme, token, hashId } = antdTheme.useToken()
  const componentCls = `.${prefixCls}-zby`
  const tableCls = `.${prefixCls}`

  useStyleRegister(
    {
      theme,
      token,
      hashId,
      path: ['zby-ui', 'table', prefixCls],
    },
    () =>
      genTableStyle({
        ...token,
        componentCls,
        tableCls,
      }),
  )

  return hashId
}
