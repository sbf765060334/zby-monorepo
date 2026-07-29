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
          background: styleToken.colorFillContent,

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

          [`&${contentContainerCls}-stack ${contentContainerCls}-body`]: {
            overflow: 'hidden',
          },

          [`${contentContainerCls}-body-scroll-viewport`]: {
            height: '100%',
            gap: 'inherit',
          },

          [`${contentContainerCls}-body-scroll-content`]: {
            display: 'flex',
            minWidth: 0,
            minHeight: '100%',
            flexDirection: 'column',
            gap: 'inherit',
          },

          [`&${contentContainerCls}-stack ${contentContainerItemCls}`]: {
            flex: '0 0 auto',
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
          },

          [`${contentContainerCls}-aside-scroll-viewport`]: {
            height: '100%',
          },

          [`${contentContainerCls}-aside-scroll-content`]: {
            minWidth: 0,
            minHeight: '100%',
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

          '@media (max-width: 960px)': {
            [`${contentContainerCls}-content`]: {
              flexDirection: 'column',
            },

            [`${contentContainerCls}-aside`]: {
              width: '100%',
              maxHeight: `min(40vh, ${unit(token.controlHeightLG * 8)})`,
              flex: '0 0 auto',
            },
          },
        },

        [contentContainerItemCls]: {
          minWidth: 0,
          boxSizing: 'border-box',

          [`${cardCls}-body`]: {
            minWidth: 0,
            boxSizing: 'border-box',
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
