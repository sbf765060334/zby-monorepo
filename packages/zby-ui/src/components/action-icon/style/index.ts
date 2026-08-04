import { unit, useStyleRegister } from '@ant-design/cssinjs'
import type { CSSObject } from '@ant-design/cssinjs'
import { ConfigProvider, theme as antdTheme } from 'antd'
import * as React from 'react'

const presetColors = [
  'blue',
  'purple',
  'cyan',
  'green',
  'magenta',
  'pink',
  'red',
  'orange',
  'yellow',
  'volcano',
  'geekblue',
  'lime',
  'gold',
] as const

type GlobalToken = ReturnType<typeof antdTheme.useToken>['token']

type ActionIconToken = GlobalToken & {
  componentCls: string
  actionIconSizeSM: number | string
  actionIconSize: number | string
  actionIconSizeLG: number | string
  actionIconFontSizeSM: number | string
  actionIconFontSize: number | string
  actionIconFontSizeLG: number | string
}

/** 根据公开字号和行高 token 计算正文实际行盒高度。 */
function getTextLineHeight(
  fontSize: number | string,
  lineHeight: number | string,
): number | string {
  if (typeof fontSize === 'number' && typeof lineHeight === 'number') {
    return Math.round(fontSize * lineHeight)
  }

  return `calc(${unit(fontSize)} * ${lineHeight})`
}

/** 在数字 token 和 CSS 变量 token 下统一增加像素尺寸。 */
function addPixelSize(value: number | string, offset: number): number | string {
  if (typeof value === 'number') return value + offset

  const expression = value.startsWith('calc(') ? value.slice(5, -1) : value
  return `calc(${expression} + ${offset}px)`
}

function resetComponent(token: ActionIconToken): CSSObject {
  return {
    boxSizing: 'border-box',
    margin: 0,
    padding: 0,
    color: token.colorText,
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    listStyle: 'none',
    fontFamily: token.fontFamily,
  }
}

function genBaseStyle(token: ActionIconToken): CSSObject {
  const { componentCls } = token

  return {
    [componentCls]: {
      ...resetComponent(token),
      position: 'relative',
      display: 'inline-flex',
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      color: token.colorIcon,
      background: 'transparent',
      border: 'none',
      borderRadius: token.borderRadius,
      cursor: 'pointer',
      appearance: 'none',
      userSelect: 'none',
      touchAction: 'manipulation',
      transition: [
        `color ${token.motionDurationMid} ${token.motionEaseInOut}`,
        `background-color ${token.motionDurationMid} ${token.motionEaseInOut}`,
        `border-color ${token.motionDurationMid} ${token.motionEaseInOut}`,
      ].join(', '),

      '&:not(:disabled)': {
        '&:focus-visible': {
          outline: `${unit(token.lineWidthFocus)} solid ${token.colorPrimaryBorder}`,
          outlineOffset: 1,
        },

        '&:hover': {
          color: token.colorPrimary,
          background: 'transparent',
        },

        '&:active': {
          color: token.colorPrimaryActive,
          background: 'transparent',
        },
      },

      '&:disabled': {
        color: token.colorTextDisabled,
        cursor: 'not-allowed',
      },

      '&-selected': {
        '&:not(:disabled)': {
          color: token.colorPrimary,
          background: token.colorPrimaryBg,

          '&:hover': {
            color: token.colorPrimary,
            background: token.colorPrimaryBgHover,
          },

          '&:active': {
            background: token.colorPrimaryBgHover,
          },
        },
      },

      '&-danger': {
        '&:not(:disabled)': {
          color: token.colorError,

          '&:hover': {
            color: token.colorErrorHover,
            background: 'transparent',
          },

          '&:active': {
            color: token.colorErrorActive,
            background: 'transparent',
          },
        },

        [`&${componentCls}-selected`]: {
          '&:not(:disabled)': {
            color: token.colorError,
            background: token.colorErrorBg,

            '&:hover': {
              color: token.colorError,
              background: token.colorErrorBgHover,
            },

            '&:active': {
              background: token.colorErrorBgHover,
            },
          },
        },
      },

      '&-square': {
        borderRadius: token.borderRadius,
      },

      '&-circle': {
        borderRadius: '50%',
      },

      [`${componentCls}-icon`]: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,

        '> svg': {
          display: 'inline-block',
          lineHeight: 1,
        },
      },
    },
  }
}

function genSizeStyle(token: ActionIconToken): CSSObject {
  const { componentCls } = token

  return {
    [componentCls]: {
      width: token.actionIconSize,
      height: token.actionIconSize,

      [`${componentCls}-icon`]: {
        fontSize: token.actionIconFontSize,
      },
    },

    [`${componentCls}-sm`]: {
      width: token.actionIconSizeSM,
      height: token.actionIconSizeSM,

      [`${componentCls}-icon`]: {
        fontSize: token.actionIconFontSizeSM,
      },
    },

    [`${componentCls}-lg`]: {
      width: token.actionIconSizeLG,
      height: token.actionIconSizeLG,

      [`${componentCls}-icon`]: {
        fontSize: token.actionIconFontSizeLG,
      },
    },
  }
}

function genVariantStyle(token: ActionIconToken): CSSObject {
  const { componentCls } = token
  const colorToken = token as unknown as Record<string, string>

  const genColorStyle = (
    color: string,
    style: {
      color: string
      hoverColor: string
      activeColor: string
      bg: string
      hoverBg: string
      activeBg: string
      solidBg?: string
      solidHoverBg?: string
      solidActiveBg?: string
      solidColor?: string
    },
  ): CSSObject => ({
    [`&${componentCls}-color-${color}`]: {
      color: style.color,

      '&:not(:disabled):hover': {
        color: style.hoverColor,
      },

      '&:not(:disabled):active': {
        color: style.activeColor,
      },

      [`&${componentCls}-variant-filled`]: {
        color: style.color,
        background: style.bg,

        '&:not(:disabled):hover': {
          color: style.hoverColor,
          background: style.hoverBg,
        },

        '&:not(:disabled):active': {
          color: style.activeColor,
          background: style.activeBg,
        },
      },

      [`&${componentCls}-variant-outlined, &${componentCls}-variant-dashed`]: {
        color: style.color,
        background: 'transparent',
        borderColor: style.color,

        '&:not(:disabled):hover': {
          color: style.hoverColor,
          background: style.bg,
          borderColor: style.hoverColor,
        },

        '&:not(:disabled):active': {
          color: style.activeColor,
          background: style.activeBg,
          borderColor: style.activeColor,
        },
      },

      [`&${componentCls}-variant-solid`]: {
        color: style.solidColor ?? token.colorTextLightSolid,
        background: style.solidBg ?? style.color,

        '&:not(:disabled):hover': {
          color: style.solidColor ?? token.colorTextLightSolid,
          background: style.solidHoverBg ?? style.hoverColor,
        },

        '&:not(:disabled):active': {
          color: style.solidColor ?? token.colorTextLightSolid,
          background: style.solidActiveBg ?? style.activeColor,
        },
      },

      [`&${componentCls}-variant-text, &${componentCls}-variant-link, &${componentCls}-variant-inline`]:
        {
          color: style.color,

          '&:not(:disabled):hover': {
            color: style.hoverColor,
            background: color === 'primary' ? style.bg : 'transparent',
          },

          '&:not(:disabled):active': {
            color: style.activeColor,
            background: 'transparent',
          },
        },
    },
  })

  return {
    [componentCls]: [
      {
        [`&${componentCls}-variant-outlined, &${componentCls}-variant-dashed`]: {
          border: `${unit(token.lineWidth)} solid currentColor`,
        },

        [`&${componentCls}-variant-dashed`]: {
          borderStyle: 'dashed',
        },

        [`&${componentCls}-variant-inline`]: {
          width: 'auto',
          height: 'auto',
          minWidth: token.actionIconSizeSM,
          minHeight: token.actionIconSizeSM,
          lineHeight: token.lineHeight,
        },

        [`&${componentCls}-variant-link, &${componentCls}-variant-inline`]: {
          color: token.colorLink,

          '&:not(:disabled):hover': {
            color: token.colorLinkHover,
          },

          '&:not(:disabled):active': {
            color: token.colorLinkActive,
          },
        },

        [`&${componentCls}-variant-text`]: {
          '&:not(:disabled):hover': {
            background: token.colorFillTertiary,
          },

          '&:not(:disabled):active': {
            background: token.colorFillSecondary,
          },
        },
      },

      genColorStyle('default', {
        color: token.colorIcon,
        hoverColor: token.colorIconHover,
        activeColor: token.colorText,
        bg: token.colorFillTertiary,
        hoverBg: token.colorFillSecondary,
        activeBg: token.colorFill,
        solidBg: token.colorBgSolid,
        solidHoverBg: token.colorBgSolidHover,
        solidActiveBg: token.colorBgSolidActive,
        solidColor: token.colorTextLightSolid,
      }),

      genColorStyle('primary', {
        color: token.colorPrimary,
        hoverColor: token.colorPrimaryHover,
        activeColor: token.colorPrimaryActive,
        bg: token.colorPrimaryBg,
        hoverBg: token.colorPrimaryBgHover,
        activeBg: token.colorPrimaryBorder,
      }),

      genColorStyle('dangerous', {
        color: token.colorError,
        hoverColor: token.colorErrorHover,
        activeColor: token.colorErrorActive,
        bg: token.colorErrorBg,
        hoverBg: token.colorErrorBgHover,
        activeBg: token.colorErrorBgActive,
      }),

      presetColors.map((color) =>
        genColorStyle(color, {
          color: colorToken[`${color}6`],
          hoverColor: colorToken[`${color}Hover`],
          activeColor: colorToken[`${color}Active`],
          bg: colorToken[`${color}1`],
          hoverBg: colorToken[`${color}2`],
          activeBg: colorToken[`${color}3`],
        }),
      ),

      {
        '&&:disabled': {
          color: token.colorTextDisabled,
          background: 'transparent',
          borderColor: 'currentColor',
        },
      },
    ],
  }
}

export default function useStyle(prefixCls: string) {
  const { theme, token, hashId, cssVar } = antdTheme.useToken()
  const { theme: themeConfig } = React.useContext(ConfigProvider.ConfigContext)
  const styleToken = cssVar ?? token
  const cssVarKey =
    typeof themeConfig?.cssVar === 'object' ? themeConfig.cssVar.key : undefined
  const cssVarCls = cssVarKey ?? 'css-var-root'
  // small 与默认正文行高一致；其余两档各增加 4px，适合文本内联和紧凑操作区。
  const actionIconSizeSM = getTextLineHeight(styleToken.fontSize, styleToken.lineHeight)
  const mergedToken: ActionIconToken = {
    ...styleToken,
    componentCls: `.${prefixCls}`,
    actionIconSizeSM,
    actionIconSize: addPixelSize(actionIconSizeSM, 4),
    actionIconSizeLG: addPixelSize(actionIconSizeSM, 8),
    actionIconFontSizeSM: unit(styleToken.fontSize),
    actionIconFontSize: unit(styleToken.fontSize),
    actionIconFontSizeLG: unit(styleToken.fontSizeLG),
  }

  useStyleRegister(
    {
      theme,
      token,
      hashId,
      path: ['zby-ui', 'action-icon', prefixCls],
    },
    () => [genBaseStyle(mergedToken), genSizeStyle(mergedToken), genVariantStyle(mergedToken)],
  )

  return [hashId, cssVarCls] as const
}
