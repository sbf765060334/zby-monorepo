import { useStyleRegister } from '@ant-design/cssinjs'
import { theme as antdTheme } from 'antd'

export default function useStyle(prefixCls: string) {
  const { cssVar, hashId, theme, token } = antdTheme.useToken()
  const styleToken = cssVar ?? token

  useStyleRegister(
    {
      theme,
      token: styleToken,
      hashId,
      path: ['zby-ui', 'content-container', prefixCls],
    },
    () => {
      const componentCls = `.${prefixCls}`

      return {
        [componentCls]: {
          position: 'relative',
          display: 'flex',
          width: '100%',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          boxSizing: 'border-box',
          flexDirection: 'column',
          overflow: 'hidden',

          [`${componentCls}-header, ${componentCls}-footer`]: {
            minWidth: 0,
            flex: '0 0 auto',
          },

          [`${componentCls}-content`]: {
            display: 'flex',
            minWidth: 0,
            minHeight: 0,
            flex: 1,
            boxSizing: 'border-box',
            padding: styleToken.paddingSM,
            overflow: 'hidden',
          },

          [`${componentCls}-body`]: {
            width: '100%',
            minWidth: 0,
            minHeight: 0,
            flex: 1,
            gap: styleToken.marginSM,
          },

          [`&${componentCls}-fill ${componentCls}-body`]: {
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },

          [`&${componentCls}-stack ${componentCls}-body`]: {
            height: '100%',
            overflow: 'hidden',
          },

          [`${componentCls}-body-scroll-viewport`]: {
            height: '100%',
          },

          [`${componentCls}-body-scroll-content`]: {
            display: 'flex',
            minWidth: 0,
            minHeight: '100%',
            flexDirection: 'column',
            gap: styleToken.marginSM,
          },
        },
      }
    },
  )

  return hashId
}
