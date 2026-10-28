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

          [`&${contentContainerCls}-stack`]: {
            height: 'auto',
            minHeight: '100%',
            overflow: 'visible',
          },

          [`${contentContainerCls}-header`]: {
            minWidth: 0,
            flex: '0 0 auto',
          },

          [`${contentContainerCls}-header-content`]: {
            minWidth: 0,
          },

          [`${contentContainerCls}-content`]: {
            display: 'flex',
            minWidth: 0,
            minHeight: 0,
            flex: 1,
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
            flex: '1 1 auto',
            minHeight: 'auto',
            overflow: 'visible',
          },

          [`&${contentContainerCls}-stack ${contentContainerCls}-body`]: {
            flex: '1 1 auto',
            minHeight: 'auto',
            overflow: 'visible',
          },

          [`&${contentContainerCls}-stack ${contentContainerItemCls}`]: {
            width: '100%',
            flex: '0 0 auto',
          },

          [`${contentContainerCls}-aside`]: {
            minWidth: 0,
            flex: '0 0 auto',
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
            // 内边距与 Drawer footer 一致：上下 paddingXS，左右 padding。
            paddingBlock: styleToken.paddingXS,
            paddingInline: styleToken.padding,
            borderBlockStart: `${unit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorderSecondary}`,
            background: styleToken.colorBgContainer,
            boxShadow: `0 -6px 16px -8px ${styleToken.colorTextQuaternary}, ${surfaceShadow}`,
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
