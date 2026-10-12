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
      // ActionIcon 默认色是 colorIcon，hover 会变成主色；顶栏入口沿用原来 text Button 的正文色。
      [`.${prefixCls}-theme-trigger`]: {
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

/** 个性化抽屉的工作台样式。根节点带 hashId，门户里的头部和内容都能命中。 */
export function useThemeSeedStyles(prefixCls: string) {
  const { cssVar, hashId, theme, token } = antdTheme.useToken()
  const styleToken = cssVar ?? token
  const root = `.${prefixCls}-theme-seed`

  useStyleRegister(
    {
      theme,
      token: styleToken,
      hashId,
      path: ['zby-pro', 'theme-seed', prefixCls],
    },
    () => ({
      [root]: {
        [`${root}-count`]: {
          marginInlineStart: styleToken.marginSM,
          color: styleToken.colorTextSecondary,
          fontSize: styleToken.fontSize,
          fontWeight: 'normal',
        },
        [`${root}-actions`]: {
          display: 'flex',
          alignItems: 'center',
          gap: styleToken.marginXS,
        },
        [`${root}-body`]: {
          display: 'flex',
          minWidth: 0,
          minHeight: 0,
          flex: '1 1 auto',
          overflow: 'hidden',
        },
        [`${root}-section`]: {
          overflow: 'hidden',
          borderStartStartRadius: styleToken.borderRadiusLG,
          borderEndStartRadius: styleToken.borderRadiusLG,
        },
        [`${root}-header`]: {
          padding: styleToken.paddingLG,
        },
        [`${root}-seeds`]: {
          width: 360,
          minHeight: 0,
          flex: '0 0 auto',
          boxSizing: 'border-box',
          paddingBlock: styleToken.paddingLG,
          paddingInline: styleToken.paddingLG,
          borderInlineEnd: `${styleToken.lineWidth} ${styleToken.lineType} ${styleToken.colorSplit}`,
          overflow: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: `${styleToken.colorFillSecondary} transparent`,

          '&::-webkit-scrollbar': {
            width: 6,
            height: 6,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: styleToken.borderRadius,
            background: styleToken.colorFillSecondary,
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: styleToken.colorFill,
          },
        },
        [`${root}-group`]: {
          marginBlockEnd: styleToken.marginLG,
        },
        [`${root}-group-title`]: {
          marginBlockEnd: styleToken.marginSM,
          paddingBlockEnd: styleToken.paddingSM,
          borderBlockEnd: `${styleToken.lineWidth} ${styleToken.lineType} ${styleToken.colorSplit}`,
          color: styleToken.colorTextHeading,
          fontWeight: styleToken.fontWeightStrong,
        },
        [`${root}-field`]: {
          paddingBlock: styleToken.paddingSM,
          borderBlockEnd: `${styleToken.lineWidth} ${styleToken.lineType} ${styleToken.colorSplit}`,
        },
        [`${root}-field-color`]: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: styleToken.margin,
        },
        [`${root}-field-copy`]: {
          minWidth: 0,
        },
        [`${root}-field-control`]: {
          display: 'flex',
          flex: '0 0 auto',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: styleToken.marginXS,
        },
        [`${root}-field-switch`]: {
          display: 'flex',
          alignItems: 'center',
          gap: styleToken.marginXS,
        },
        [`${root}-field-name`]: {
          color: styleToken.colorText,
        },
        [`${root}-field-meta`]: {
          display: 'flex',
          alignItems: 'center',
          gap: styleToken.marginXS,
          color: styleToken.colorTextDescription,
          fontSize: styleToken.fontSizeSM,
        },
        [`${root}-field-control [class*="color-picker-trigger"]`]: {
          width: 148,
          justifyContent: 'flex-start',
          borderRadius: styleToken.borderRadiusSM,
        },
        [`${root}-reset`]: {
          padding: 0,
          border: 0,
          background: 'transparent',
          color: styleToken.colorPrimary,
          fontSize: styleToken.fontSizeSM,
          cursor: 'pointer',
        },
        [`${root}-number`]: {
          display: 'flex',
          alignItems: 'center',
          gap: styleToken.marginSM,
        },
        [`${root}-slider`]: {
          flex: '1 1 auto',
          margin: 0,
        },
        [`${root}-preview`]: {
          display: 'flex',
          minWidth: 0,
          minHeight: 0,
          flex: '1 1 auto',
          flexDirection: 'column',
          overflow: 'hidden',
          background: styleToken.colorBgLayout,
        },
        [`${root}-stage-switch`]: {
          position: 'absolute',
          zIndex: 2,
          insetInline: 0,
          insetBlockStart: styleToken.paddingSM,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',

          '& > *': {
            pointerEvents: 'auto',
          },
        },
        [`${root}-zoom`]: {
          position: 'absolute',
          zIndex: 2,
          insetInlineEnd: styleToken.padding,
          insetBlockEnd: styleToken.padding,
          display: 'flex',
          alignItems: 'center',
          gap: styleToken.marginXXS,
        },
        [`${root}-stage`]: {
          position: 'relative',
          minHeight: 0,
          flex: '1 1 auto',
          overflow: 'hidden',
          backgroundColor: styleToken.colorBgLayout,
          backgroundImage: `radial-gradient(${styleToken.colorTextQuaternary} 1px, transparent 1px)`,
          backgroundSize: '16px 16px',
          cursor: 'default',
          touchAction: 'none',
        },
        [`${root}-stage-panning`]: {
          userSelect: 'none',

          [`${root}-page`]: {
            cursor: 'grabbing',
          },
        },
        [`${root}-sheet`]: {
          width: '100%',
          height: '100%',
          transformOrigin: '0 0',
          willChange: 'transform',
        },
        [`${root}-page`]: {
          width: '100%',
          height: 'auto',
          minHeight: '100%',
          boxSizing: 'border-box',
          paddingBlockStart: styleToken.controlHeight + styleToken.paddingSM,
          paddingBlockEnd: styleToken.controlHeightLG,
          overflow: 'visible',
          background: styleToken.colorBgContainer,
          cursor: 'grab',
        },
        [`${root}-catalog`]: {
          display: 'flex',
          flexDirection: 'column',
          gap: styleToken.marginLG,
          // 用数值 token 相加。cssVar 字符串直接相加会拼成非法声明，底边留白会丢。
          paddingInline: token.paddingLG,
          paddingBlockStart: token.controlHeight + token.paddingSM,
          paddingBlockEnd: token.paddingLG + token.controlHeightLG,
        },
        [`${root}-catalog-title`]: {
          margin: 0,
          paddingBlockEnd: styleToken.paddingXS,
          borderBlockEnd: `${styleToken.lineWidth} ${styleToken.lineType} ${styleToken.colorSplit}`,
          color: styleToken.colorTextHeading,
          fontWeight: styleToken.fontWeightStrong,
        },
        [`${root}-catalog-row`]: {
          display: 'flex',
          alignItems: 'flex-start',
          gap: styleToken.margin,
          paddingBlock: styleToken.paddingSM,
          borderBlockEnd: `${styleToken.lineWidth} ${styleToken.lineType} ${styleToken.colorSplit}`,
        },
        [`${root}-catalog-label`]: {
          width: 96,
          flex: '0 0 auto',
          paddingBlockStart: styleToken.paddingXXS,
          color: styleToken.colorTextSecondary,
        },
        [`${root}-catalog-demo`]: {
          display: 'flex',
          minWidth: 0,
          flex: '1 1 auto',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: styleToken.marginXS,
        },
        [`${root}-config-note`]: {
          flex: 'none',
          marginBlockEnd: 12,
          color: styleToken.colorTextDescription,
          fontSize: styleToken.fontSize,
          lineHeight: styleToken.lineHeight,
          [`p`]: {
            margin: 0,
            marginBlockEnd: styleToken.marginXS,
          },
        },
        [`${root}-config-presets`]: {
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: styleToken.marginXS,
        },
        [`${root}-config-preset-mark`]: {
          width: 16,
          height: 16,
          borderRadius: styleToken.borderRadiusSM,
          flex: 'none',
        },
        [`${root}-config-editor`]: {
          minHeight: 150,
        },
        [`${root}-config-footer`]: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: styleToken.marginXS,
        },
        [`${root}-config-footer-actions`]: {
          display: 'flex',
          alignItems: 'center',
          gap: styleToken.marginXS,
        },
        [`${root}-config-error`]: {
          marginBlockStart: styleToken.marginXS,
          color: styleToken.colorError,
        },
      },
    }),
  )

  return hashId
}
