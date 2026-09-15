import { useStyleRegister } from '@ant-design/cssinjs'
import { theme as antdTheme } from 'antd'

/** 语言选择器自行注册样式，不依赖 ProLayout 根节点。 */
export default function useLocaleSwitchStyles(prefixCls: string) {
  const { cssVar, hashId, theme, token } = antdTheme.useToken()
  const styleToken = cssVar ?? token

  useStyleRegister(
    {
      theme,
      token: styleToken,
      hashId,
      path: ['zby-pro', 'locale-switch', prefixCls],
    },
    () => ({
      // ActionIcon 默认色是 colorIcon，hover 会变成主色；顶栏入口沿用原来 text Button 的正文色。
      [`.${prefixCls}-locale-trigger`]: {
        '&&': {
          color: styleToken.colorText,
          '&:not(:disabled):hover, &:not(:disabled):active': {
            background: styleToken.colorFillSecondary,
            color: styleToken.colorText,
          },
          '&:not(:disabled):focus-visible': {
            outline: 'none',
          },
        },
      },
    }),
  )

  return hashId
}
