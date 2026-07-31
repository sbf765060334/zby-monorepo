import { useStyleRegister } from '@ant-design/cssinjs'
import { theme as antdTheme } from 'antd'

/** 主题选择器自行注册样式，不依赖 ProLayout 根节点。 */
export default function useThemeSwitchStyles(prefixCls: string) {
  const { cssVar, hashId, theme, token } = antdTheme.useToken()
  const styleToken = cssVar ?? token

  useStyleRegister(
    {
      theme,
      token: styleToken,
      hashId,
      path: ['zby-pro', 'theme-switch', prefixCls],
    },
    () => ({
      [`.${prefixCls}-theme-trigger`]: {
        width: 32,
        minWidth: 32,
        height: 32,
        padding: 0,
        borderRadius: styleToken.borderRadiusSM,
        background: 'transparent',
        color: styleToken.colorText,
        fontSize: styleToken.fontSizeLG,
        '&:hover': {
          background: styleToken.colorFillSecondary,
          color: styleToken.colorText,
        },
        '&.ant-btn:not(:disabled):focus-visible': {
          outline: 'none',
        },
      },
    }),
  )

  return hashId
}
