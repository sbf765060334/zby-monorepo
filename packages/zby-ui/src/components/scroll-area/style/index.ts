import { unit, useStyleRegister } from '@ant-design/cssinjs'
import type { CSSObject } from '@ant-design/cssinjs'
import { theme as antdTheme } from 'antd'
import type { CSSProperties } from 'react'

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

const scrollAreaTrackSizeVar = '--zby-scroll-area-track-size'
const scrollAreaThumbBgVar = '--zby-scroll-area-thumb-bg'
const scrollAreaThumbHoverBgVar = '--zby-scroll-area-thumb-hover-bg'
const scrollAreaZIndexVar = '--zby-scroll-area-z-index'

type ScrollAreaCSSVariableStyle = CSSProperties & {
  [scrollAreaTrackSizeVar]: string | number
  [scrollAreaThumbBgVar]: string
  [scrollAreaThumbHoverBgVar]: string
  [scrollAreaZIndexVar]: string | number
}

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
        opacity: 0,
        pointerEvents: 'none',
        touchAction: 'none',
        userSelect: 'none',
        transition: `opacity ${token.motionDurationMid} ${token.motionEaseInOut}`,
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
        marginBlockEnd: trackInset,

        [`> ${componentCls}-thumb`]: {
          height: '100%',

          '&::before': {
            width: '100%',
            height: 'calc(100% + 8px)',
          },
        },
      },

      [`> ${componentCls}-track-vertical`]: {
        width: trackSize,
        marginBlock: trackInset,
        marginInlineEnd: trackInset,

        [`> ${componentCls}-thumb`]: {
          width: '100%',

          '&::before': {
            width: 'calc(100% + 8px)',
            height: '100%',
          },
        },
      },

      [`> ${componentCls}-corner`]: {
        background: 'transparent',
      },

      [`&${componentCls}-scrollbar-always > ${componentCls}-track, &${componentCls}-scrollbar-hover:hover > ${componentCls}-track, &${componentCls}-scrolling > ${componentCls}-track, &${componentCls}-dragging > ${componentCls}-track`]:
        {
          opacity: 1,
          pointerEvents: 'auto',
        },

      [`> ${componentCls}-track:not(:has(> ${componentCls}-thumb))`]: {
        visibility: 'hidden',
        opacity: 0,
        pointerEvents: 'none',
      },

      [`&${componentCls}-scrollbar-none > ${componentCls}-track, &${componentCls}-scrollbar-none > ${componentCls}-corner`]:
        {
          display: 'none',
        },

      [`&${componentCls}-vertical > ${componentCls}-viewport`]: {
        overflowX: 'hidden',
        overflowY: 'auto',
      },

      [`&${componentCls}-horizontal > ${componentCls}-viewport`]: {
        overflowX: 'auto',
        overflowY: 'hidden',
      },

      [`&${componentCls}-both > ${componentCls}-viewport`]: {
        overflow: 'auto',
      },
    },
  }
}

export default function useStyle(prefixCls: string) {
  const { theme, token, hashId, cssVar } = antdTheme.useToken()
  const styleToken = cssVar ?? token
  const componentToken = token.ScrollArea
  const componentCSSVariables: ScrollAreaCSSVariableStyle = {
    [scrollAreaTrackSizeVar]: unit(componentToken?.trackSize ?? styleToken.sizeXS),
    [scrollAreaThumbBgVar]: componentToken?.thumbBg ?? styleToken.colorTextQuaternary,
    [scrollAreaThumbHoverBgVar]: componentToken?.thumbHoverBg ?? styleToken.colorTextTertiary,
    [scrollAreaZIndexVar]: componentToken?.zIndex ?? incrementCSSValue(styleToken.zIndexBase),
  }
  const mergedToken: ScrollAreaToken = {
    ...styleToken,
    componentCls: `.${prefixCls}`,
    scrollAreaTrackSize: `var(${scrollAreaTrackSizeVar})`,
    scrollAreaThumbBg: `var(${scrollAreaThumbBgVar})`,
    scrollAreaThumbHoverBg: `var(${scrollAreaThumbHoverBgVar})`,
    scrollAreaZIndex: `var(${scrollAreaZIndexVar})`,
  }

  useStyleRegister(
    {
      theme,
      token,
      hashId,
      path: ['zby-ui', 'scroll-area', prefixCls],
    },
    () => genBaseStyle(mergedToken),
  )

  return [hashId, componentCSSVariables] as const
}
