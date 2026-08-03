import { useStyleRegister } from '@ant-design/cssinjs'
import { theme as antdTheme } from 'antd'

const unit = (value: number | string) => typeof value === 'number' ? `${value}px` : value

export default function useStyle(prefixCls: string, cardPrefixCls: string) {
  const { cssVar, hashId, theme, token } = antdTheme.useToken()
  const styleToken = cssVar ?? token

  useStyleRegister(
    {
      theme,
      token: styleToken,
      hashId,
      path: ['zby-pro', 'pro-layout', 'content-container', prefixCls, cardPrefixCls],
    },
    () => {
      const componentCls = `.${prefixCls}`
      const contentContainerCls = `${componentCls}-content-container`
      const contentContainerItemCls = `${contentContainerCls}-item`
      const cardCls = `.${cardPrefixCls}`
      const surfaceShadow = styleToken.boxShadowTertiary || styleToken.boxShadowSecondary

      return {
        [contentContainerCls]: {
          position: 'relative',
          display: 'flex',
          width: '100%',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          boxSizing: 'border-box',
          flexDirection: 'column',
          overflow: 'hidden',
          background: styleToken.colorBgLayout,

          [`${contentContainerCls}-header`]: {
            minWidth: 0,
            flex: '0 0 auto',
            background: styleToken.colorBgContainer,
          },

          [`${contentContainerCls}-header-content`]: {
            minWidth: 0,
          },

          [`${contentContainerCls}-content`]: {
            display: 'flex',
            minWidth: 0,
            minHeight: 0,
            flex: 1,
            gap: styleToken.marginSM,
            boxSizing: 'border-box',
            padding: styleToken.paddingSM,
            overflow: 'hidden',
          },

          [`${contentContainerCls}-body`]: {
            display: 'flex',
            minWidth: 0,
            minHeight: 0,
            flex: 1,
            flexDirection: 'column',
            gap: styleToken.marginSM,
            boxSizing: 'border-box',
          },

          [`&${contentContainerCls}-fill ${contentContainerCls}-body`]: {
            overflow: 'hidden',
          },

          [`&${contentContainerCls}-stack ${contentContainerCls}-content`]: {
            padding: 0,
          },

          [`&${contentContainerCls}-stack ${contentContainerCls}-body`]: {
            padding: styleToken.paddingSM,
            overflow: 'auto',
          },

          [`&${contentContainerCls}-stack ${contentContainerItemCls}`]: {
            flex: '0 0 auto',
          },

          [`&${contentContainerCls}-stack${contentContainerCls}-with-aside:not(${contentContainerCls}-aside-end) ${contentContainerCls}-body`]: {
            paddingInlineStart: 0,
          },

          [`&${contentContainerCls}-stack${contentContainerCls}-with-aside${contentContainerCls}-aside-end ${contentContainerCls}-body`]: {
            paddingInlineEnd: 0,
          },

          [`${contentContainerCls}-aside`]: {
            display: 'flex',
            width: token.controlHeightLG * 7,
            minWidth: 0,
            minHeight: 0,
            boxSizing: 'border-box',
            flex: `0 0 ${unit(token.controlHeightLG * 7)}`,
            flexDirection: 'column',
            overflow: 'hidden',
          },

          [`${contentContainerCls}-aside-scroll`]: {
            width: '100%',
            height: '100%',
            minWidth: 0,
            minHeight: 0,
            flex: 1,
            overflow: 'auto',
          },

          [`&${contentContainerCls}-stack${contentContainerCls}-with-aside ${contentContainerCls}-aside`]: {
            boxSizing: 'content-box',
            padding: styleToken.paddingSM,
          },

          [`&${contentContainerCls}-stack${contentContainerCls}-with-aside:not(${contentContainerCls}-aside-end) ${contentContainerCls}-aside`]: {
            paddingInlineEnd: 0,
          },

          [`&${contentContainerCls}-stack${contentContainerCls}-with-aside${contentContainerCls}-aside-end ${contentContainerCls}-aside`]: {
            paddingInlineStart: 0,
          },

          [`${contentContainerCls}-footer`]: {
            position: 'sticky',
            insetBlockEnd: 0,
            zIndex: 1,
            display: 'flex',
            minWidth: 0,
            boxSizing: 'border-box',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flex: '0 0 auto',
            gap: styleToken.marginXS,
            paddingBlock: styleToken.paddingSM,
            paddingInline: styleToken.paddingMD,
            borderBlockStart: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
            background: styleToken.colorBgContainer,
            boxShadow: surfaceShadow,
          },

        },

        [contentContainerItemCls]: {
          minWidth: 0,
          boxSizing: 'border-box',

          [`${cardCls}-body`]: {
            minWidth: 0,
            boxSizing: 'border-box',
            padding: styleToken.padding,
          },
        },

        [`${contentContainerItemCls}-fill`]: {
          display: 'flex',
          minHeight: 0,
          flex: 1,
          flexDirection: 'column',
          overflow: 'hidden',

          [`${cardCls}-body`]: {
            display: 'flex',
            minHeight: 0,
            flex: 1,
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }
    },
  )

  return hashId
}
