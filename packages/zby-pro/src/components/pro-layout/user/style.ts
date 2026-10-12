import { useStyleRegister } from '@ant-design/cssinjs'
import { theme as antdTheme } from 'antd'

/** 用户菜单自行注册样式，不依赖 ProLayout 根节点。 */
export default function useUserMenuStyles(prefixCls: string) {
  const { cssVar, hashId, theme, token } = antdTheme.useToken()
  const styleToken = cssVar ?? token

  useStyleRegister(
    {
      theme,
      token: styleToken,
      hashId,
      path: ['zby-pro', 'user-menu', prefixCls],
    },
    () => ({
      [`.${prefixCls}-user-menu`]: {
        '&&': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: styleToken.marginXS,
          height: styleToken.controlHeight,
          paddingInline: styleToken.paddingXS,
          border: 0,
          borderRadius: styleToken.borderRadius,
          background: 'transparent',
          color: styleToken.colorText,
          cursor: 'pointer',
          fontSize: styleToken.fontSize,
          lineHeight: styleToken.lineHeight,
          '&:hover, &:focus-visible': {
            background: styleToken.colorFillSecondary,
          },
          '&:focus-visible': {
            outline: 'none',
          },
        },
        [`.${prefixCls}-user-menu-avatar`]: {
          display: 'inline-flex',
          flex: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          width: styleToken.controlHeightSM,
          height: styleToken.controlHeightSM,
          borderRadius: '50%',
          background: styleToken.colorPrimary,
          color: styleToken.colorTextLightSolid,
          fontSize: styleToken.fontSizeSM,
          lineHeight: 1,
        },
        [`.${prefixCls}-user-menu-name`]: {
          maxWidth: 120,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      },
    }),
  )

  return hashId
}
