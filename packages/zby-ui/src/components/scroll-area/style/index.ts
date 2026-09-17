import { unit, useStyleRegister } from '@ant-design/cssinjs'
import type { CSSObject } from '@ant-design/cssinjs'
import { ConfigProvider, theme as antdTheme } from 'antd'
import type { CSSProperties } from 'react'
import * as React from 'react'

export interface ScrollAreaComponentToken {
  /**
   * @descCN 滚动条轨道尺寸
   * @descEN Size of scrollbar track
   */
  trackSize?: number
  /**
   * @descCN 滚动条滑块背景色
   * @descEN Background of scrollbar thumb
   */
  thumbBg?: string
  /**
   * @descCN 滚动条滑块悬浮背景色
   * @descEN Background of scrollbar thumb on hover
   */
  thumbHoverBg?: string
  /**
   * @descCN 滚动条层级
   * @descEN z-index of scrollbar
   */
  zIndex?: number
}

declare module 'antd/es/theme/interface/components' {
  interface ComponentTokenMap {
    ScrollArea?: ScrollAreaComponentToken
  }
}

type GlobalToken = ReturnType<typeof antdTheme.useToken>['token']

type ScrollAreaToken = GlobalToken & {
  componentCls: string
  scrollAreaTrackSize: string
  scrollAreaThumbBg: string
  scrollAreaThumbHoverBg: string
  scrollAreaZIndex: string
}

function incrementCSSValue(value: number | string) {
  return typeof value === 'number' ? value + 1 : `calc(${value} + 1)`
}

function getCssVarPrefix(
  themeConfig: { cssVar?: boolean | { prefix?: string; key?: string } } | undefined,
  getPrefixCls: (suffixCls?: string, customizePrefixCls?: string) => string,
) {
  const cssVarConfig = typeof themeConfig?.cssVar === 'object' ? themeConfig.cssVar : undefined
  return cssVarConfig?.prefix ?? getPrefixCls()
}

function getComponentCssVarName(cssVarPrefix: string, tokenName: string) {
  return `--${cssVarPrefix}-scroll-area-${tokenName}`
}

function resetComponent(token: GlobalToken): CSSObject {
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

const genBaseStyle = (token: ScrollAreaToken): CSSObject => {
  const { componentCls } = token
  const trackSize = unit(token.scrollAreaTrackSize)
  const trackInset = unit(token.paddingXXS)
  const trackOuterInset = 2
  const thumbHitTargetSize = `calc(${trackSize} + 4px)`

  return {
    [componentCls]: {
      ...resetComponent(token),
      position: 'relative',
      display: 'block',
      overflow: 'hidden',

      [`> ${componentCls}-viewport`]: {
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%',
        boxSizing: 'border-box',
        WebkitOverflowScrolling: 'touch',
      },

      [`&:not(${componentCls}-native) > ${componentCls}-viewport`]: {
        scrollbarWidth: 'none',
        ['-ms-overflow-style' as const]: 'none',

        '&::-webkit-scrollbar': {
          display: 'none',
          width: 0,
          height: 0,
        },
      },

      [`> ${componentCls}-viewport > ${componentCls}-content, > ${componentCls}-viewport > div > ${componentCls}-content`]:
      {
        minWidth: '100%',
        minHeight: '100%',
        boxSizing: 'border-box',
      },

      [`> ${componentCls}-track`]: {
        position: 'absolute',
        zIndex: token.scrollAreaZIndex,
        display: 'flex',
        borderRadius: token.borderRadiusSM,
        background: 'transparent',
        opacity: 0,
        pointerEvents: 'none',
        touchAction: 'none',
        userSelect: 'none',
        transition: `opacity ${token.motionDurationMid} ${token.motionEaseInOut}`,

        '&[data-state="visible"]': {
          opacity: 1,
          pointerEvents: 'auto',
        },

        '&[data-state="hidden"]': {
          opacity: 0,
          pointerEvents: 'none',
        },
      },

      [`> ${componentCls}-track > ${componentCls}-thumb`]: {
        position: 'relative',
        flex: 1,
        borderRadius: token.borderRadiusLG,
        background: token.scrollAreaThumbBg,
        cursor: 'pointer',
        transition: `background ${token.motionDurationMid} ${token.motionEaseInOut}`,

        '&::before': {
          position: 'absolute',
          top: '50%',
          left: '50%',
          content: `''`,
          transform: 'translate(-50%, -50%)',
        },

        '&:hover': {
          background: token.scrollAreaThumbHoverBg,
        },
      },

      [`> ${componentCls}-track-horizontal`]: {
        flexDirection: 'column',
        height: trackSize,
        marginInline: trackInset,
        marginBlockEnd: trackOuterInset,

        [`> ${componentCls}-thumb`]: {
          height: '100%',

          '&::before': {
            width: '100%',
            height: thumbHitTargetSize,
          },
        },
      },

      [`> ${componentCls}-track-vertical`]: {
        width: trackSize,
        marginBlock: trackInset,
        marginInlineEnd: trackOuterInset,

        [`> ${componentCls}-thumb`]: {
          width: '100%',

          '&::before': {
            width: thumbHitTargetSize,
            height: '100%',
          },
        },
      },

      [`> ${componentCls}-corner`]: {
        background: 'transparent',
      },

      [`> ${componentCls}-track:empty`]: {
        visibility: 'hidden',
        opacity: 0,
        pointerEvents: 'none',
      },
    },
  }
}

export default function useStyle(prefixCls: string) {
  const { theme, token, hashId, cssVar } = antdTheme.useToken()
  const { getPrefixCls, theme: themeConfig } = React.useContext(ConfigProvider.ConfigContext)
  const styleToken = cssVar ?? token
  const cssVarPrefix = getCssVarPrefix(themeConfig, getPrefixCls)
  const cssVarKey =
    typeof themeConfig?.cssVar === 'object' ? themeConfig.cssVar.key : undefined
  const cssVarCls = cssVarKey ?? 'css-var-root'
  const componentToken = token.ScrollArea
  const trackSizeVar = getComponentCssVarName(cssVarPrefix, 'track-size')
  const thumbBgVar = getComponentCssVarName(cssVarPrefix, 'thumb-bg')
  const thumbHoverBgVar = getComponentCssVarName(cssVarPrefix, 'thumb-hover-bg')
  const zIndexVar = getComponentCssVarName(cssVarPrefix, 'z-index')
  const componentCSSVariables: CSSProperties = {
    [trackSizeVar]: unit(componentToken?.trackSize ?? 8),
    [thumbBgVar]: componentToken?.thumbBg ?? styleToken.colorTextQuaternary,
    [thumbHoverBgVar]: componentToken?.thumbHoverBg ?? styleToken.colorTextTertiary,
    [zIndexVar]: componentToken?.zIndex ?? incrementCSSValue(styleToken.zIndexBase),
  }
  const mergedToken: ScrollAreaToken = {
    ...styleToken,
    componentCls: `.${prefixCls}`,
    scrollAreaTrackSize: `var(${trackSizeVar})`,
    scrollAreaThumbBg: `var(${thumbBgVar})`,
    scrollAreaThumbHoverBg: `var(${thumbHoverBgVar})`,
    scrollAreaZIndex: `var(${zIndexVar})`,
  }

  useStyleRegister(
    {
      theme,
      token,
      hashId,
      path: ['zby-ui', 'scroll-area', prefixCls, cssVarPrefix],
    },
    () => genBaseStyle(mergedToken),
  )

  return [hashId, cssVarCls, componentCSSVariables] as const
}
