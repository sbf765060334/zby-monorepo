import { useStyleRegister } from '@ant-design/cssinjs'
import { ConfigProvider, theme as antdTheme } from 'antd'
import * as React from 'react'

const toCssUnit = (value: number | string) => (typeof value === 'number' ? `${value}px` : value)

export function useInputNumberRangeStyle(prefixCls: string, inputNumberPrefixCls: string) {
  const { theme, token, hashId, cssVar } = antdTheme.useToken()
  const { theme: themeConfig } = React.useContext(ConfigProvider.ConfigContext)
  const styleToken = cssVar ?? token
  const cssVarKey =
    typeof themeConfig?.cssVar === 'object' ? themeConfig.cssVar.key : undefined
  const cssVarCls = cssVarKey ?? 'css-var-root'

  useStyleRegister(
    {
      theme,
      token,
      hashId,
      path: ['zby-ui', 'input-number-range', prefixCls, inputNumberPrefixCls],
    },
    () => {
      const componentCls = `.${prefixCls}`
      const inputNumberCls = `.${inputNumberPrefixCls}`
      const border = `${toCssUnit(styleToken.lineWidth)} ${styleToken.lineType} ${styleToken.colorBorder}`
      const activeShadow = `0 0 0 ${toCssUnit(styleToken.controlOutlineWidth)} ${styleToken.controlOutline}`
      const errorActiveShadow = `0 0 0 ${toCssUnit(styleToken.controlOutlineWidth)} ${styleToken.colorErrorOutline}`
      const warningActiveShadow = `0 0 0 ${toCssUnit(styleToken.controlOutlineWidth)} ${styleToken.colorWarningOutline}`
      const inputAffixPadding = styleToken.paddingSM
      const hoverBorderColor = styleToken.colorPrimaryHover
      const filledHoverBackground = styleToken.colorFillSecondary

      return {
        [componentCls]: {
          boxSizing: 'border-box',
          display: 'inline-flex',
          alignItems: 'center',
          width: '100%',
          minHeight: styleToken.controlHeight,
          margin: 0,
          paddingInline: 0,
          paddingBlock: 0,
          color: styleToken.colorText,
          fontSize: styleToken.fontSize,
          lineHeight: styleToken.lineHeight,
          background: styleToken.colorBgContainer,
          border: `${toCssUnit(styleToken.lineWidth)} ${styleToken.lineType} transparent`,
          borderRadius: styleToken.borderRadius,
          transition: `all ${styleToken.motionDurationMid}`,

          '&, *': {
            boxSizing: 'border-box',
          },

          [`${componentCls}-body`]: {
            display: 'inline-flex',
            flex: 1,
            alignItems: 'stretch',
            minWidth: 0,
          },

          [`${componentCls}-input`]: {
            flex: 1,
            width: 'auto',
            minWidth: 0,
            alignSelf: 'stretch',
            background: 'transparent',
            border: 0,
            borderRadius: 0,
            boxShadow: 'none',
            outline: 0,

            [`&${inputNumberCls}`]: {
              display: 'inline-flex',
              flex: '1 1 0',
              width: 'auto',
              minWidth: 0,
              height: 'auto',
              alignItems: 'center',
              paddingBlock: 0,
              background: 'transparent',
              border: 0,
              borderRadius: 0,
              boxShadow: 'none',
              outline: 0,
            },

            [`&${inputNumberCls}:hover, &${inputNumberCls}:focus, &${inputNumberCls}:focus-within, &${inputNumberCls}-focused`]:
              {
                background: 'transparent',
                border: 0,
                boxShadow: 'none',
                outline: 0,
              },

            [`&${inputNumberCls}:focus-visible, &${inputNumberCls}:has(input:focus-visible)`]: {
              outline: 'none',
            },

            [`&${inputNumberCls}-disabled`]: {
              background: 'transparent',
              border: 0,
              boxShadow: 'none',
            },

            [`${inputNumberCls}-input-wrap`]: {
              flex: 1,
              minWidth: 0,
            },

            [`${inputNumberCls}-input`]: {
              background: 'transparent',
              border: 0,
              boxShadow: 'none',
              color: styleToken.colorText,
              caretColor: 'currentColor',
              outline: 0,
              textAlign: 'start',

              '&::-moz-placeholder': {
                opacity: 1,
              },

              '&::placeholder': {
                color: styleToken.colorTextPlaceholder,
                userSelect: 'none',
              },

              '&:placeholder-shown': {
                textOverflow: 'ellipsis',
              },
            },

            [`&${inputNumberCls}-disabled ${inputNumberCls}-input`]: {
              color: styleToken.colorTextDisabled,
            },
          },

          [`${componentCls}-separator`]: {
            display: 'inline-flex',
            flex: 'none',
            alignItems: 'center',
            paddingInline: styleToken.paddingXS,
            color: styleToken.colorTextQuaternary,
            lineHeight: 1,
            userSelect: 'none',
          },

          [`${componentCls}-prefix`]: {
            display: 'inline-flex',
            flex: 'none',
            alignItems: 'center',
            paddingInlineStart: inputAffixPadding,
            marginInlineEnd: inputAffixPadding,
            color: styleToken.colorTextQuaternary,
            lineHeight: 1,
          },

          [`${componentCls}-affix`]: {
            display: 'inline-flex',
            flex: 'none',
            alignItems: 'center',
            alignSelf: 'center',
            gap: styleToken.paddingXS,
            paddingInlineEnd: inputAffixPadding,
            marginInlineStart: inputAffixPadding,
            color: styleToken.colorTextQuaternary,
            fontSize: styleToken.fontSizeIcon,
            lineHeight: 1,
          },

          [`${componentCls}-suffix`]: {
            display: 'inline-flex',
            flex: 'none',
            alignItems: 'center',
            color: styleToken.colorTextQuaternary,
            fontSize: styleToken.fontSizeIcon,
            lineHeight: 1,
          },

          [`${componentCls}-clear`]: {
            display: 'inline-flex',
            flex: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: styleToken.fontSizeIcon,
            height: styleToken.fontSizeIcon,
            color: styleToken.colorTextQuaternary,
            fontSize: styleToken.fontSizeIcon,
            fontStyle: 'normal',
            lineHeight: 1,
            textAlign: 'center',
            cursor: 'pointer',
            opacity: 0,
            transition: `color ${styleToken.motionDurationMid} ease, opacity ${styleToken.motionDurationMid} ease`,
            textRendering: 'auto',
            transform: 'translateZ(0)',

            '&:hover': {
              color: styleToken.colorIcon,
            },
          },

          [`&:hover:not(${componentCls}-disabled):not(${componentCls}-readonly)`]: {
            borderColor: hoverBorderColor,

            [`${componentCls}-clear`]: {
              background: styleToken.colorBgBase,
              borderRadius: '50%',
              opacity: 1,
            },
          },

          '@media (hover: none)': {
            [`${componentCls}-clear`]: {
              background: styleToken.colorBgBase,
              borderRadius: '50%',
              opacity: 1,
            },
          },

          [`&${componentCls}-focused`]: {
            borderColor: styleToken.colorPrimary,
            boxShadow: activeShadow,
            outline: 0,
          },

          [`&${componentCls}-outlined, &:has(${componentCls}-input${inputNumberCls}-outlined)`]: {
            background: styleToken.colorBgContainer,
            border,

            [`&:hover:not(${componentCls}-disabled):not(${componentCls}-readonly)`]: {
              borderColor: hoverBorderColor,
            },
          },

          [`&${componentCls}-filled, &:has(${componentCls}-input${inputNumberCls}-filled)`]: {
            background: styleToken.colorFillTertiary,
            border: `${toCssUnit(styleToken.lineWidth)} ${styleToken.lineType} transparent`,

            [`&:hover:not(${componentCls}-disabled):not(${componentCls}-readonly)`]: {
              background: filledHoverBackground,
            },

            [`&${componentCls}-focused`]: {
              background: styleToken.colorBgContainer,
            },
          },

          [`&${componentCls}-borderless, &:has(${componentCls}-input${inputNumberCls}-borderless)`]:
            {
              background: 'transparent',
              border: `${toCssUnit(styleToken.lineWidth)} ${styleToken.lineType} transparent`,
              boxShadow: 'none',

              [`&${componentCls}-focused`]: {
                boxShadow: 'none',
              },
            },

          [`&${componentCls}-underlined, &:has(${componentCls}-input${inputNumberCls}-underlined)`]:
            {
              background: styleToken.colorBgContainer,
              borderInline: 0,
              borderBlockStart: 0,
              borderBlockEnd: border,
              borderRadius: 0,
              boxShadow: 'none',

              [`&:hover:not(${componentCls}-disabled):not(${componentCls}-readonly)`]: {
                borderBlockEndColor: styleToken.colorPrimaryHover,
              },
            },

          [`&${componentCls}-status-error, &:has(${componentCls}-input${inputNumberCls}-status-error)`]:
            {
              '&, &:hover': {
                borderColor: styleToken.colorError,
              },

              [`&${componentCls}-focused`]: {
                borderColor: styleToken.colorError,
                boxShadow: errorActiveShadow,
              },
            },

          [`&${componentCls}-status-warning, &:has(${componentCls}-input${inputNumberCls}-status-warning)`]:
            {
              '&, &:hover': {
                borderColor: styleToken.colorWarning,
              },

              [`&${componentCls}-focused`]: {
                borderColor: styleToken.colorWarning,
                boxShadow: warningActiveShadow,
              },
            },

          [`&${componentCls}-sm`]: {
            minHeight: styleToken.controlHeightSM,
            fontSize: styleToken.fontSizeSM,
            borderRadius: styleToken.borderRadiusSM,
          },

          [`&${componentCls}-lg`]: {
            minHeight: styleToken.controlHeightLG,
            fontSize: styleToken.fontSizeLG,
            lineHeight: styleToken.lineHeightLG,
            borderRadius: styleToken.borderRadiusLG,
          },

          [`&${componentCls}-disabled`]: {
            color: styleToken.colorTextDisabled,
            background: styleToken.colorBgContainerDisabled,
            borderColor: styleToken.colorBorder,
            cursor: 'not-allowed',

            [`${componentCls}-separator`]: {
              color: styleToken.colorTextDisabled,
            },
          },

          [`&${componentCls}-readonly`]: {
            cursor: 'default',
          },
        },
      }
    },
  )

  return [hashId, cssVarCls] as const
}
